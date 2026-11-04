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
  type: 'transcription' | 'memo' | 'file',
  userId: string
) => {
  let text = '';
  let title = '';

  if (type === 'transcription') {
    // ✅ On essaie avec l'ID exact d'abord
    let doc = await db('transcriptions').where({ id: documentId }).first();
    
    // ✅ Si pas trouvé, on tente avec la transcription qui a le même prefix
    if (!doc) {
      doc = await db('transcriptions').where('id', 'like', `${documentId}%`).first();
    }
    
    if (!doc) {
      throw new Error(`Transcription "${documentId}" introuvable.`);
    }
    
    // ✅ Vérifier l'accès
    const isOwner = doc.userId === userId;
    const isMember = doc.projectId && await db('project_members')
      .where({ projectId: doc.projectId, userId })
      .first();
      
    if (!isOwner && !isMember) {
      throw new Error(`Vous n'avez pas accès à cette transcription.`);
    }
    
    text = doc.transcriptText || '';
    title = doc.title;
  } else if (type === 'memo') {
    // ... même logique
  }

  if (!text || text.trim().length < 10) {
    throw new Error(`Le document "${title}" est vide ou trop court pour être analysé.`);
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
