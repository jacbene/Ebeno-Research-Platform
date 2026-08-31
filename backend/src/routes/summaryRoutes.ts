import { Router } from 'express';
import { generateDocumentSummary, getDocumentSummary, getProjectSummaries } from '../services/summaryService';
import { authenticate } from '../middleware/auth';

const router = Router();

// Types de documents autorisés
const DOCUMENT_TYPES = ['transcription', 'memo', 'file'] as const;
type DocumentType = typeof DOCUMENT_TYPES[number];

// Générer un résumé pour un document
router.post('/:type/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, id } = req.params;

    if (!DOCUMENT_TYPES.includes(type as DocumentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const validType = type as DocumentType;
    const summary = await generateDocumentSummary(id, validType, userId);
    res.json({ success: true, summary });
  } catch (error: any) {
    console.error('Erreur génération résumé:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Récupérer un résumé existant
router.get('/:type/:id', authenticate, async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!DOCUMENT_TYPES.includes(type as DocumentType)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    const summary = await getDocumentSummary(id, type as DocumentType);
    res.json({ summary });
  } catch (error: any) {
    console.error('Erreur récupération résumé:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Récupérer tous les résumés d'un projet
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const summaries = await getProjectSummaries(projectId, userId);
    res.json({ success: true, data: summaries });
  } catch (error: any) {
    console.error('Erreur récupération résumés:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
