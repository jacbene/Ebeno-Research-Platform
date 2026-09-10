// backend/src/routes/activityRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProjectActivity } from '../services/activityService';

const router = Router();

// Récupérer l'activité d'un projet
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = Number(req.query.limit) || 50;
    const activity = await getProjectActivity(projectId, limit);
    res.json({ success: true, activity });
  } catch (error: any) {
    console.error('Erreur getProjectActivity:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
