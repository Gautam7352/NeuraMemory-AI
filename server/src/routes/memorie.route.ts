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
  searchMemoriesController,
  getStats,
  updateMemory,
} from '../controllers/memories/memorie.controller.js';
import { documentUpload } from '../middleware/upload.js';
import { requireAuth } from '../middleware/auth/requireAuth.js';

const router = Router();

// All memory routes require authentication
router.use(requireAuth);

// ---------------------------------------------------------------------------
// Search & Stats — must be before /:id to avoid Express treating them as IDs
// ---------------------------------------------------------------------------
router.get('/search', searchMemoriesController);
router.get('/stats', getStats);

// ---------------------------------------------------------------------------
// Create memories
// ---------------------------------------------------------------------------
router.post('/text', createFromText);
router.post('/link', createFromLink);
router.post('/document', documentUpload.single('file'), createFromDocument);

// ---------------------------------------------------------------------------
// Read / Delete / Update
// ---------------------------------------------------------------------------
router.get('/', getMemories);
router.delete('/', deleteMemories);
router.patch('/:id', updateMemory);
router.delete('/:id', deleteMemoryById);

export default router;
