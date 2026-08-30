import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { db } from '../db/knex';
import { extractAndStoreEntities, getDocumentEntities, getProjectEntities } from '../services/entityExtractor';
import { extractText } from '../services/textExtractor';
import path from 'path';
import fs from 'fs';

const router = Router();

// Récupérer les entités d'un projet
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    const memos = await db('memos').where({ projectId }).select('id');
    const memoIds = memos.map(m => m.id);
    const transcriptions = await db('transcriptions').where({ projectId }).select('id');
    const transcriptionIds = transcriptions.map(t => t.id);
    const files = await db('project_files').where({ projectId }).select('id');
    const fileIds = files.map(f => f.id);
    const allDocIds = [...memoIds, ...transcriptionIds, ...fileIds];

    if (allDocIds.length === 0) {
      return res.json({ success: true, entities: {} });
    }

    const entities = await db('document_entities')
      .whereIn('documentId', allDocIds)
      .select('entityType', 'entityValue');

    const grouped: Record<string, string[]> = {};
    entities.forEach(row => {
      const type = row.entityType;
      if (!grouped[type]) grouped[type] = [];
      if (!grouped[type].includes(row.entityValue)) {
        grouped[type].push(row.entityValue);
      }
    });

    res.json({ success: true, entities: grouped });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Extraire les entités d'un document spécifique
router.post('/extract/:type/:id', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, id } = req.params;

    if (!['transcription', 'memo', 'file'].includes(type)) {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    let text = '';
    if (type === 'transcription') {
      const doc = await db('transcriptions').where({ id, userId }).first();
      if (!doc) return res.status(404).json({ error: 'Document non trouvé' });
      text = doc.transcriptText || '';
    } else if (type === 'memo') {
      const doc = await db('memos').where({ id, userId }).first();
      if (!doc) return res.status(404).json({ error: 'Memo non trouvé' });
      text = doc.content || '';
    } else if (type === 'file') {
      const doc = await db('project_files').where({ id, userId }).first();
      if (!doc) return res.status(404).json({ error: 'Fichier non trouvé' });
      const filePath = path.join(__dirname, '../../', doc.filePath);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Fichier physique introuvable' });
      text = await extractText(filePath, doc.mimeType);
    }

    if (!text || text.trim().length < 10) {
      return res.status(400).json({ error: 'Texte trop court pour l\'extraction' });
    }

    await extractAndStoreEntities(id, type as any, text);
    const entities = await getDocumentEntities(id, type as any);

    res.json({ success: true, entities });
  } catch (error: any) {
    console.error('Erreur extraction entités:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Extraire les entités de tous les documents d'un projet (batch)
router.post('/extract-project/:projectId', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    console.log(`🚀 Extraction batch pour projet ${projectId}`);

    const memos = await db('memos').where({ projectId }).select('id', 'content');
    for (const m of memos) {
      if (m.content && m.content.trim().length > 10) {
        await extractAndStoreEntities(m.id, 'memo', m.content);
      }
    }

    const transcriptions = await db('transcriptions').where({ projectId }).select('id', 'transcriptText');
    for (const t of transcriptions) {
      if (t.transcriptText && t.transcriptText.trim().length > 10) {
        await extractAndStoreEntities(t.id, 'transcription', t.transcriptText);
      }
    }

    const files = await db('project_files').where({ projectId }).select('id', 'filePath', 'mimeType');
    for (const f of files) {
      const filePath = path.join(__dirname, '../../', f.filePath);
      if (fs.existsSync(filePath)) {
        try {
          const text = await extractText(filePath, f.mimeType);
          if (text && text.trim().length > 10) {
            await extractAndStoreEntities(f.id, 'file', text);
          }
        } catch (err) {
          console.warn(`⚠️ Ignoré fichier ${f.id} (${f.filePath}):`, err.message);
        }
      }
    }

    const entities = await getProjectEntities(projectId, userId);
    res.json({ success: true, entities, message: 'Extraction terminée' });
  } catch (error: any) {
    console.error('Erreur extraction batch:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

export default router;
