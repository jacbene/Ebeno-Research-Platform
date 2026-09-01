import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadAndProcessDeepgram } from '../services/deepgramService';
import { db } from '../db/knex';

// Configuration multer pour les fichiers audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/tmp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = new Date().toISOString() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Accepter les fichiers audio
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm',
      'audio/ogg', 'audio/x-m4a', 'audio/flac', 'audio/wave'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|m4a|flac|ogg|webm)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non supporté. Veuillez sélectionner un fichier audio.'));
    }
  }
}).single('file');

// ---------- Contrôleurs ----------

export const uploadTranscription = async (req: Request, res: Response) => {
  // Utiliser multer manuellement pour gérer l'upload
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

      // Lancer l'upload et le traitement via le service
      const result = await uploadAndProcessDeepgram(file, userId, projectId);

      return res.status(201).json({
        success: true,
        data: {
          transcriptionId: result.id,
          message: result.message,
          status: result.status,
        }
      });

    } catch (error: any) {
      console.error('Erreur upload:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
      });
    }
  });
};
  
export const getUserTranscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { projectId, type, status, from, to, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let query = db('transcriptions').where({ userId });
    if (projectId) query = query.where({ projectId });
    if (type) query = query.where({ type });
    if (status) query = query.where({ status });
    if (from) query = query.where('createdAt', '>=', Number(from));
    if (to) query = query.where('createdAt', '<=', Number(to));

    const transcriptions = await query
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(skip);

    const totalResult = await query.clone().count('id as count');
    const total = Number(totalResult[0]?.count || 0);

    return res.status(200).json({
      success: true,
      data: {
        transcriptions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error: any) {
    console.error('Erreur getUserTranscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};            

// Récupérer une transcription par ID
export const getTranscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const transcription = await db('transcriptions')
      .where({ id, userId })
      .first();

    if (!transcription) {
      return res.status(404).json({ success: false, message: 'Transcription non trouvée' });
    }

    return res.status(200).json({ success: true, data: transcription });

  } catch (error: any) {
    console.error('Erreur getTranscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Supprimer une transcription
export const deleteTranscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const deleted = await db('transcriptions')
      .where({ id, userId })
      .delete();

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Transcription non trouvée' });
    }

    return res.status(200).json({ success: true, message: 'Transcription supprimée' });

  } catch (error: any) {
    console.error('Erreur deleteTranscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};

// Récupérer la progression d'une transcription
export const getTranscriptionProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const transcription = await db('transcriptions')
      .where({ id, userId })
      .first();

    if (!transcription) {
      return res.status(404).json({ success: false, message: 'Transcription non trouvée' });
    }

    const progress = transcription.status === 'PROCESSING' ? 50 :
                     transcription.status === 'COMPLETED' ? 100 : 0;

    return res.status(200).json({
      success: true,
      data: {
        id: transcription.id,
        status: transcription.status,
        progress,
        errorMessage: transcription.errorMessage,
        transcriptText: transcription.transcriptText
      }
    });

  } catch (error: any) {
    console.error('Erreur getTranscriptionProgress:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message
    });
  }
};
