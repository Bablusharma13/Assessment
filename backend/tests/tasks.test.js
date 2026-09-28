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
let aliceProject;
let bobProject;

function asUser(user, method, url) {
  return request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
}

async function createProjectAs(user, name) {
  const response = await asUser(user, 'post', '/api/projects').send({ name });
  return response.body.data;
}

async function createTaskAs(user, projectId, body = { title: 'Write tests' }) {
  const response = await asUser(user, 'post', `/api/projects/${projectId}/tasks`).send(body);
  return response.body.data;
}

before(async () => {
  await connectDatabase();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Project.deleteMany({}), Task.deleteMany({})]);
  alice = await createUser('Alice', 'alice@example.com');
  bob = await createUser('Bob', 'bob@example.com');
  aliceProject = await createProjectAs(alice, 'Alice project');
  bobProject = await createProjectAs(bob, 'Bob project');
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('authentication', () => {
  const someId = new mongoose.Types.ObjectId().toString();
  const endpoints = [
    ['get', `/api/projects/${someId}/tasks`],
    ['post', `/api/projects/${someId}/tasks`],
    ['put', `/api/tasks/${someId}`],
    ['delete', `/api/tasks/${someId}`],
  ];

  for (const [method, url] of endpoints) {
    test(`${method.toUpperCase()} ${url} without a token returns 401`, async () => {
      const response = await request(app)[method](url);

      assert.equal(response.status, 401);
    });

    test(`${method.toUpperCase()} ${url} with an invalid JWT returns 401`, async () => {
      const response = await request(app)[method](url).set('Authorization', 'Bearer bad.token');

      assert.equal(response.status, 401);
    });
  }
});

describe('POST /api/projects/:projectId/tasks', () => {
  test('creates a task with status "Todo" by default', async () => {
    const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send({
      title: '  Design homepage  ',
      description: '  Hero section  ',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.title, 'Design homepage');
    assert.equal(response.body.data.description, 'Hero section');
    assert.equal(response.body.data.status, 'Todo');
    assert.equal(response.body.data.projectId, aliceProject._id);
    assert.equal(response.body.data.userId, alice.id);
  });

  test('accepts a valid initial status', async () => {
    const task = await createTaskAs(alice, aliceProject._id, {
      title: 'Started',
      status: 'In Progress',
    });

    assert.equal(task.status, 'In Progress');
  });

  test('ignores userId and projectId sent in the body', async () => {
    const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send({
      title: 'Sneaky',
      userId: bob.id,
      projectId: bobProject._id,
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.data.userId, alice.id);
    assert.equal(response.body.data.projectId, aliceProject._id);
  });

  test('rejects a missing, blank or oversized title with 400', async () => {
    const invalidBodies = [{}, { title: '' }, { title: '    ' }, { title: 'a'.repeat(101) }];

    for (const body of invalidBodies) {
      const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send(
        body
      );
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].field, 'title');
    }
  });

  test('accepts a 100-character title', async () => {
    const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send({
      title: 'a'.repeat(100),
    });

    assert.equal(response.status, 201);
  });

  test('rejects a description longer than 500 characters', async () => {
    const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send({
      title: 'Long description',
      description: 'a'.repeat(501),
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.errors[0].field, 'description');
  });

  test('rejects an invalid status with 400', async () => {
    for (const status of ['Finished', 'todo', '', ['Todo'], { $ne: null }]) {
      const response = await asUser(alice, 'post', `/api/projects/${aliceProject._id}/tasks`).send({
        title: 'Bad status',
        status,
      });

      assert.equal(response.status, 400);
      assert.deepEqual(response.body.errors, [
        { field: 'status', message: 'Status must be one of: Todo, In Progress, Done' },
      ]);
    }
  });

  test("adding a task to another user's project returns 403", async () => {
    const response = await asUser(alice, 'post', `/api/projects/${bobProject._id}/tasks`).send({
      title: 'Intruder',
    });

    assert.equal(response.status, 403);
    assert.equal(await Task.countDocuments({ projectId: bobProject._id }), 0);
  });

  test('a project that does not exist returns 404', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const response = await asUser(alice, 'post', `/api/projects/${missingId}/tasks`).send({
      title: 'Orphan',
    });

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { success: false, message: 'Project not found' });
  });

  test('an invalid project id returns 400', async () => {
    const response = await asUser(alice, 'post', '/api/projects/not-an-id/tasks').send({
      title: 'x',
    });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body.errors, [{ field: 'projectId', message: 'Invalid project id' }]);
  });
});

describe('GET /api/projects/:projectId/tasks', () => {
  test('lists the tasks of the project, newest first', async () => {
    await createTaskAs(alice, aliceProject._id, { title: 'First' });
    await pause();
    await createTaskAs(alice, aliceProject._id, { title: 'Second' });
    await createTaskAs(bob, bobProject._id, { title: 'Bob task' });

    const response = await asUser(alice, 'get', `/api/projects/${aliceProject._id}/tasks`);

    assert.equal(response.status, 200);
    assert.deepEqual(
      response.body.data.map((task) => task.title),
      ['Second', 'First']
    );
  });

  test('returns an empty list for a project without tasks', async () => {
    const response = await asUser(alice, 'get', `/api/projects/${aliceProject._id}/tasks`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { success: true, data: [] });
  });

  test("listing another user's project tasks returns 403", async () => {
    await createTaskAs(bob, bobProject._id, { title: 'Secret' });

    const response = await asUser(alice, 'get', `/api/projects/${bobProject._id}/tasks`);

    assert.equal(response.status, 403);
    assert.equal(response.body.data, undefined);
  });

  test('a missing project returns 404 and an invalid id returns 400', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const missingResponse = await asUser(alice, 'get', `/api/projects/${missingId}/tasks`);
    const invalidResponse = await asUser(alice, 'get', '/api/projects/xyz/tasks');

    assert.equal(missingResponse.status, 404);
    assert.equal(invalidResponse.status, 400);
  });
});

