// backend/src/services/analysisService.ts
import { db } from '../db/knex';
import { extractText, extractTextFromUrl } from './textExtractor';
import { getProjectEntities } from './entityExtractor';
import fs from 'fs';
import path from 'path';

/**
 * Extrait les mots d'un texte, nettoie et retourne les fréquences
 */
function getWordFrequencies(text: string): Map<string, number> {
  const words = text.toLowerCase().match(/[a-zàâäéèêëîïôöùûüÿç']+/g) || [];
  const freq = new Map<string, number>();
  for (const w of words) {
    if (w.length > 2) { // ignorer les mots trop courts
      freq.set(w, (freq.get(w) || 0) + 1);
    }
  }
  return freq;
}

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

  // Log du texte extrait (pour déboguer)
  console.log(`📝 [analysis] Texte extrait pour ${documentId} : ${text?.length || 0} caractères`);

  if (!text || text.trim().length < 50) {
    return { message: 'Texte trop court pour une analyse.', totalWords: 0, uniqueWords: 0, topKeywords: [], wordCloud: [] };
  }

  // Statistiques
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.length || 0;

  // Fréquence des mots
  const freq = getWordFrequencies(text);
  const uniqueWords = freq.size;

  // Top keywords (20 premiers)
  const topKeywords = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // WordCloud (50 mots pour le nuage)
  const wordCloud = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  return {
    documentId,
    type,
    totalWords: wordCount,
    uniqueWords,
    topKeywords,
    wordCloud,
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

  const entities = await getProjectEntities(projectId, userId);

  const totalEntities = Object.values(entities).reduce(
    (acc, arr) => acc + arr.length,
    0
  );

  return {
    projectId,
    totalEntities,
    entities,
    message: 'Analyse du projet terminée avec succès',
  };
};
