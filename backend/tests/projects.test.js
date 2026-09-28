import './setup.js';
import { describe, test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import Project from '../src/models/Project.js';
import Task from '../src/models/Task.js';
import { connectDatabase } from '../src/config/db.js';
import { createUser, pause } from './helpers.js';

// Needs a running MongoDB (see tests/setup.js for the test database URL).

let alice;
let bob;

function asUser(user, method, url) {
  return request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
}

async function createProjectAs(user, body = { name: 'Website', description: 'Company site' }) {
  const response = await asUser(user, 'post', '/api/projects').send(body);
  return response.body.data;
}

before(async () => {
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({})]);
  alice = await createUser('Alice', 'alice@example.com');
  bob = await createUser('Bob', 'bob@example.com');
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('authentication', () => {
  const someId = new mongoose.Types.ObjectId().toString();
  const endpoints = [
    ['get', '/api/projects'],
    ['post', '/api/projects'],
    ['get', `/api/projects/${someId}`],
    ['put', `/api/projects/${someId}`],
    ['delete', `/api/projects/${someId}`],
  ];

  for (const [method, url] of endpoints) {
    test(`${method.toUpperCase()} ${url} without a token returns 401`, async () => {
      const response = await request(app)[method](url);

      assert.equal(response.status, 401);
      assert.equal(response.body.success, false);
    });
  }

  test('an invalid JWT returns 401', async () => {
    const response = await request(app)
      .get('/api/projects')
      .set('Authorization', 'Bearer invalid.token.value');

    assert.equal(response.status, 401);
  });
});

describe('POST /api/projects', () => {
  test('creates a project owned by the logged-in user', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({
      name: '  Website  ',
      description: '  Company site  ',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.name, 'Website');
    assert.equal(response.body.data.description, 'Company site');
    assert.equal(response.body.data.userId, alice.id);
  });

  test('description is optional', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({ name: 'No description' });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.description, '');
  });

  test('ignores a userId sent in the body (always uses the JWT user)', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({
      name: 'Sneaky',
      userId: bob.id,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.userId, alice.id);
  });

  test('ignores mass-assignment of _id, createdAt and updatedAt', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const response = await asUser(alice, 'post', '/api/projects').send({
      name: 'Mass assignment',
      _id: fakeId,
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
    });

    assert.equal(response.status, 201);
    assert.notEqual(response.body.data._id, fakeId);
    assert.notEqual(response.body.data.createdAt, '2000-01-01T00:00:00.000Z');
    assert.notEqual(response.body.data.updatedAt, '2000-01-01T00:00:00.000Z');
  });

  test('rejects a missing name with 400', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({ description: 'x' });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, [
      { field: 'name', message: 'Project name is required' },
    ]);
  });

  test('rejects an empty or whitespace-only name with 400', async () => {
    for (const name of ['', '     ']) {
      const response = await asUser(alice, 'post', '/api/projects').send({ name });

      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].message, 'Project name is required');
    }
  });

  test('rejects a non-text name with 400', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({ name: { $ne: null } });

    assert.equal(response.status, 400);
  });

  test('accepts a 100-character name but rejects 101 characters', async () => {
    const okResponse = await asUser(alice, 'post', '/api/projects').send({ name: 'a'.repeat(100) });
    const tooLongResponse = await asUser(alice, 'post', '/api/projects').send({
      name: 'a'.repeat(101),
    });

    assert.equal(okResponse.status, 201);
    assert.equal(tooLongResponse.status, 400);
    assert.equal(
      tooLongResponse.body.errors[0].message,
      'Project name must be at most 100 characters'
    );
  });

  test('rejects a description longer than 500 characters', async () => {
    const response = await asUser(alice, 'post', '/api/projects').send({
      name: 'Long description',
      description: 'a'.repeat(501),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, [
      { field: 'description', message: 'Description must be at most 500 characters' },
    ]);
  });
});

describe('GET /api/projects', () => {
  test('returns an empty list when the user has no projects', async () => {
    const response = await asUser(alice, 'get', '/api/projects');

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, data: [] });
  });

  test("returns only the user's own projects, newest first", async () => {
    await createProjectAs(alice, { name: 'Alice first' });
    await pause();
    await createProjectAs(alice, { name: 'Alice second' });
    await createProjectAs(bob, { name: 'Bob project' });

    const response = await asUser(alice, 'get', '/api/projects');

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((project) => project.name),
      ['Alice second', 'Alice first']
    );
  });
});

