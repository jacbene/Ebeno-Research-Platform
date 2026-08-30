import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';

// Configuration multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/projects/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
}).single('file');

export const uploadFile = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

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
        uploaded_at: Date.now()
      });

      const inserted = await db('project_files').where({ id }).first();
      res.status(201).json(inserted);
    } catch (error) {
      console.error('Erreur upload file:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });
};

export const getFiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.params.projectId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const files = await db('project_files')
      .where({ projectId, userId })
      .orderBy('uploaded_at', 'desc');

    // Grouper par type (extension)
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

export const deleteFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const file = await db('project_files')
      .where({ id: fileId, projectId, userId })
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    // Supprimer le fichier physique
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await db('project_files').where({ id: fileId }).delete();
    res.json({ message: 'Fichier supprimé' });
  } catch (error) {
    console.error('Erreur deleteFile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
