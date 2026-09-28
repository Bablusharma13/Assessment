import { AppError } from '../utils/AppError.js';

// Runs only when no route matched the request.
export function notFound(req, res, next) {
  next(new AppError('Route not found', 404));
}
