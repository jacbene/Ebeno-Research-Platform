// backend/src/controllers/transcriptionController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { uploadAndProcessDeepgram } from '../services/deepgramService';
import { db } from '../db/knex';
import { emitGlobal } from '../socketManager';
import { logActivity } from '../services/activityService';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/tmp/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = new Date().toISOString() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
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

// ---------- Upload ----------
export const uploadTranscription = async (req: Request, res: Response) => {
  upload(req, res, async (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });

    try {
      const user = (req as any).user;
      const userId = user?.id;
      const userName = user?.name || user?.email || 'Utilisateur';

      if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, message: 'Aucun fichier uploadé' });

      const { projectId } = req.body;
      const result = await uploadAndProcessDeepgram(file, userId, projectId);

      emitGlobal('transcription-uploaded', { projectId, id: result.id, title: file.originalname });

      await logActivity({
        projectId,
        userId,
        userName,
        action: 'transcription-uploaded',
        targetType: 'transcription',
        targetId: result.id,
        targetName: file.originalname,
        metadata: { size: file.size, mimeType: file.mimetype },
      });

      return res.status(201).json({
        success: true,
        data: { transcriptionId: result.id, message: result.message, status: result.status }
      });
    } catch (error: any) {
      console.error('Erreur upload:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
    }
  });
};

// ---------- Liste des transcriptions (hors corbeille) ----------
export const getUserTranscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const { projectId, type, status, from, to, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let fromDate: string | undefined;
    let toDate: string | undefined;
    if (from) {
      const ts = Number(from);
      if (!isNaN(ts)) fromDate = new Date(ts).toISOString();
    }
    if (to) {
      const ts = Number(to);
      if (!isNaN(ts)) toDate = new Date(ts).toISOString();
    }

    let baseQuery = db('transcriptions').where({ userId }).whereNull('deletedAt');

    if (projectId) baseQuery = baseQuery.where({ projectId });
    if (type) baseQuery = baseQuery.where({ type });
    if (status) baseQuery = baseQuery.where({ status });
    if (fromDate) baseQuery = baseQuery.where('createdAt', '>=', fromDate);
    if (toDate) baseQuery = baseQuery.where('createdAt', '<=', toDate);

    const totalResult = await baseQuery.clone().count('id as count');
    const total = Number(totalResult[0]?.count || 0);

    const transcriptions = await baseQuery
      .orderBy('createdAt', 'desc')
      .limit(Number(limit))
      .offset(skip);

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
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Récupérer une transcription par ID ----------
export const getTranscription = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const transcription = await db('transcriptions').where({ id, userId }).first();
    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription non trouvée' });

    return res.status(200).json({ success: true, data: transcription });
  } catch (error: any) {
    console.error('Erreur getTranscription:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Soft delete : mettre à la corbeille ----------
export const deleteTranscription = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const transcription = await db('transcriptions').where({ id, userId }).whereNull('deletedAt').first();
    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription non trouvée' });

    await db('transcriptions')
      .where({ id, userId })
      .update({ deletedAt: new Date().toISOString() });

    console.log(`🗑️ Transcription déplacée à la corbeille : ${id}`);

    emitGlobal('transcription-trashed', {
      projectId: transcription.projectId,
      id,
      title: transcription.title,
    });

    await logActivity({
      projectId: transcription.projectId,
      userId,
      userName,
      action: 'transcription-trashed',
      targetType: 'transcription',
      targetId: id,
      targetName: transcription.title,
    });

    return res.status(200).json({ success: true, message: 'Transcription déplacée à la corbeille' });
  } catch (error: any) {
    console.error('Erreur deleteTranscription:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Liste des transcriptions en corbeille ----------
export const getTrashedTranscriptions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.query;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    let query = db('transcriptions').where({ userId }).whereNotNull('deletedAt');
    if (projectId) query = query.where({ projectId });

    const trashed = await query.orderBy('deletedAt', 'desc');
    return res.status(200).json({ success: true, data: trashed });
  } catch (error) {
    console.error('Erreur getTrashedTranscriptions:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ---------- Restaurer une transcription ----------
export const restoreTranscription = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const transcription = await db('transcriptions')
      .where({ id, userId })
      .whereNotNull('deletedAt')
      .first();

    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription non trouvée dans la corbeille' });

    await db('transcriptions').where({ id, userId }).update({ deletedAt: null });

    console.log(`♻️ Transcription restaurée : ${id}`);

    emitGlobal('transcription-restored', {
      projectId: transcription.projectId,
      id,
      title: transcription.title,
    });

    await logActivity({
      projectId: transcription.projectId,
      userId,
      userName,
      action: 'transcription-restored',
      targetType: 'transcription',
      targetId: id,
      targetName: transcription.title,
    });

    return res.status(200).json({ success: true, message: 'Transcription restaurée' });
  } catch (error: any) {
    console.error('Erreur restoreTranscription:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Suppression définitive ----------
export const permanentlyDeleteTranscription = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { id } = req.params;

    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const transcription = await db('transcriptions').where({ id, userId }).first();
    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription non trouvée' });

    await db('document_entities').where({ documentId: id, documentType: 'transcription' }).delete();
    await db('document_summaries').where({ documentId: id, type: 'transcription' }).delete();
    await db('transcriptions').where({ id, userId }).delete();

    console.log(`💥 Transcription supprimée définitivement : ${id}`);

    emitGlobal('transcription-deleted-permanently', {
      projectId: transcription.projectId,
      id,
      title: transcription.title,
    });

    await logActivity({
      projectId: transcription.projectId,
      userId,
      userName,
      action: 'transcription-deleted-permanently',
      targetType: 'transcription',
      targetId: id,
      targetName: transcription.title,
    });

    return res.status(200).json({ success: true, message: 'Transcription supprimée définitivement' });
  } catch (error: any) {
    console.error('Erreur permanentlyDeleteTranscription:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Vider la corbeille des transcriptions ----------
export const emptyTrashTranscriptions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { projectId } = req.query;

    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    let query = db('transcriptions').where({ userId }).whereNotNull('deletedAt');
    if (projectId) query = query.where({ projectId });

    const trashed = await query;
    if (trashed.length === 0) {
      return res.json({ success: true, count: 0, message: 'Corbeille déjà vide' });
    }

    let deletedCount = 0;
    for (const t of trashed) {
      try {
        await db('document_entities').where({ documentId: t.id, documentType: 'transcription' }).delete();
        await db('document_summaries').where({ documentId: t.id, type: 'transcription' }).delete();
        await db('transcriptions').where({ id: t.id }).delete();
        deletedCount++;
      } catch (err: any) {
        console.error(`⚠️ Échec suppression ${t.id}:`, err.message);
      }
    }

    console.log(`💥 Corbeille vidée : ${deletedCount} transcription(s)`);

    emitGlobal('trash-emptied', { projectId, type: 'transcriptions', count: deletedCount });

    await logActivity({
      projectId: (projectId as string) || '',
      userId,
      userName,
      action: 'trash-emptied',
      targetType: 'transcription',
      metadata: { count: deletedCount },
    });

    return res.json({
      success: true,
      count: deletedCount,
      message: `${deletedCount} transcription(s) supprimée(s) définitivement`,
    });
  } catch (error: any) {
    console.error('Erreur emptyTrashTranscriptions:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// ---------- Progression ----------
export const getTranscriptionProgress = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Non authentifié' });

    const transcription = await db('transcriptions').where({ id, userId }).first();
    if (!transcription) return res.status(404).json({ success: false, message: 'Transcription non trouvée' });

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
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
