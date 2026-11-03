// backend/src/routes/analysisRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getProjectAnalysis, getDocumentAnalysis } from '../services/analysisService';
import { db } from '../db/knex';
import { analyzeSentiment } from '../services/sentimentService';
import { checkAndIncrementAiQuota } from '../services/aiQuotaService';

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

// Analyse d'un document spécifique (GET et POST)
router.route('/document/:type/:id')
  .get(authenticate, async (req, res) => {
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
  })
  .post(authenticate, async (req, res) => {
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

// ✅ NOUVELLE ROUTE : Analyse de sentiment
router.post('/sentiment/:type/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, id } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!['transcription', 'memo'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide pour le sentiment (transcription ou memo uniquement).' });
    }

    // 1. Récupérer le texte selon le type
    let text = '';
    if (type === 'transcription') {
      const doc = await db('transcriptions').where({ id, userId }).first();
      if (!doc) return res.status(404).json({ error: 'Transcription non trouvée' });
      text = doc.transcriptText || '';
    } else if (type === 'memo') {
      const doc = await db('memos').where({ id, userId }).first();
      if (!doc) return res.status(404).json({ error: 'Memo non trouvé' });
      text = doc.content || '';
    }

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: 'Texte trop court pour être analysé (50 caractères minimum).' });
    }

    // 2. Vérifier le quota IA
    const quota = await checkAndIncrementAiQuota(userId);
    if (!quota.allowed) {
      return res.status(403).json({
        success: false,
        message: quota.message,
        code: 'QUOTA_EXCEEDED',
        limit: quota.limit,
        used: quota.used,
      });
    }

    // 3. Lancer l'analyse
    const result = await analyzeSentiment(text);

    return res.json({
      success: true,
      data: result,
      quota: { used: quota.used, limit: quota.limit },
    });
  } catch (error: any) {
    console.error('❌ Erreur analyse sentiment:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
