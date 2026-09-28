import { validationResult } from 'express-validator';
import { AppError } from '../utils/AppError.js';

// Runs after the validation rules of a route and stops the request if any rule failed.
export function validate(req, res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const errors = result
    .array({ onlyFirstError: true })
    .map((error) => ({ field: error.path, message: error.msg }));

  next(new AppError('Validation failed', 400, errors));
}
