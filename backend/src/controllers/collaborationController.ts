import { Request, Response } from 'express';
import { db } from '../db/knex';

// Types pour les rôles
const ProjectRole = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
  MEMBER: 'MEMBER'
};

// Créer un document collaboratif
export const createDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { title, projectId, content } = req.body;

    if (!title || !title.trim() || !projectId) {
      return res.status(400).json({ success: false, message: 'Le titre et le projet sont requis' });
    }

    // Vérifier que l'utilisateur est membre du projet
    const member = await db('project_members')
      .where({ projectId, userId })
      .first();

    if (!member) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    const id = Date.now().toString();
    await db('collaboration_documents').insert({
      id,
      title: title.trim(),
      content: content || '',
      projectId,
      createdBy: userId,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const document = await db('collaboration_documents').where({ id }).first();

    return res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer les documents d'un projet
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const { projectId } = req.params;

    const documents = await db('collaboration_documents')
      .where({ projectId })
      .orderBy('updatedAt', 'desc')
      .select('*');

    return res.status(200).json({ success: true, data: documents });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Récupérer un document par ID
export const getDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const document = await db('collaboration_documents')
      .where({ id })
      .first();

    if (!document) {
      return res.status(404).json({ success: false, message: 'Document non trouvé' });
    }

    return res.status(200).json({ success: true, data: document });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};

// Supprimer un document
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Non authentifié' });
    }

    const document = await db('collaboration_documents')
      .where({ id, createdBy: userId })
      .first();

    if (!document) {
      return res.status(403).json({ success: false, message: 'Non autorisé' });
    }

    await db('collaboration_documents').where({ id }).delete();

    return res.status(200).json({ success: true, message: 'Document supprimé' });
  } catch (error: any) {
    console.error('Error:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: error.message });
  }
};
