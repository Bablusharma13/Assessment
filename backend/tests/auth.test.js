import './setup.js';
import { describe, test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { connectDatabase } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { authenticate } from '../src/middleware/authenticate.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

// Needs a running MongoDB (see tests/setup.js for the test database URL).

const validUser = { name: 'Asha Verma', email: 'asha@example.com', password: 'secret123' };

function registerUser(user = validUser) {
  return request(app).post('/api/auth/register').send(user);
}

before(async () => {
  await connectDatabase();
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('POST /api/auth/register', () => {
  test('registers a user and returns a token and safe user fields', async () => {
    const response = await registerUser({
      ...validUser,
      name: '  Asha Verma  ',
      email: ' ASHA@Example.com ',
    });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(typeof response.body.data.token, 'string');
    assert.deepEqual(Object.keys(response.body.data.user).sort(), ['email', 'id', 'name']);
    assert.equal(response.body.data.user.name, 'Asha Verma');
    assert.equal(response.body.data.user.email, 'asha@example.com');
  });

  test('stores only a bcrypt hash, never the plain password', async () => {
    await registerUser();

    const savedUser = await User.findOne({ email: validUser.email }).select('+password');
    assert.notEqual(savedUser.password, validUser.password);
    assert.equal(await bcrypt.compare(validUser.password, savedUser.password), true);
  });

  test('rejects a duplicate email with 400', async () => {
    await registerUser();
    const response = await registerUser({ ...validUser, email: 'ASHA@example.com' });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      success: false,
      message: 'This email is already registered',
    });
  });

  test('rejects invalid data with 400 and field errors', async () => {
    const response = await registerUser({ name: '   ', email: 'not-an-email', password: 'short' });

    assert.equal(response.status, 400);
    assert.equal(response.body.message, 'Validation failed');
    assert.deepEqual(response.body.errors, [
      { field: 'name', message: 'Name is required' },
      { field: 'email', message: 'Please provide a valid email' },
      { field: 'password', message: 'Password must be at least 8 characters' },
    ]);
  });

  test('rejects a password longer than 72 bytes (bcrypt limit), even with few characters', async () => {
    const asciiResponse = await registerUser({ ...validUser, password: 'a'.repeat(73) });
    const accentResponse = await registerUser({ ...validUser, password: 'é'.repeat(40) }); // 80 bytes

    for (const response of [asciiResponse, accentResponse]) {
      assert.equal(response.status, 400);
      assert.deepEqual(response.body.errors, [
        { field: 'password', message: 'Password is too long (maximum 72 bytes)' },
      ]);
    }
  });

  test('rejects missing fields with 400', async () => {
    const response = await request(app).post('/api/auth/register').send({});

    assert.equal(response.status, 400);
    assert.deepEqual(
      response.body.errors.map((error) => error.field),
      ['name', 'email', 'password']
    );
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await registerUser();
  });

  test('logs in with correct credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ASHA@example.com', password: validUser.password });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, validUser.email);
    assert.equal(typeof response.body.data.token, 'string');
    assert.deepEqual(Object.keys(response.body.data.user).sort(), ['email', 'id', 'name']);
  });

  test('wrong password returns 401 with a generic message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { success: false, message: 'Invalid email or password' });
  });

  test('unknown email returns the same generic 401 message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: validUser.password });

    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { success: false, message: 'Invalid email or password' });
  });

  test('missing fields return 400', async () => {
    const response = await request(app).post('/api/auth/login').send({});

    assert.equal(response.status, 400);
    assert.deepEqual(
      response.body.errors.map((error) => error.field),
      ['email', 'password']
    );
  });

  test('rejects a MongoDB operator instead of an email (NoSQL injection)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: { $ne: null }, password: validUser.password });

    assert.equal(response.status, 400);
  });
});

describe('authenticate middleware', () => {
  // A tiny app with one protected route, used only to test the middleware.
  const protectedApp = express();
  protectedApp.get('/protected', authenticate, (req, res) => {
    res.json({ success: true, data: { userId: req.user.id } });
  });
  protectedApp.use(errorHandler);

  test('missing Authorization header returns 401', async () => {
    const response = await request(protectedApp).get('/protected');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Authentication required. Please log in.');
  });

  test('invalid JWT returns 401', async () => {
    const response = await request(protectedApp)
      .get('/protected')
      .set('Authorization', 'Bearer not-a-real-token');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid or expired token. Please log in again.');
  });

  test('JWT signed with a different secret returns 401', async () => {
    const forgedToken = jwt.sign({ userId: 'someone' }, 'attacker-secret');
    const response = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${forgedToken}`);

    assert.equal(response.status, 401);
  });

  test('a malformed token (payload is not JSON) returns 401, not 500', async () => {
    const toBase64Url = (text) => Buffer.from(text).toString('base64url');
    const malformedToken = `${toBase64Url('{"alg":"HS256","typ":"JWT"}')}.${toBase64Url('not json')}.x`;
    const response = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${malformedToken}`);

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid or expired token. Please log in again.');
  });

  test('expired JWT returns 401', async () => {
    const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
    const expiredToken = jwt.sign({ userId: 'someone', exp: oneMinuteAgo }, env.jwtSecret);
    const response = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${expiredToken}`);

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'Invalid or expired token. Please log in again.');
  });

  test('valid JWT passes and exposes the user id', async () => {
    const registerResponse = await registerUser();
    const { token, user } = registerResponse.body.data;

    const response = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.data.userId, user.id);
  });

  test('issued token expires in 1 day', async () => {
    const { token } = (await registerUser()).body.data;
    const { iat, exp } = jwt.decode(token);

    assert.equal(exp - iat, 24 * 60 * 60);
  });
});
