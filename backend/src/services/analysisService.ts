// backend/src/services/analysisService.ts
import { db } from '../db/knex';
import { extractText, extractTextFromUrl } from './textExtractor';
import { getProjectEntities } from './entityExtractor';
import fs from 'fs';
import path from 'path';

/**
 * Analyse un document (transcription, memo ou fichier)
 */
export const getDocumentAnalysis = async (
  documentId: string,
  type: string,
  userId: string
): Promise<any> => {
  let text = '';

  if (type === 'transcription') {
    const doc = await db('transcriptions').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Document non trouvé');
    text = doc.transcriptText || '';
  } else if (type === 'memo') {
    const doc = await db('memos').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Memo non trouvé');
    text = doc.content || '';
  } else if (type === 'file') {
    const doc = await db('project_files').where({ id: documentId, userId }).first();
    if (!doc) throw new Error('Fichier non trouvé');

    // ✅ Support Cloudinary
    if (doc.filePath && doc.filePath.startsWith('http')) {
      text = await extractTextFromUrl(doc.filePath, doc.mimeType);
    } else {
      const filePath = path.join(__dirname, '../../', doc.filePath);
      if (!fs.existsSync(filePath)) throw new Error('Fichier physique introuvable');
      text = await extractText(filePath, doc.mimeType);
    }
  } else {
    throw new Error('Type de document inconnu');
  }

  if (!text || text.trim().length < 50) {
    return { message: 'Texte trop court pour une analyse.' };
  }

  // Statistiques simples
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.length || 0;

  return {
    documentId,
    type,
    wordCount,
    charCount,
    sentences,
    text: text.substring(0, 500), // Extrait
  };
};

/**
 * Analyse un projet complet (entités, statistiques globales)
 */
export const getProjectAnalysis = async (projectId: string, userId: string) => {
  console.log(`🔍 Analyse du projet ${projectId}`);

  // Récupérer les entités du projet via entityExtractor
  const entities = await getProjectEntities(projectId, userId);

  // Compter le total d'entités
  const totalEntities = Object.values(entities).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  // Récupérer les statistiques de tous les documents du projet (optionnel)
  // On peut ajouter d'autres métriques ici

  return {
    projectId,
    totalEntities,
    entities,
    message: 'Analyse du projet terminée avec succès',
  };
};
