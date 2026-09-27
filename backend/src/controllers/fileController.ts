// backend/src/controllers/fileController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db/knex';
import { deleteFromCloudinary } from '../services/cloudinaryService';
import { emitGlobal } from '../socketManager';
import { logActivity } from '../services/activityService';
import { logger } from '../utils/logger';
import { getFilePreview, getFileTextForTranslation } from '../services/filePreviewService';
import { saveFileEdit, getFileVersions } from '../services/fileEditService';
import { restoreFileVersion } from '../services/fileEditService';

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

// ============================================================
// ✅ Helper : vérifier que l'user est membre du projet
// ============================================================
const isProjectMember = async (projectId: string, userId: string): Promise<boolean> => {
  const member = await db('project_members')
    .where({ projectId, userId })
    .first();
  return !!member;
};

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
      // ✅ Vérifier que l'user est membre du projet
      if (!(await isProjectMember(projectId, userId))) {
        return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
      }

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

      // ✅ Socket.IO — avec actorId pour filtrer
      emitGlobal('file-uploaded', {
        projectId,
        file: inserted,
        actorId: userId,
        actorName: userName,
        timestamp: new Date().toISOString(),
      });

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

    // ✅ Vérifier que l'user est membre du projet
    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : récupérer TOUS les fichiers du projet (pas juste ceux de l'user)
    const files = await db('project_files')
      .where({ projectId })
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

    // ✅ Vérifier que l'user est membre du projet
    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : n'importe quel membre peut supprimer (plus de filtre userId)
    const file = await db('project_files')
      .where({ id: fileId, projectId })
      .whereNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé' });

    await db('project_files').where({ id: fileId }).update({ deletedAt: Date.now() });

    emitGlobal('file-trashed', {
      projectId,
      fileId,
      fileName: file.fileName,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

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

    // ✅ Vérifier que l'user est membre du projet
    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : toute la corbeille du projet
    const files = await db('project_files')
      .where({ projectId })
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

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : n'importe quel membre peut restaurer
    const file = await db('project_files')
      .where({ id: fileId, projectId })
      .whereNotNull('deletedAt')
      .first();

    if (!file) return res.status(404).json({ error: 'Fichier non trouvé dans la corbeille' });

    await db('project_files').where({ id: fileId }).update({ deletedAt: null });

    emitGlobal('file-restored', {
      projectId,
      fileId,
      fileName: file.fileName,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

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

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : n'importe quel membre peut supprimer définitivement
    const file = await db('project_files').where({ id: fileId, projectId }).first();
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

    emitGlobal('file-deleted-permanently', {
      projectId,
      fileId,
      fileName: file.fileName,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

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

    if (!(await isProjectMember(projectId, userId))) {
      return res.status(403).json({ error: 'Vous n\'êtes pas membre de ce projet' });
    }

    // ✅ FIX : vide TOUTE la corbeille du projet
    const trashedFiles = await db('project_files')
      .where({ projectId })
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

    emitGlobal('trash-emptied', {
      projectId,
      type: 'files',
      count: deletedCount,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

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

export const previewFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const preview = await getFilePreview(fileId, userId);
    if (!preview) return res.status(404).json({ error: 'Fichier non trouvé ou accès refusé' });

    res.json({ success: true, preview });
  } catch (err: any) {
    logger.error(`❌ [preview] ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ============================================================
// ✅ ÉDITER
// ============================================================
export const editFile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId } = req.params;
    const { content, format } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Contenu requis' });
    }
    if (!['html', 'text'].includes(format)) {
      return res.status(400).json({ error: 'Format invalide (html | text)' });
    }

    const result = await saveFileEdit({
      fileId,
      userId,
      newContent: content,
      editFormat: format,
    });

    const userName = (req as any).user?.name || (req as any).user?.email || 'Utilisateur';

    emitGlobal('file-edited', {
      projectId,
      fileId,
      version: result.version,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'file-edited',
      targetType: 'file',
      targetId: fileId,
      targetName: `v${result.version}`,
    });

    res.json({ success: true, version: result.version, filePath: result.filePath });
  } catch (err: any) {
    logger.error(`❌ [edit] ${err.message}`);
    const status = err.message.includes('non autorisé') ? 403
      : err.message.includes('non supportée') ? 400
      : err.message.includes('non trouvé') ? 404
      : 500;
    res.status(status).json({ error: err.message });
  }
};

// ============================================================
// ✅ LISTER LES VERSIONS
// ============================================================
export const listFileVersions = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const versions = await getFileVersions(fileId, userId);
    res.json({ success: true, versions });
  } catch (err: any) {
    const status = err.message.includes('non autorisé') ? 403 : 500;
    res.status(status).json({ error: err.message });
  }
};

// ============================================================
// ✅ TEXTE POUR TRADUCTION
// ============================================================
export const getFileText = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { fileId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const text = await getFileTextForTranslation(fileId, userId);
    res.json({ success: true, text, length: text.length });
  } catch (err: any) {
    const status = err.message.includes('autorisé') ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
};

// ============================================================
// ✅ RESTAURER UNE VERSION
// ============================================================
export const restoreVersion = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, fileId, version } = req.params;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const versionNum = Number(version);
    if (!versionNum || isNaN(versionNum) || versionNum < 1) {
      return res.status(400).json({ error: 'Numéro de version invalide' });
    }

    const result = await restoreFileVersion(fileId, versionNum, userId);

    const userName = (req as any).user?.name || (req as any).user?.email || 'Utilisateur';

    emitGlobal('file-restored-version', {
      projectId,
      fileId,
      newVersion: result.version,
      restoredFrom: versionNum,
      actorId: userId,
      actorName: userName,
      timestamp: new Date().toISOString(),
    });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'file-version-restored',
      targetType: 'file',
      targetId: fileId,
      targetName: `v${versionNum} → v${result.version}`,
    });

    res.json({
      success: true,
      version: result.version,
      restoredFrom: versionNum,
      filePath: result.filePath,
    });
  } catch (err: any) {
    logger.error(`❌ [restore-version] ${err.message}`);
    const status = err.message.includes('autorisé') ? 403
      : err.message.includes('introuvable') ? 404
      : err.message.includes('déjà') ? 400
      : 500;
    res.status(status).json({ error: err.message });
  }
};
