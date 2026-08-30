import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { suggestCodesForProject, getSuggestedCodes, updateCodeStatus } from '../services/codeSuggestionService';

const router = Router();

// Générer des suggestions de codes pour un projet
router.post('/suggest/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const suggestions = await suggestCodesForProject(projectId);
    res.json({ success: true, suggestions });
  } catch (error: any) {
    console.error('Erreur suggestion:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Récupérer les codes suggérés (avec statut)
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const codes = await getSuggestedCodes(projectId);
    res.json({ success: true, data: codes });
  } catch (error: any) {
    console.error('Erreur récupération codes:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Accepter ou rejeter un code
router.put('/:codeId', authenticate, async (req, res) => {
  try {
    const { codeId } = req.params;
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    await updateCodeStatus(codeId, status);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Erreur mise à jour code:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
