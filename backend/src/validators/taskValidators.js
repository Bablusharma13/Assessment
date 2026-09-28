import { body } from 'express-validator';
import { TASK_STATUSES } from '../models/Task.js';
import { mongoIdParam, optionalDescription, requiredText } from './commonRules.js';

const STATUS_MESSAGE = `Status must be one of: ${TASK_STATUSES.join(', ')}`;

function taskTitle() {
  return requiredText('title', 'Title')
    .isLength({ max: 100 })
    .withMessage('Title must be at most 100 characters');
}

// Optional everywhere: a new task defaults to "Todo".
function taskStatus() {
  return body('status')
    .optional()
    .isString()
    .withMessage(STATUS_MESSAGE)
    .bail()
    .isIn(TASK_STATUSES)
    .withMessage(STATUS_MESSAGE);
}

export const projectTasksRules = [mongoIdParam('projectId', 'project')];

export const createTaskRules = [
  mongoIdParam('projectId', 'project'),
  taskTitle(),
  optionalDescription(),
  taskStatus(),
];

export const taskIdRules = [mongoIdParam('id', 'task')];

// On update every field is optional, but a field that is sent must be valid.
export const updateTaskRules = [
  mongoIdParam('id', 'task'),
  taskTitle().optional(),
  optionalDescription(),
  taskStatus(),
];
