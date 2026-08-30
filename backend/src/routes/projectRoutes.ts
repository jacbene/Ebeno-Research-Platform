// backend/src/routes/projectRoutes.ts
import { Router } from 'express';
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addTag,
  removeTag
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';
import { db } from '../db/knex';
import { exportProject } from '../services/exportService';
import { existsSync } from 'fs';
import fs from 'fs';

const router = Router();

// Routes principales
router.post('/', authenticate, createProject);
router.get('/', authenticate, getProjects);
router.get('/:id', authenticate, getProject);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);

// Routes des tags
router.post('/:id/tags', authenticate, addTag);
router.delete('/:id/tags/:tagId', authenticate, removeTag);
    
// ====== RECHERCHE FULL-TEXT ======
router.get('/:id/search', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.params.id;
    const q = req.query.q as string || '';

    if (!q || q.length < 2) {
      return res.json({ success: true, data: [] });
    }

    // Vérifier que l'utilisateur est membre du projet
    const member = await db('project_members')
      .where({ projectId, userId })
      .first();
    if (!member) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    // Recherche dans les transcriptions
    const transcriptions = await db('transcriptions')
      .where({ projectId })
      .andWhere(function() {
        this.where('title', 'like', `%${q}%`)
          .orWhere('transcriptText', 'like', `%${q}%`);
      })
      .select('id', 'title', 'transcriptText', 'type', 'created_at', db.raw("'transcription' as source"))
      .orderBy('created_at', 'desc');

    // Recherche dans les mémos
    const memos = await db('memos')
      .where({ projectId })
      .andWhere(function() {
        this.where('title', 'like', `%${q}%`)
          .orWhere('content', 'like', `%${q}%`);
      })
      .select('id', 'title', 'content', 'created_at', db.raw("'memo' as source"))
      .orderBy('created_at', 'desc');

    // Recherche dans les fichiers uploadés
    const files = await db('project_files')
      .where({ projectId })
      .andWhere('fileName', 'like', `%${q}%`)
      .select('id', 'fileName', 'fileSize', 'mimeType', 'uploaded_at', db.raw("'file' as source"))
      .orderBy('uploaded_at', 'desc');

    const results = [...transcriptions, ...memos, ...files];
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Erreur recherche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ====== EXPORT DU PROJET ======
router.get('/:id/export', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.params.id;

    const zipBuffer = await exportProject(projectId, userId);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=projet_${projectId}_${Date.now()}.zip`,
      'Content-Length': zipBuffer.length,
    });
    res.send(zipBuffer);
  } catch (error: any) {
    console.error('Erreur export:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});
  

export default router;
