// backend/src/controllers/codeController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { generateThematicAnalysis } from '../services/thematicAnalysisService';

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

// ✅ Calculer la matrice de co-occurrence des codes d'un projet
export const getCooccurrenceMatrix = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const isMember = await db('project_members').where({ projectId, userId }).first();
    if (!isMember) return res.status(403).json({ error: 'Accès non autorisé' });

    // Récupérer tous les segments codés du projet (avec document_id)
    const segments = await db('coded_segments')
      .join('transcriptions', 'coded_segments.document_id', 'transcriptions.id')
      .where('transcriptions.projectId', projectId)
      .where('coded_segments.document_type', 'transcription')
      .select('coded_segments.code_name', 'coded_segments.document_id');

    // 1. Lister tous les codes uniques
    const codesSet = new Set<string>();
    segments.forEach(s => codesSet.add(s.code_name));
    const codes = Array.from(codesSet).sort();

    // 2. Construire un dictionnaire : pour chaque document, quels codes y sont présents ?
    const docCodes: Record<string, Set<string>> = {};
    segments.forEach(seg => {
      if (!docCodes[seg.document_id]) docCodes[seg.document_id] = new Set();
      docCodes[seg.document_id].add(seg.code_name);
    });

    // 3. Calculer la matrice
    const matrix: Record<string, Record<string, number>> = {};
    codes.forEach(codeA => {
      matrix[codeA] = {};
      codes.forEach(codeB => {
        matrix[codeA][codeB] = 0;
      });
    });

    Object.values(docCodes).forEach(codeSetInDoc => {
      codes.forEach(codeA => {
        if (!codeSetInDoc.has(codeA)) return;
        codes.forEach(codeB => {
          if (codeSetInDoc.has(codeB)) {
            matrix[codeA][codeB]++;
          }
        });
      });
    });

    return res.json({ success: true, codes, matrix });
  } catch (error: any) {
    console.error('Erreur getCooccurrenceMatrix:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Récupérer les mémos d'un code
export const getCodeMemos = async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const { projectId, codeName } = req.query;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    // ✅ Nettoyage du codeName (trim + lowercase pour éviter les mismatch de casse)
    const cleanCodeName = String(codeName || '').trim();
    const cleanProjectId = String(projectId || '').trim();

    // ✅ Requête SANS filtre sur code_name d'abord, pour voir tout ce qui existe
    const allMemos = await db('code_memos')
      .where({ project_id: cleanProjectId })
      .orderBy('created_at', 'desc');

    // ✅ Filtrage en JS (robuste aux espaces/casse)
    const memos = allMemos.filter(
      m => String(m.code_name).trim().toLowerCase() === cleanCodeName.toLowerCase()
    );

    return res.json({ success: true, memos });
  } catch (error: any) {
    console.error('Erreur getCodeMemos:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Ajouter un mémo à un code
export const addCodeMemo = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { projectId, codeName, content } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu requis' });
    if (!projectId) return res.status(400).json({ error: 'projectId requis' });
    if (!codeName) return res.status(400).json({ error: 'codeName requis' });

    const id = Date.now().toString();
    const cleanCodeName = String(codeName).trim();
    const cleanProjectId = String(projectId).trim();

    await db('code_memos').insert({
      id,
      project_id: cleanProjectId,
      code_name: cleanCodeName,
      user_id: userId,
      content: content.trim(),
    });

    return res.status(201).json({ success: true, id });
  } catch (error: any) {
    console.error('Erreur addCodeMemo:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Supprimer un mémo
export const deleteCodeMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    await db('code_memos').where({ id, user_id: userId }).delete();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Générer l'analyse thématique automatique
export const generateProjectThematicAnalysis = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    // Vérifier l'accès
    const isMember = await db('project_members').where({ projectId, userId }).first();
    if (!isMember) return res.status(403).json({ error: 'Accès non autorisé' });

    // 1. Récupérer les codes du projet
    const segments = await db('coded_segments')
      .join('transcriptions', 'coded_segments.document_id', 'transcriptions.id')
      .where('transcriptions.projectId', projectId)
      .where('coded_segments.document_type', 'transcription')
      .select('coded_segments.code_name');

    const codesCount: Record<string, number> = {};
    segments.forEach((s) => {
      codesCount[s.code_name] = (codesCount[s.code_name] || 0) + 1;
    });

    if (Object.keys(codesCount).length < 2) {
      return res.status(400).json({ 
        error: 'Il faut au moins 2 codes pour générer une analyse thématique.' 
      });
    }

    // 2. Récupérer les notes analytiques de chaque code
    const memos = await db('code_memos').where({ project_id: projectId });

    const codesWithNotes = Object.entries(codesCount).map(([name, count]) => ({
      name,
      count,
      notes: memos.filter((m) => m.code_name === name).map((m) => m.content),
    }));

    // 3. Appeler DeepSeek
    console.log(`🤖 [thematic] Génération pour ${codesWithNotes.length} codes...`);
    const themes = await generateThematicAnalysis(codesWithNotes);

    return res.json({ success: true, themes });
  } catch (error: any) {
    console.error('Erreur generateProjectThematicAnalysis:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ✅ Modifier un mémo
export const updateCodeMemo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!content || !content.trim()) return res.status(400).json({ error: 'Contenu requis' });

    const updated = await db('code_memos')
      .where({ id, user_id: userId })
      .update({ content: content.trim() });

    if (updated === 0) return res.status(404).json({ error: 'Note non trouvée ou non autorisée' });

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
