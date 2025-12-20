import { Router } from 'express';
import { createSurvey, getSurvey, updateSurvey, deleteSurvey } from '../controllers/surveyController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createSurvey);
router.get('/:id', authMiddleware, getSurvey);
router.put('/:id', authMiddleware, updateSurvey);
router.delete('/:id', authMiddleware, deleteSurvey);

export default router;
