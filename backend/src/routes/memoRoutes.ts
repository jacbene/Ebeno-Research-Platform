import express from 'express';
import memoController from '../controllers/memoController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// === ROUTES CRUD ===
router.post('/memos', memoController.createMemo);
router.get('/memos', memoController.getMemos);
router.get('/memos/:memoId', memoController.getMemo);
router.put('/memos/:memoId', memoController.updateMemo);
router.delete('/memos/:memoId', memoController.deleteMemo);

// === ROUTES PAR PROJET ===
router.get('/projects/:projectId/memos', memoController.getProjectMemos);
router.get('/projects/:projectId/memos/statistics', memoController.getMemoStatistics);
router.get('/projects/:projectId/memos/search', memoController.searchMemos);

// === ROUTES IA ===
router.post('/projects/:projectId/memos/generate-ai', memoController.generateMemoWithAI);

export default router;
