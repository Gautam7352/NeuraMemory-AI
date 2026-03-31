import { Router } from 'express';
import {
  loginController,
  logoutController,
  meController,
  registerController,
  generateApiKeyController,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';
import {
  loginRateLimiter,
  registerRateLimiter,
} from '../middleware/rateLimit.js';

const router = Router();

router.post('/login', loginRateLimiter, loginController);
router.post('/register', registerRateLimiter, registerController);
router.post('/logout', logoutController);
router.get('/me', requireAuth, meController);
router.post('/api-key', requireAuth, generateApiKeyController);

export default router;
