// backend/src/routes/codeRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  suggestCodesForProject,
  getSuggestedCodes,
  updateCodeStatus,
  clearSuggestedCodes,
} from '../services/codeSuggestionService';
import { getCodedSegments, addCodedSegment, deleteCodedSegment } from '../controllers/codeController';
import { getProjectCodes, getCooccurrenceMatrix } from '../controllers/codeController';
import { getCodeMemos, addCodeMemo, deleteCodeMemo } from '../controllers/codeController';
import { generateProjectThematicAnalysis } from '../controllers/codeController';
import { updateCodeMemo } from '../controllers/codeController';

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// 1. ROUTES SPÉCIFIQUES (déclarées EN PREMIER)
// ═══════════════════════════════════════════════════════════════════

// --- Mémos de codes ---
router.get('/memos', authenticate, getCodeMemos);
router.post('/memos', authenticate, addCodeMemo);
router.delete('/memos/:id', authenticate, deleteCodeMemo);
router.put('/memos/:id', authenticate, updateCodeMemo);

// --- Segments de codes ---
router.get('/segments/:documentType/:documentId', authenticate, getCodedSegments);
router.post('/segments', authenticate, addCodedSegment);
router.delete('/segments/:id', authenticate, deleteCodedSegment);

// --- Projet et co-occurrence ---
router.get('/project/:projectId', authenticate, getProjectCodes);
router.get('/cooccurrence/:projectId', authenticate, getCooccurrenceMatrix);

// --- Suggestions IA ---
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

// --- Gestion des codes suggérés ---
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

router.post('/thematic/:projectId', authenticate, generateProjectThematicAnalysis);

// ═══════════════════════════════════════════════════════════════════
// 2. ROUTES GÉNÉRIQUES (déclarées EN DERNIER)
// ⚠️ Ces routes capturent TOUT ce qui n'a pas matché au-dessus
// ═══════════════════════════════════════════════════════════════════

// Récupérer les codes suggérés d'un projet (route générique :projectId)
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

// Mettre à jour le statut d'un code (route générique :codeId)
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

export default router;
