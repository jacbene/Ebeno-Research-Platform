// backend/src/controllers/fileController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { deleteFromCloudinary } from '../services/cloudinaryService';
import { emitGlobal } from '../socketManager';
import { logActivity } from '../services/activityService';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/projects/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }).single('file');

// ---------- Upload ----------
export const uploadFile = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const projectId = req.params.projectId;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'Aucun fichier' });

    try {
      const id = Date.now().toString();
      await db('project_files').insert({
        id,
        projectId,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: file.path,
        uploadedAt: Date.now(),
        deletedAt: null,
      });

      const inserted = await db('project_files').where({ id }).first();

      // 📡 Socket.IO
      emitGlobal('file-uploaded', { projectId, file: inserted });

      // 📋 Activité
      await logActivity({
        projectId,
        userId,
        userName,
        action: 'file-uploaded',
        targetType: 'file',
        targetId: id,
        targetName: file.originalname,
        metadata: { size: file.size, mimeType: file.mimetype },
      });

      res.status(201).json(inserted);
    } catch (error: any) {
      console.error('Erreur upload file:', error);
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
  });
};

// ---------- Liste des fichiers actifs ----------
export const getFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.params.projectId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const files = await db('project_files')
      .where({ projectId, userId })
      .whereNull('deletedAt')
      .orderBy('uploadedAt', 'desc');

    const grouped = files.reduce((acc, file) => {
      const ext = path.extname(file.fileName).toLowerCase().slice(1) || 'fichier';
      if (!acc[ext]) acc[ext] = [];
      acc[ext].push(file);
      return acc;
    }, {} as Record<string, typeof files>);

    res.json({ files, grouped });
  } catch (error) {
    console.error('Erreur getFiles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ---------- Soft delete ----------
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId, fileId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .whereNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    await db('project_files').where({ id: fileId }).update({ deletedAt: Date.now() });

    emitGlobal('file-trashed', { projectId, fileId, fileName: file.fileName });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'file-trashed',
      targetType: 'file',
      targetId: fileId,
      targetName: file.fileName,
    });

    res.json({ success: true, message: 'Fichier déplacé à la corbeille' });
  } catch (error: any) {
    console.error('Erreur deleteFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// ---------- Corbeille ----------
export const getTrashedFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.params.projectId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const files = await db('project_files')
      .where({ projectId, userId })
      .whereNotNull('deletedAt')
      .orderBy('deletedAt', 'desc');

    res.json({ files });
  } catch (error) {
    console.error('Erreur getTrashedFiles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ---------- Restaurer ----------
export const restoreFile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId, fileId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .whereNotNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé dans la corbeille' });

    await db('project_files').where({ id: fileId }).update({ deletedAt: null });

    emitGlobal('file-restored', { projectId, fileId, fileName: file.fileName });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'file-restored',
      targetType: 'file',
      targetId: fileId,
      targetName: file.fileName,
    });

    res.json({ success: true, message: 'Fichier restauré' });
  } catch (error: any) {
    console.error('Erreur restoreFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// ---------- Suppression définitive ----------
export const permanentlyDeleteFile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId, fileId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files').where({ id: fileId, projectId, userId }).first();
    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    if (file.cloudinaryPublicId) {
      try { await deleteFromCloudinary(file.cloudinaryPublicId); } catch (err: any) { console.warn(err.message); }
    }
    if (file.filePath && !file.filePath.startsWith('http') && fs.existsSync(file.filePath)) {
      try { fs.unlinkSync(file.filePath); } catch (err) {}
    }

    await db('document_entities').where({ documentId: fileId, documentType: 'file' }).delete();
    await db('document_summaries').where({ documentId: fileId, type: 'file' }).delete();
    await db('project_files').where({ id: fileId }).delete();

    emitGlobal('file-deleted-permanently', { projectId, fileId, fileName: file.fileName });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'file-deleted-permanently',
      targetType: 'file',
      targetId: fileId,
      targetName: file.fileName,
    });

    res.json({ success: true, message: 'Fichier supprimé définitivement' });
  } catch (error: any) {
    console.error('Erreur permanentlyDeleteFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// ---------- Vider la corbeille ----------
export const emptyTrash = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const trashedFiles = await db('project_files')
      .where({ projectId, userId })
      .whereNotNull('deletedAt');

    if (trashedFiles.length === 0) {
      return res.json({ success: true, count: 0, message: 'Corbeille déjà vide' });
    }

    let deletedCount = 0;

    for (const file of trashedFiles) {
      try {
        if (file.cloudinaryPublicId) {
          try { await deleteFromCloudinary(file.cloudinaryPublicId); } catch (err: any) { console.warn(err.message); }
        }
        if (file.filePath && !file.filePath.startsWith('http') && fs.existsSync(file.filePath)) {
          try { fs.unlinkSync(file.filePath); } catch (err) {}
        }
        await db('document_entities').where({ documentId: file.id, documentType: 'file' }).delete();
        await db('document_summaries').where({ documentId: file.id, type: 'file' }).delete();
        await db('project_files').where({ id: file.id }).delete();
        deletedCount++;
      } catch (err: any) {
        console.error(`⚠️ Échec suppression ${file.id}:`, err.message);
      }
    }

    emitGlobal('trash-emptied', { projectId, type: 'files', count: deletedCount });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'trash-emptied',
      targetType: 'file',
      metadata: { count: deletedCount },
    });

    res.json({
      success: true,
      count: deletedCount,
      message: `${deletedCount} fichier(s) supprimé(s) définitivement`,
    });
  } catch (error: any) {
    console.error('Erreur emptyTrash:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
