import { body } from 'express-validator';
import { requiredText } from './commonRules.js';

export const registerRules = [
  requiredText('name', 'Name')
    .isLength({ max: 50 })
    .withMessage('Name must be at most 50 characters'),

  requiredText('email', 'Email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .toLowerCase(),

  // Passwords are not trimmed: spaces are valid password characters.
  // bcrypt ignores everything after 72 bytes, so the maximum is checked in bytes
  // (characters like "é" or emoji take more than one byte).
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .bail()
    .isByteLength({ max: 72 })
    .withMessage('Password is too long (maximum 72 bytes)'),
];

export const loginRules = [
  requiredText('email', 'Email').toLowerCase(),

  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];