describe('PUT /api/tasks/:id', () => {
  test('changes the status Todo → In Progress → Done', async () => {
    const task = await createTaskAs(alice, aliceProject._id);

    for (const status of ['In Progress', 'Done']) {
      const response = await asUser(alice, 'put', `/api/tasks/${task._id}`).send({ status });

      assert.equal(response.status, 200);
      assert.equal(response.body.data.status, status);
    }
  });

  test('edits the title and description without touching the status', async () => {
    const task = await createTaskAs(alice, aliceProject._id, { title: 'Old', status: 'Done' });
    const response = await asUser(alice, 'put', `/api/tasks/${task._id}`).send({
      title: '  New title  ',
      description: 'Details',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.data.title, 'New title');
    assert.equal(response.body.data.description, 'Details');
    assert.equal(response.body.data.status, 'Done');
  });

  test('rejects an invalid status, a blank title and oversized fields', async () => {
    const task = await createTaskAs(alice, aliceProject._id);
    const invalidBodies = [
      { status: 'Finished' },
      { title: '   ' },
      { title: 'a'.repeat(101) },
      { description: 'a'.repeat(501) },
    ];

    for (const body of invalidBodies) {
      const response = await asUser(alice, 'put', `/api/tasks/${task._id}`).send(body);
      assert.equal(response.status, 400);
      assert.equal(response.body.message, 'Validation failed');
    }

    const savedTask = await Task.findById(task._id);
    assert.equal(savedTask.status, 'Todo');
    assert.equal(savedTask.title, 'Write tests');
  });

  test('cannot move a task to another project or change its owner', async () => {
    const otherProject = await createProjectAs(alice, 'Another Alice project');
    const task = await createTaskAs(alice, aliceProject._id);

    const response = await asUser(alice, 'put', `/api/tasks/${task._id}`).send({
      title: 'Renamed',
      projectId: otherProject._id,
      userId: bob.id,
      createdAt: '2000-01-01T00:00:00.000Z',
    });

    const savedTask = await Task.findById(task._id);
    assert.equal(response.status, 200);
    assert.equal(savedTask.title, 'Renamed');
    assert.equal(savedTask.projectId.toString(), aliceProject._id);
    assert.equal(savedTask.userId.toString(), alice.id);
    assert.equal(savedTask.createdAt.toISOString(), task.createdAt);
  });

  test("updating another user's task returns 403 and changes nothing", async () => {
    const bobTask = await createTaskAs(bob, bobProject._id, { title: 'Bob task' });
    const response = await asUser(alice, 'put', `/api/tasks/${bobTask._id}`).send({
      status: 'Done',
    });

    const savedTask = await Task.findById(bobTask._id);
    assert.equal(response.status, 403);
    assert.deepEqual(response.body, {
      success: false,
      message: 'You do not have access to this task',
    });
    assert.equal(savedTask.status, 'Todo');
  });

  test('a missing task returns 404 and an invalid id returns 400', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const missingResponse = await asUser(alice, 'put', `/api/tasks/${missingId}`).send({
      status: 'Done',
    });
    const invalidResponse = await asUser(alice, 'put', '/api/tasks/123').send({ status: 'Done' });

    assert.equal(missingResponse.status, 404);
    assert.deepEqual(missingResponse.body, { success: false, message: 'Task not found' });
    assert.equal(invalidResponse.status, 400);
    assert.deepEqual(invalidResponse.body.errors, [{ field: 'id', message: 'Invalid task id' }]);
  });
});

describe('DELETE /api/tasks/:id', () => {
  test('deletes the own task', async () => {
    const task = await createTaskAs(alice, aliceProject._id);
    const response = await asUser(alice, 'delete', `/api/tasks/${task._id}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      success: true,
      data: { message: 'Task deleted successfully' },
    });
    assert.equal(await Task.findById(task._id), null);
  });

  test("deleting another user's task returns 403 and keeps it", async () => {
    const bobTask = await createTaskAs(bob, bobProject._id);
    const response = await asUser(alice, 'delete', `/api/tasks/${bobTask._id}`);

    assert.equal(response.status, 403);
    assert.notEqual(await Task.findById(bobTask._id), null);
  });

  test('a missing task returns 404 and an invalid id returns 400', async () => {
    const missingId = new mongoose.Types.ObjectId();
    const missingResponse = await asUser(alice, 'delete', `/api/tasks/${missingId}`);
    const invalidResponse = await asUser(alice, 'delete', '/api/tasks/abc');

    assert.equal(missingResponse.status, 404);
    assert.equal(invalidResponse.status, 400);
  });
});
