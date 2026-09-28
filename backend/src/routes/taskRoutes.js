import { Router } from 'express';
import { updateTask, deleteTask } from '../controllers/taskController.js';
import { taskIdRules, updateTaskRules } from '../validators/taskValidators.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';

// Routes for a single task. Listing and creating tasks live under
// /api/projects/:projectId/tasks (see projectRoutes.js).
const router = Router();

router.use(authenticate);

router.put('/:id', updateTaskRules, validate, updateTask);
router.delete('/:id', taskIdRules, validate, deleteTask);

export default router;
