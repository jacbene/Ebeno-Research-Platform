import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProjectAnalysis, getDocumentAnalysis } from '../services/analysisService';

const router = Router();

// Analyse du projet (agrégée)
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const analysis = await getProjectAnalysis(projectId, userId);
    res.json(analysis);
  } catch (error: any) {
    console.error('Erreur analyse projet:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Analyse d'un document spécifique
router.get('/document/:type/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, id } = req.params;

    if (!['transcription', 'memo', 'file'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const analysis = await getDocumentAnalysis(id, type as any, userId);
    res.json(analysis);
  } catch (error: any) {
    console.error('Erreur analyse document:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
