import { Router } from 'express';
import { getProjectAnalytics, getTeamAnalytics } from '../controllers/analyticsController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/project/:id', authMiddleware, getProjectAnalytics);
router.get('/team/:id', authMiddleware, getTeamAnalytics);

export default router;
