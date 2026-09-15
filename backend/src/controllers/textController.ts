// backend/src/controllers/textController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { extractText, extractTextFromBuffer } from '../services/textExtractor';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { emitGlobal } from '../socketManager';
import { logActivity } from '../services/activityService';
import { logger } from '../utils/logger';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/temp/';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type non supporté. Seuls .txt, .pdf, .docx sont autorisés.'));
    }
  },
}).single('file');

export const uploadText = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    try {
      const user = (req as any).user;
      const userId = user?.id;
      const userName = user?.name || user?.email || 'Utilisateur';

      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
      }

      // ✅ Récupérer projectId (envoyé AVANT le fichier côté frontend)
      const { projectId } = req.body;
      logger.info(`📄 [text] Upload : ${file.originalname} | projectId: ${projectId || 'AUCUN'}`);

      const filePath = file.path;

      // 1. Extraire le texte AVANT l'upload Cloudinary
      const text = await extractText(filePath, file.mimetype);

      // 2. Uploader le fichier original vers Cloudinary
      const folder = `projects/${projectId || 'global'}/texts`;
      const resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'raw';
      const { publicId, secureUrl } = await uploadToCloudinary(filePath, folder, resourceType);

      // 3. Insérer en base
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const now = new Date().toISOString();

      await db('transcriptions').insert({
        id,
        userId,
        projectId: projectId || null,
        title: file.originalname,
        status: 'COMPLETED',
        transcriptText: text,
        audioUrl: secureUrl, // ✅ URL Cloudinary
        errorMessage: null,
        type: 'text',
        fileName: file.originalname,
        createdAt: now,
        updatedAt: now,
      });

      // 4. Émettre Socket.IO
      if (projectId) {
        emitGlobal('document-uploaded', {
          projectId,
          documentId: id,
          fileName: file.originalname,
          type: 'text',
        });

        await logActivity({
          projectId,
          userId,
          userName,
          action: 'text-uploaded',
          targetType: 'document',
          targetId: id,
          targetName: file.originalname,
        });
      }

      return res.status(201).json({
        success: true,
        data: {
          transcriptionId: id,
          message: 'Fichier texte importé avec succès',
          status: 'COMPLETED',
          fileUrl: secureUrl,
          cloudinaryPublicId: publicId,
        },
      });
    } catch (error: any) {
      logger.error('❌ Erreur upload texte:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message,
      });
    }
  });
};

export const getTexts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const texts = await db('transcriptions')
      .where({ userId, type: 'text' })
      .whereNull('deletedAt')
      .orderBy('createdAt', 'desc')
      .select('*');

    return res.status(200).json({ success: true, data: texts });
  } catch (error) {
    logger.error('Erreur getTexts:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