describe('GET /api/projects/:id', () => {
  test('returns the own project', async () => {
    const project = await createProjectAs(alice);
    const response = await asUser(alice, 'get', `/api/projects/${project._id}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data._id, project._id);
  });

  test("another user's project returns 403", async () => {
    const bobProject = await createProjectAs(bob);
    const response = await asUser(alice, 'get', `/api/projects/${bobProject._id}`);

    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      success: false,
      message: 'You do not have access to this project',
    });
  });

  test('a project that does not exist returns 404', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const response = await asUser(alice, 'get', `/api/projects/${missingId}`);

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { success: false, message: 'Project not found' });
  });

  test('an invalid ObjectId returns 400', async () => {
    const response = await asUser(alice, 'get', '/api/projects/not-a-valid-id');

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, [{ field: 'id', message: 'Invalid project id' }]);
  });
});

describe('PUT /api/projects/:id', () => {
  test('updates only the fields that are sent', async () => {
    const project = await createProjectAs(alice, { name: 'Old name', description: 'Keep me' });
    const response = await asUser(alice, 'put', `/api/projects/${project._id}`).send({
      name: '  New name  ',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.name, 'New name');
    assert.equal(response.body.data.description, 'Keep me');
  });

  test('can clear the description', async () => {
    const project = await createProjectAs(alice);
    const response = await asUser(alice, 'put', `/api/projects/${project._id}`).send({
      description: '',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.description, '');
  });

  test('rejects an empty name, an oversized name and an oversized description', async () => {
    const project = await createProjectAs(alice);
    const invalidBodies = [
      { name: '   ' },
      { name: 'a'.repeat(101) },
      { description: 'a'.repeat(501) },
    ];

    for (const body of invalidBodies) {
      const response = await asUser(alice, 'put', `/api/projects/${project._id}`).send(body);
      assert.equal(response.status, 400);
      assert.equal(response.body.message, 'Validation failed');
    }
  });

  test('ignores attempts to change userId, _id, createdAt and updatedAt', async () => {
    const project = await createProjectAs(alice);
    const response = await asUser(alice, 'put', `/api/projects/${project._id}`).send({
      name: 'Renamed',
      userId: bob.id,
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: '2000-01-01T00:00:00.000Z',
      updatedAt: '2000-01-01T00:00:00.000Z',
    });

    const savedProject = await Project.findById(project._id);
    assert.equal(response.status, 200);
    assert.equal(savedProject.name, 'Renamed');
    assert.equal(savedProject.userId.toString(), alice.id);
    assert.equal(savedProject.createdAt.toISOString(), project.createdAt);
    assert.notEqual(savedProject.updatedAt.toISOString(), '2000-01-01T00:00:00.000Z');
  });

  test("updating another user's project returns 403 and changes nothing", async () => {
    const bobProject = await createProjectAs(bob, { name: 'Bob project' });
    const response = await asUser(alice, 'put', `/api/projects/${bobProject._id}`).send({
      name: 'Hacked',
    });

    const savedProject = await Project.findById(bobProject._id);
    assert.equal(response.status, 403);
    assert.equal(savedProject.name, 'Bob project');
  });

  test('a missing project returns 404 and an invalid id returns 400', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const missingResponse = await asUser(alice, 'put', `/api/projects/${missingId}`).send({
      name: 'x',
    });
    const invalidResponse = await asUser(alice, 'put', '/api/projects/123').send({ name: 'x' });

    assert.equal(missingResponse.status, 404);
    assert.equal(invalidResponse.status, 400);
  });
});

describe('DELETE /api/projects/:id', () => {
  test('deletes the own project and all of its tasks', async () => {
    const project = await createProjectAs(alice);
    const otherProject = await createProjectAs(alice, { name: 'Other' });
    await Task.create([
      { title: 'Task 1', projectId: project._id, userId: alice.id },
      { title: 'Task 2', projectId: project._id, userId: alice.id },
      { title: 'Keep me', projectId: otherProject._id, userId: alice.id },
    ]);

    const response = await asUser(alice, 'delete', `/api/projects/${project._id}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      data: { message: 'Project deleted successfully' },
    });
    assert.equal(await Project.findById(project._id), null);
    assert.equal(await Task.countDocuments({ projectId: project._id }), 0);
    assert.equal(await Task.countDocuments({ projectId: otherProject._id }), 1);
  });

  test("deleting another user's project returns 403 and keeps it", async () => {
    const bobProject = await createProjectAs(bob);
    await Task.create({ title: 'Bob task', projectId: bobProject._id, userId: bob.id });

    const response = await asUser(alice, 'delete', `/api/projects/${bobProject._id}`);

    assert.equal(response.status, 403);
    assert.notEqual(await Project.findById(bobProject._id), null);
    assert.equal(await Task.countDocuments({ projectId: bobProject._id }), 1);
  });

  test('deleting twice returns 404 the second time', async () => {
    const project = await createProjectAs(alice);
    await asUser(alice, 'delete', `/api/projects/${project._id}`);

    const response = await asUser(alice, 'delete', `/api/projects/${project._id}`);

    assert.equal(response.status, 404);
  });

  test('an invalid ObjectId returns 400', async () => {
    const response = await asUser(alice, 'delete', '/api/projects/not-a-valid-id');

    assert.equal(response.status, 400);
  });
});
