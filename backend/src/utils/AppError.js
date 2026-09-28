// An error we throw on purpose, carrying the HTTP status code to send.
// Example: throw new AppError('Project not found', 404);
export class AppError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors; // optional list of field errors: [{ field, message }]
  }
}
