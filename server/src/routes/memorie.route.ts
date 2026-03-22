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

router.use(requireAuth);

router.get('/search', searchMemoriesController);
router.get('/stats', getStats);

router.post('/text', createFromText);
router.post('/link', createFromLink);
router.post('/document', documentUpload.single('file'), createFromDocument);

router.get('/', getMemories);
router.patch('/:id', updateMemory);
router.delete('/:id', deleteMemoryById);

router.delete('/', deleteMemories);

export default router;
