// backend/src/controllers/fileController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { deleteFromCloudinary } from '../services/cloudinaryService';

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

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

// ---------- Upload ----------
export const uploadFile = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const userId = (req as any).user?.id;
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

// ---------- Soft delete : mettre à la corbeille ----------
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .whereNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    await db('project_files')
      .where({ id: fileId })
      .update({ deletedAt: Date.now() });

    console.log(`🗑️ Fichier déplacé à la corbeille : ${file.fileName}`);
    res.json({ success: true, message: 'Fichier déplacé à la corbeille' });
  } catch (error: any) {
    console.error('Erreur deleteFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// ---------- Liste des fichiers en corbeille ----------
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

// ---------- Restaurer un fichier ----------
export const restoreFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .whereNotNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé dans la corbeille' });

    await db('project_files')
      .where({ id: fileId })
      .update({ deletedAt: null });

    console.log(`♻️ Fichier restauré : ${file.fileName}`);
    res.json({ success: true, message: 'Fichier restauré' });
  } catch (error: any) {
    console.error('Erreur restoreFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};

// ---------- Suppression définitive ----------
export const permanentlyDeleteFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    // Cloudinary
    if (file.cloudinaryPublicId) {
      try {
        await deleteFromCloudinary(file.cloudinaryPublicId);
      } catch (err: any) {
        console.warn(`⚠️ Cloudinary: ${err.message}`);
      }
    }

    // Fichier local
    if (file.filePath && !file.filePath.startsWith('http') && fs.existsSync(file.filePath)) {
      try { fs.unlinkSync(file.filePath); } catch (err) {}
    }

    // Entités + résumés liés
    await db('document_entities').where({ documentId: fileId, documentType: 'file' }).delete();
    await db('document_summaries').where({ documentId: fileId, type: 'file' }).delete();

    // DB
    await db('project_files').where({ id: fileId }).delete();

    console.log(`💥 Fichier supprimé définitivement : ${file.fileName}`);
    res.json({ success: true, message: 'Fichier supprimé définitivement' });
  } catch (error: any) {
    console.error('Erreur permanentlyDeleteFile:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
};
