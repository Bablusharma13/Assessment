import { mongoIdParam, optionalDescription, requiredText } from './commonRules.js';

function projectName() {
  return requiredText('name', 'Project name')
    .isLength({ max: 100 })
    .withMessage('Project name must be at most 100 characters');
}

export const projectIdRules = [mongoIdParam('id', 'project')];

export const createProjectRules = [projectName(), optionalDescription()];

// On update every field is optional, but a field that is sent must be valid.
export const updateProjectRules = [
  mongoIdParam('id', 'project'),
  projectName().optional(),
  optionalDescription(),
];
