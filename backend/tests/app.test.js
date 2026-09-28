import './setup.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// These tests do not need a database connection.

test('GET /api/health returns 200', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { success: true, data: { status: 'ok' } });
});

test('unknown route returns 404 JSON', async () => {
  const response = await request(app).get('/api/does-not-exist');

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { success: false, message: 'Route not found' });
});

test('invalid JSON body returns 400 JSON', async () => {
  const response = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json')
    .send('{"name": ');

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(response.body.message, 'Request body contains invalid JSON');
});

test('unreadable request body returns 400, not 500', async () => {
  const response = await request(app)
    .post('/api/health')
    .set('Content-Type', 'application/json; charset=latin1')
    .send('{}');

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { success: false, message: 'Invalid request' });
});

test('a document deleted during an update returns 404 without leaking the query', async () => {
  // save() throws this when the document was deleted after it was loaded (e.g. in another tab).
  const raceApp = express();
  raceApp.put('/race', () => {
    throw new mongoose.Error.DocumentNotFoundError({ _id: 'secret-filter' }, 'Project', 0, {});
  });
  raceApp.use(errorHandler);

  const response = await request(raceApp).put('/race');

  assert.equal(response.status, 404);
  assert.deepEqual(response.body, { success: false, message: 'This item no longer exists' });
});
