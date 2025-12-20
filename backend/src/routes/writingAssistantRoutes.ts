import { Router } from 'express';
import { getWritingSuggestions, getPlagiarismReport } from '../controllers/writingAssistantController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/suggestions', authMiddleware, getWritingSuggestions);
router.post('/plagiarism', authMiddleware, getPlagiarismReport);

export default router;
