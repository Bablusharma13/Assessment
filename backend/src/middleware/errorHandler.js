import { AppError } from '../utils/AppError.js';

// Converts any error into { statusCode, message, errors? }.
// Known errors get a helpful message; unknown errors get a generic one.
function normalizeError(error) {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, errors: error.errors };
  }

  // Mongoose schema validation failed (e.g. a required field is missing).
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map((fieldError) => ({
      field: fieldError.path,
      message: fieldError.message,
    }));
    return { statusCode: 400, message: 'Validation failed', errors };
  }

  // A value could not be converted to the schema type (e.g. an invalid ObjectId).
  if (error.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for ${error.path}` };
  }

  // The document was deleted after we loaded it and before save() (e.g. deleted in another tab).
  // A fixed message is used because Mongoose's own message contains the query.
  if (error.name === 'DocumentNotFoundError') {
    return { statusCode: 404, message: 'This item no longer exists' };
  }

  // MongoDB unique index violation, e.g. two sign-ups with the same email at the same moment.
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'value';
    return { statusCode: 400, message: `This ${field} is already registered` };
  }

  // express.json() could not parse the request body.
  if (error.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Request body contains invalid JSON' };
  }

  // Request body is bigger than the limit set in express.json().
  if (error.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body is too large' };
  }

  // Any other client mistake reported by Express itself
  // (e.g. unsupported body encoding or a malformed URL).
  if (error.status >= 400 && error.status < 500) {
    return { statusCode: 400, message: 'Invalid request' };
  }

  return { statusCode: 500, message: 'Something went wrong. Please try again later.' };
}

// Express recognises an error handler by its 4 parameters, so `_next` must stay.
export function errorHandler(error, req, res, _next) {
  const { statusCode, message, errors } = normalizeError(error);

  // Unexpected errors are logged so they show up in the Render logs.
  // The details are never sent to the client.
  if (statusCode === 500) {
    console.error(error);
  }

  const body = { success: false, message };
  if (errors) {
    body.errors = errors;
  }

  res.status(statusCode).json(body);
}
