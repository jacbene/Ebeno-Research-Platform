// backend/src/controllers/uploadController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { uploadToCloudinary } from '../services/cloudinaryService';

// Configuration multer (stockage temporaire local)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/temp/';
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
  limits: { fileSize: 50 * 1024 * 1024 },
}).single('file');

export const uploadFile = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { projectId, fileHash } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId manquant' });
    if (!fileHash) return res.status(400).json({ error: 'fileHash manquant' });

    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'Aucun fichier' });

    try {
      // 1. Vérifier les doublons
      const existing = await db('project_files')
        .where({ projectId, fileHash })
        .first();

      if (existing) {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(409).json({
          error: 'Ce fichier existe déjà dans ce projet',
          file: existing
        });
      }

      // 2. Upload vers Cloudinary
      const folder = `projects/${projectId}`;
      const { publicId, secureUrl } = await uploadToCloudinary(file.path, folder);

      // 3. Insérer dans la base
      const id = Date.now().toString();
      await db('project_files').insert({
        id,
        projectId,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: secureUrl, // URL Cloudinary
        fileHash,
        cloudinaryPublicId: publicId,
        uploadedAt: Date.now(), // ✅ bigint – timestamp en millisecondes
      });

      const inserted = await db('project_files').where({ id }).first();
      res.status(201).json(inserted);

    } catch (error: any) {
      console.error('❌ Erreur upload file:', error);
      if (file && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
  });
};
