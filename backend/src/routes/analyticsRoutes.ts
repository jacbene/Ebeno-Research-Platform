// backend/src/routes/analyticsRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getAnalyticsDashboard,
  getAnalyticsProjects,
} from '../controllers/analyticsController';

const router = Router();

router.get('/dashboard', authenticate, getAnalyticsDashboard);
router.get('/projects', authenticate, getAnalyticsProjects);

export default router;
