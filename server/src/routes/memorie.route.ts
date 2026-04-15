/**
 * Memory routes — all routes are protected by `requireAuth`.
 *
 * The authenticated user's ID is extracted from the JWT token by the
 * middleware and is available on `req.user.userId`. Controllers no
 * longer require `userId` in the body or query parameters.
 *
 * POST /memories/text      — extract & store memories from plain text
 * POST /memories/link      — extract & store memories from a URL
 * POST /memories/document  — extract & store memories from an uploaded document
 * GET  /memories           — list memories for the authenticated user
 * DELETE /memories         — delete all memories for the authenticated user
 */

import { Router } from 'express';
import {
  createFromText,
  createFromLink,
  createFromDocument,
  getMemories,
  deleteMemories,
  deleteMemoryById,
  updateMemoryById,
} from '../controllers/memories/memorie.controller.js';
import {
  loginRateLimiter,
  registerRateLimiter,
  memoryRateLimiter,
} from '../middleware/rateLimit.js';
import { documentUpload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';

const router = Router();

// All memory routes require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Create memories
// ---------------------------------------------------------------------------

/** Plain text → extract → embed → store */
router.post('/text', memoryRateLimiter, createFromText);

/** URL / link → fetch content → extract → embed → store */
router.post('/link', memoryRateLimiter, createFromLink);

/** Document upload → parse → extract → embed → store */
router.post('/document', memoryRateLimiter, documentUpload.single('file'), createFromDocument);

// ---------------------------------------------------------------------------
// Read / Delete
// ---------------------------------------------------------------------------

/** List memories for the authenticated user */
router.get('/', getMemories);

/** Update a specific memory by ID */
router.patch('/:id', updateMemoryById);

/** Delete all memories for the authenticated user — must be before /:id */
router.delete('/', deleteMemories);

/** Delete a specific memory by ID */
router.delete('/:id', deleteMemoryById);

export default router;
