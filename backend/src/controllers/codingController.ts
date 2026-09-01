import { Request, Response } from 'express';
import { db } from '../db/knex';

// Types
type Code = {
  id: string;
  name: string;
  description?: string;
  color?: string;
  projectId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

type DocumentType = 'transcription' | 'file' | 'memo';

// ====== CRUD Codes ======

// Récupérer tous les codes d'un projet
export const getCodes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId est requis' });
    }

    const codes = await db('codes')
      .where({ projectId, userId })
      .orderBy('name', 'asc')
      .select('*');

    res.json({ success: true, data: codes });
  } catch (error: any) {
    console.error('Erreur getCodes:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Créer un nouveau code
export const createCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;
    const { name, description, color } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId est requis' });
    }
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Le nom du code est requis (2 caractères min)' });
    }

    // Vérifier si le code existe déjà dans le projet
    const existing = await db('codes')
      .where({ projectId, userId, name: name.trim() })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Un code avec ce nom existe déjà dans ce projet' });
    }

    const id = Date.now().toString();
    const newCode = {
      id,
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#4A6CF7',
      projectId,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db('codes').insert(newCode);

    res.status(201).json({ success: true, data: newCode });
  } catch (error: any) {
    console.error('Erreur createCode:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Mettre à jour un code
export const updateCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, codeId } = req.params;
    const { name, description, color } = req.body;

    const code = await db('codes')
      .where({ id: codeId, projectId, userId })
      .first();

    if (!code) {
      return res.status(404).json({ error: 'Code non trouvé ou non autorisé' });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (color !== undefined) updates.color = color;
    updates.updatedAt = Date.now();

    await db('codes')
      .where({ id: codeId })
      .update(updates);

    const updated = await db('codes').where({ id: codeId }).first();
    res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Erreur updateCode:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Supprimer un code (et ses associations)
export const deleteCode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, codeId } = req.params;

    const code = await db('codes')
      .where({ id: codeId, projectId, userId })
      .first();

    if (!code) {
      return res.status(404).json({ error: 'Code non trouvé ou non autorisé' });
    }

    // Supprimer les associations
    await db('document_codes').where({ codeId }).delete();

    // Supprimer le code
    await db('codes').where({ id: codeId }).delete();

    res.json({ success: true, message: 'Code supprimé' });
  } catch (error: any) {
    console.error('Erreur deleteCode:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// ====== Association codes ↔ documents ======

// Assigner un code à un document
export const assignCodeToDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId } = req.params;
    const { codeId, documentType, startPosition, endPosition, comment } = req.body;

    if (!codeId || !documentType) {
      return res.status(400).json({ error: 'codeId et documentType sont requis' });
    }

    // Vérifier que le code existe et appartient à l'utilisateur
    const code = await db('codes')
      .where({ id: codeId, userId })
      .first();

    if (!code) {
      return res.status(404).json({ error: 'Code non trouvé ou non autorisé' });
    }

    // Vérifier que le document existe (selon son type)
    let doc;
    if (documentType === 'transcription') {
      doc = await db('transcriptions').where({ id: documentId, userId }).first();
    } else if (documentType === 'memo') {
      doc = await db('memos').where({ id: documentId, userId }).first();
    } else if (documentType === 'file') {
      doc = await db('project_files').where({ id: documentId, userId }).first();
    } else {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé ou non autorisé' });
    }

    // Vérifier si l'association existe déjà
    const existing = await db('document_codes')
      .where({ documentId, codeId, documentType })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Ce code est déjà assigné à ce document' });
    }

    const id = Date.now().toString() + '-' + Math.random().toString(36).substring(7);
    const association = {
      id,
      documentId,
      codeId,
      documentType,
      startPosition: startPosition || null,
      endPosition: endPosition || null,
      comment: comment || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db('document_codes').insert(association);

    res.status(201).json({ success: true, data: association });
  } catch (error: any) {
    console.error('Erreur assignCodeToDocument:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Retirer un code d'un document
export const removeCodeFromDocument = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId, codeId } = req.params;
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({ error: 'documentType est requis' });
    }

    // Vérifier que le code appartient à l'utilisateur
    const code = await db('codes')
      .where({ id: codeId, userId })
      .first();

    if (!code) {
      return res.status(404).json({ error: 'Code non trouvé ou non autorisé' });
    }

    const deleted = await db('document_codes')
      .where({ documentId, codeId, documentType })
      .delete();

    if (deleted === 0) {
      return res.status(404).json({ error: 'Association non trouvée' });
    }

    res.json({ success: true, message: 'Code retiré du document' });
  } catch (error: any) {
    console.error('Erreur removeCodeFromDocument:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Récupérer tous les codes assignés à un document
export const getDocumentCodes = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId } = req.params;
    const { documentType } = req.query;

    if (!documentType) {
      return res.status(400).json({ error: 'documentType est requis' });
    }

    // Vérifier que le document appartient à l'utilisateur
    let doc;
    if (documentType === 'transcription') {
      doc = await db('transcriptions').where({ id: documentId, userId }).first();
    } else if (documentType === 'memo') {
      doc = await db('memos').where({ id: documentId, userId }).first();
    } else if (documentType === 'file') {
      doc = await db('project_files').where({ id: documentId, userId }).first();
    } else {
      return res.status(400).json({ error: 'Type de document invalide' });
    }

    if (!doc) {
      return res.status(404).json({ error: 'Document non trouvé ou non autorisé' });
    }

    const associations = await db('document_codes')
      .join('codes', 'document_codes.codeId', 'codes.id')
      .where({
        'document_codes.documentId': documentId,
        'document_codes.documentType': documentType,
      })
      .select(
        'document_codes.*',
        'codes.name as codeName',
        'codes.description as codeDescription',
        'codes.color as codeColor'
      )
      .orderBy('codes.name', 'asc');

    res.json({ success: true, data: associations });
  } catch (error: any) {
    console.error('Erreur getDocumentCodes:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};

// Récupérer tous les codes d'un projet avec leur fréquence d'utilisation
export const getCodeFrequencies = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId } = req.params;

    const codes = await db('codes')
      .leftJoin('document_codes', 'codes.id', 'document_codes.codeId')
      .where({ 'codes.projectId': projectId, 'codes.userId': userId })
      .groupBy('codes.id')
      .select(
        'codes.*',
        db.raw('COUNT(document_codes.id) as usageCount')
      )
      .orderBy('usageCount', 'desc');

    res.json({ success: true, data: codes });
  } catch (error: any) {
    console.error('Erreur getCodeFrequencies:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
};
