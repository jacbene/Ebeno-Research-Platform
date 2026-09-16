// backend/src/routes/statsRoutes.ts
import { Router } from 'express';
import { getDashboardStats } from '../controllers/statsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, getDashboardStats);

export default router;
