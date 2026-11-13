// backend/src/controllers/codeController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';

// ✅ Récupérer tous les segments codés d'un document
export const getCodedSegments = async (req: Request, res: Response) => {
  try {
    const { documentId, documentType } = req.params;
    const segments = await db('coded_segments')
      .where({ document_id: documentId, document_type: documentType })
      .orderBy('start_offset', 'asc');
    return res.json({ success: true, segments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Ajouter un nouveau segment codé
export const addCodedSegment = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { documentId, documentType, codeName, color, startOffset, endOffset, selectedText } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const id = Date.now().toString();
    await db('coded_segments').insert({
      id,
      document_id: documentId,
      document_type: documentType,
      user_id: userId,
      code_name: codeName,
      color: color || '#4A6CF7',
      start_offset: startOffset,
      end_offset: endOffset,
      selected_text: selectedText,
    });

    return res.status(201).json({ success: true, id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Supprimer un segment
export const deleteCodedSegment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    await db('coded_segments').where({ id, user_id: userId }).delete();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
