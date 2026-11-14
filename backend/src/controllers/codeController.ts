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

// ✅ Récupérer tous les codes agrégés d'un projet (avec compte d'occurrences)
export const getProjectCodes = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    // Vérifier que l'utilisateur est membre du projet
    const isMember = await db('project_members').where({ projectId, userId }).first();
    if (!isMember) return res.status(403).json({ error: 'Accès non autorisé' });

    // Récupérer tous les segments codés du projet (tous documents confondus)
    // On joint avec les transcriptions pour ne garder que celles du projet
    const segments = await db('coded_segments')
      .join('transcriptions', 'coded_segments.document_id', 'transcriptions.id')
      .where('transcriptions.projectId', projectId)
      .where('coded_segments.document_type', 'transcription')
      .select(
        'coded_segments.id',
        'coded_segments.code_name',
        'coded_segments.color',
        'coded_segments.document_id',
        'coded_segments.start_offset',
        'coded_segments.end_offset',
        'coded_segments.selected_text'
      );

    // Agréger par nom de code
    const aggregated: Record<string, { name: string; color: string; count: number; segments: any[] }> = {};
    segments.forEach((seg) => {
      if (!aggregated[seg.code_name]) {
        aggregated[seg.code_name] = { name: seg.code_name, color: seg.color, count: 0, segments: [] };
      }
      aggregated[seg.code_name].count++;
      aggregated[seg.code_name].segments.push(seg);
    });

    const codes = Object.values(aggregated).sort((a, b) => b.count - a.count);

    return res.json({ success: true, codes });
  } catch (error: any) {
    console.error('Erreur getProjectCodes:', error);
    return res.status(500).json({ error: error.message });
  }
};
