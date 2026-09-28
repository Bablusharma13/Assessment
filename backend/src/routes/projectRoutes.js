import { Router } from 'express';
import {
  getProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from '../controllers/projectController.js';
import {
  projectIdRules,
  createProjectRules,
  updateProjectRules,
} from '../validators/projectValidators.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Every project route requires a logged-in user.
router.use(authenticate);

router.get('/', getProjects);
router.post('/', createProjectRules, validate, createProject);
router.get('/:id', projectIdRules, validate, getProject);
router.put('/:id', updateProjectRules, validate, updateProject);
router.delete('/:id', projectIdRules, validate, deleteProject);

export default router;
