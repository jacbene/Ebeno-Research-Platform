// backend/src/routes/codeRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  suggestCodesForProject,
  getSuggestedCodes,
  updateCodeStatus,
  clearSuggestedCodes,
} from '../services/codeSuggestionService';

const router = Router();

// Suggérer des codes pour un projet
router.post('/suggest/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const suggestions = await suggestCodesForProject(projectId);
    res.json({ success: true, suggestions, count: suggestions.length });
  } catch (error: any) {
    console.error('Erreur suggestion:', error);
    res.status(500).json({ error: error.message });
  }
});

// Récupérer les codes suggérés d'un projet
router.get('/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const codes = await getSuggestedCodes(projectId);
    res.json({ success: true, codes });
  } catch (error: any) {
    console.error('Erreur get codes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mettre à jour le statut d'un code (accepted / rejected)
router.patch('/:codeId', authenticate, async (req, res) => {
  try {
    const { codeId } = req.params;
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    await updateCodeStatus(codeId, status);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erreur update code:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Vider tous les codes d'un projet
router.delete('/clear/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const count = await clearSuggestedCodes(projectId);
    res.json({ success: true, message: `${count} codes supprimés`, count });
  } catch (error: any) {
    console.error('Erreur clear codes:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
