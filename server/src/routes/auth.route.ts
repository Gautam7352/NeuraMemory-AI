import { Router } from 'express';
import {
  loginController,
  registerController,
  generateApiKeyController
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';


const router = Router();

router.post('/login', loginController);
router.post('/register', registerController);
router.post('/api-key', requireAuth, generateApiKeyController);

export default router;
