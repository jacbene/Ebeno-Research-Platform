// backend/src/controllers/collaborationController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { emitGlobal } from '../socketManager';
import { logActivity } from '../services/activityService';

const ProjectRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
  MEMBER: 'MEMBER',
};

// ✅ ID unique
const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

// ============================================================
// CRÉER UN DOCUMENT COLLABORATIF
// ============================================================
export const createDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { title, projectId, content } = req.body;

    if (!title || !title.trim() || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Le titre et le projectId sont requis',
      });
    }

    const member = await db('project_members')
      .where({ projectId, userId })
      .first();

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas membre de ce projet',
      });
    }

    const id = generateId();
    const now = new Date().toISOString();

    await db('collaboration_documents').insert({
      id,
      title: title.trim(),
      content: content || '',
      projectId,
      createdBy: userId,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    const document = await db('collaboration_documents').where({ id }).first();

    emitGlobal('document-created', { projectId, document });

    await logActivity({
      projectId,
      userId,
      userName,
      action: 'document-created',
      targetType: 'document',
      targetId: id,
      targetName: title.trim(),
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    console.error('Error createDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

// ============================================================
// LISTER LES DOCUMENTS D'UN PROJET
// ============================================================
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { projectId } = req.params;

    const member = await db('project_members')
      .where({ projectId, userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const documents = await db('collaboration_documents')
      .where({ projectId })
      .orderBy('updatedAt', 'desc')
      .select('*');

    return res.status(200).json({ success: true, data: documents });
  } catch (error: any) {
    console.error('Error getDocuments:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

// ============================================================
// RÉCUPÉRER UN DOCUMENT PAR ID
// ============================================================
export const getDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const document = await db('collaboration_documents').where({ id }).first();

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    const member = await db('project_members')
      .where({ projectId: document.projectId, userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    return res.status(200).json({ success: true, data: document });
  } catch (error: any) {
    console.error('Error getDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

// ============================================================
// ✅ METTRE À JOUR LE TITRE D'UN DOCUMENT
// ============================================================
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { id } = req.params;
    const { title } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Le titre est requis' });
    }

    const document = await db('collaboration_documents').where({ id }).first();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    // ✅ Tout membre du projet peut renommer
    const member = await db('project_members')
      .where({ projectId: document.projectId, userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const now = new Date().toISOString();
    await db('collaboration_documents')
      .where({ id })
      .update({
        title: title.trim(),
        updatedAt: now,
      });

    const updated = await db('collaboration_documents').where({ id }).first();

    // 📡 Notifier les autres utilisateurs
    emitGlobal('document-updated-title', {
      projectId: document.projectId,
      documentId: id,
      newTitle: title.trim(),
      updatedBy: userId,
      updatedByName: userName,
    });

    await logActivity({
      projectId: document.projectId,
      userId,
      userName,
      action: 'document-renamed',
      targetType: 'document',
      targetId: id,
      targetName: title.trim(),
      metadata: { oldTitle: document.title, newTitle: title.trim() },
    });

    return res.status(200).json({ success: true, data: updated, message: 'Document renommé' });
  } catch (error: any) {
    console.error('Error updateDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};

// ============================================================
// SUPPRIMER UN DOCUMENT
// ============================================================
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?.id;
    const userName = user?.name || user?.email || 'Utilisateur';
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const document = await db('collaboration_documents').where({ id }).first();
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    if (document.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    await db('collaboration_documents').where({ id }).delete();

    emitGlobal('document-deleted', { projectId: document.projectId, id });

    await logActivity({
      projectId: document.projectId,
      userId,
      userName,
      action: 'document-deleted',
      targetType: 'document',
      targetId: id,
      targetName: document.title,
    });

    return res.status(200).json({ success: true, message: 'Document supprimé' });
  } catch (error: any) {
    console.error('Error deleteDocument:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    });
  }
};
