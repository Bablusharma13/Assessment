import request from 'supertest';
import app from '../src/app.js';

// Registers a user through the real API and returns their id and JWT.
export async function createUser(name, email) {
  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password: 'secret123' });

  return { id: response.body.data.user.id, token: response.body.data.token };
}

// Waits a moment so two records never share the same createdAt time.
export function pause(milliseconds = 10) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
