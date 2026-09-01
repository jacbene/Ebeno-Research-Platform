import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { db } from '../db/knex';
import { extractText } from '../services/textExtractor';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/texts/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Seuls .txt, .pdf, .docx sont autorisés.'));
    }
  }
}).single('file');

export const uploadText = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Non authentifié' });
      }

      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });
      }

      const { projectId } = req.body;
      const filePath = file.path;
      const text = await extractText(filePath, file.mimetype);

      const id = Date.now().toString();
      await db('transcriptions').insert({
        id,
        userId,
        projectId: projectId || null,
        title: file.originalname,
        status: 'COMPLETED',
        transcriptText: text,
        audioUrl: null,
        errorMessage: null,
        type: 'text',
        fileName: file.originalname,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      return res.status(201).json({
        success: true,
        data: {
          transcriptionId: id,
          message: 'Fichier texte importé avec succès',
          status: 'COMPLETED',
        }
      });

    } catch (error: any) {
      console.error('Erreur upload texte:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
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
      .orderBy('createdAt', 'desc')
      .select('*');

    return res.status(200).json({ success: true, data: texts });
  } catch (error) {
    console.error('Erreur getTexts:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
