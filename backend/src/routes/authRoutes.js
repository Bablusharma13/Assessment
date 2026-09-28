import { Router } from 'express';
import { register, login } from '../controllers/authController.js';
import { registerRules, loginRules } from '../validators/authValidators.js';
import { validate } from '../middleware/validate.js';

const router = Router();

// Each route: validation rules → validate (stop if invalid) → controller.
router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);

export default router;
