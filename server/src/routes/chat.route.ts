/**
 * Chat routes — all routes are protected by `requireAuth`.
 *
 * POST /chat          — send a message (rate-limited: 30 req/min per user)
 * GET  /chat/history  — retrieve chat history for the authenticated user
 * DELETE /chat/history — clear chat history for the authenticated user
 */

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  sendMessageHandler,
  getChatHistoryHandler,
  clearChatHistoryHandler,
} from '../controllers/chat.controller.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';

const router = Router();

// All chat routes require authentication
router.use(requireAuth);

const nodeEnv = process.env['NODE_ENV'];
const isDevelopmentLike = nodeEnv === 'development' || nodeEnv === 'test';

const chatMaxRequests = isDevelopmentLike ? 10_000 : 30;
const chatWindowMs = 60 * 1000; // 1 minute

export const chatRateLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  windowMs: chatWindowMs,
  max: chatMaxRequests,
  keyGenerator: (req) => req.user?.userId || 'unknown',
  message: {
    success: false,
    message: isDevelopmentLike
      ? 'Rate limit exceeded in development mode (unexpected).'
      : 'Too many messages sent. Please try again in a minute.',
  },
});

router.post('/', chatRateLimiter, sendMessageHandler);
router.get('/history', getChatHistoryHandler);
router.delete('/history', clearChatHistoryHandler);

export default router;
