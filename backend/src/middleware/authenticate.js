import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/token.js';

// Protects a route: only requests with a valid "Authorization: Bearer <token>" pass.
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required. Please log in.', 401);
  }

  const token = authHeader.split(' ')[1];

  // Any problem with the token (bad signature, expired, malformed) becomes a 401.
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('Invalid or expired token. Please log in again.', 401);
  }

  // Controllers read the logged-in user's id from here — never from the request body.
  req.user = { id: payload.userId };
  next();
}
