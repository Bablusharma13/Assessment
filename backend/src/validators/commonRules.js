import { body, param } from 'express-validator';

// A URL parameter that must be a valid MongoDB ObjectId, e.g. /api/projects/:id
export function mongoIdParam(name, resourceName) {
  return param(name).isMongoId().withMessage(`Invalid ${resourceName} id`);
}

// An optional description: if sent, it must be text of at most 500 characters.
export function optionalDescription() {
  return body('description')
    .optional()
    .isString()
    .withMessage('Description must be text')
    .bail()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be at most 500 characters');
}

// A required text field: must be a string and not empty after trimming.
// Checking the type blocks objects like { "$ne": null } from reaching MongoDB queries.
export function requiredText(field, label) {
  return body(field)
    .isString()
    .withMessage(`${label} is required`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .bail();
}
