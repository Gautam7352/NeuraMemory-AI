import { Router } from 'express';
import { chatController } from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';

const router = Router();
router.post('/', requireAuth, chatController);

export default router;
