import { body } from 'express-validator';

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
