// backend/src/controllers/uploadController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { uploadToCloudinary } from '../services/cloudinaryService';
import { extractTextFromUrl } from '../services/textExtractor';        // ✅ NOUVEAU
import { detectLanguage } from '../services/languageDetectionService'; // ✅ NOUVEAU
import { logger } from '../utils/logger';                              // ✅ NOUVEAU

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

// ✅ Types MIME pour lesquels on peut extraire du texte et détecter la langue
const TEXT_EXTRACTABLE_MIMES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/plain',
  'text/markdown',
  'text/csv',
];

/**
 * Détecte la langue d'un fichier uploadé.
 * Retourne null si :
 *   - le type MIME n'est pas textuel (image, vidéo, audio)
 *   - l'extraction échoue
 *   - le texte est trop court
 */
const detectFileLanguage = async (
  secureUrl: string,
  mimeType: string
): Promise<string | null> => {
  // Ne pas tenter sur les fichiers non-texte
  const isExtractable = TEXT_EXTRACTABLE_MIMES.some((m) => mimeType.startsWith(m));
  if (!isExtractable) {
    logger.info(`🌍 [upload] Type ${mimeType} non textuel → langue ignorée`);
    return null;
  }

  try {
    const text = await extractTextFromUrl(secureUrl, mimeType);

    if (!text || text.trim().length < 30) {
      logger.info(`🌍 [upload] Texte trop court (${text?.length || 0} chars) → langue ignorée`);
      return null;
    }

    const detection = detectLanguage(text);
    logger.info(
      `🌍 [upload] Langue détectée : ${detection.language || 'indéterminée'} ` +
      `(confiance: ${detection.confidence}, supporté: ${detection.isSupported})`
    );

    return detection.language;
  } catch (error: any) {
    logger.warn(`⚠️ [upload] Extraction/détection échouée : ${error.message}`);
    return null;
  }
};

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

      let resourceType: 'raw' | 'auto' | 'image' | 'video' = 'auto';
      if (file.mimetype === 'application/pdf') {
        resourceType = 'raw';
      } else if (file.mimetype.startsWith('image/')) {
        resourceType = 'image';
      } else if (file.mimetype.startsWith('video/')) {
        resourceType = 'video';
      } else {
        resourceType = 'raw';
      }

      const { publicId, secureUrl } = await uploadToCloudinary(file.path, folder, resourceType);

      // ✅ 2bis. Détection de langue (avant l'insert pour stocker directement)
      const language = await detectFileLanguage(secureUrl, file.mimetype);

      // 3. Insérer dans la base
      const id = Date.now().toString();
      await db('project_files').insert({
        id,
        projectId,
        userId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        filePath: secureUrl,
        fileHash,
        cloudinaryPublicId: publicId,
        language,                        // ✅ 'fr' | 'en' | ... | null
        uploadedAt: Date.now(),
      });

      const inserted = await db('project_files').where({ id }).first();

      // Nettoyage du fichier temporaire local
      if (fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }

      res.status(201).json(inserted);

    } catch (error: any) {
      logger.error('❌ Erreur upload file:', error);
      if (file && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch {}
      }
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    }
  });
};
