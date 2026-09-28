import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

// All JWT code lives here, so the secret is used in exactly one file.

export function createToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

// Returns the payload, or throws if the token is invalid, expired or malformed.
export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
}
