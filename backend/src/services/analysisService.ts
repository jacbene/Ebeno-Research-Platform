// backend/src/services/analysisService.ts
import { db } from '../db/knex';
import { extractTextFromUrl, extractTextFromBuffer } from './textExtractor';
import { logger } from '../utils/logger';
import { checkAndIncrementAiQuota } from './aiQuotaService';
import path from 'path';
import fs from 'fs';

// ✅ Liste des stop words en français (pour filtrer les mots-clés)
const STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'et', 'ou', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'sans', 'par', 'chez', 'entre', 'avant', 'après', 'pendant', 'depuis', 'dont', 'où', 'lui', 'elle', 'nous', 'vous', 'ils', 'elles', 'même', 'très', 'plus', 'moins', 'aussi', 'encore', 'toujours', 'jamais', 'alors', 'ainsi', 'donc', 'enfin', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'le', 'la', 'les', 'lui', 'leur', 'y', 'en', 'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'ma', 'ta', 'sa', 'nos', 'vos', 'leurs',
  'dans', 'hors', 'avec', 'sans', 'par', 'pour', 'chez', 'entre', 'en', 'à', 'au', 'aux', 'du', 'des',
  'est', 'sont', 'était', 'étaient', 'sera', 'seront', 'être', 'avoir', 'faire', 'dire', 'voir', 'vouloir',
  'un', 'une', 'des', 'ce', 'cet', 'cette', 'ces',
  'http', 'https', 'href', 'www', 'com', 'org', 'net', 'html', 'php', 'asp', 'css', 'js',
  'div', 'span', 'class', 'id', 'img', 'src', 'url', 'link', 'false', 'true', 'null', 'undefined',
]);

// ✅ Fonction utilitaire pour analyser un texte
const analyzeTextContent = (text: string) => {
  // 1. Nettoyage et tokenisation
  const words = text.toLowerCase().match(/[a-zàâäéèêëîïôöùûüÿç']+/g) || [];
  
  // 2. Filtrage des stop words et des mots trop courts
  const filteredWords = words.filter(w => w.length > 3 && !STOP_WORDS.has(w));
  const totalWords = words.length;
  const uniqueWords = new Set(filteredWords).size;

  // 3. Calcul des fréquences
  const freq: Record<string, number> = {};
  filteredWords.forEach(word => {
    freq[word] = (freq[word] || 0) + 1;
  });

  // 4. Top Keywords (les 20 plus fréquents)
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  // 5. Nuage de mots (les 50 plus fréquents)
  const wordCloud = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([text, value]) => ({ text, value }));

  return {
    totalWords,
    uniqueWords,
    topKeywords,
    wordCloud,
  };
};

/**
 * ✅ Analyse d'un document spécifique (transcription, memo ou file)
 */
export const getDocumentAnalysis = async (
  documentId: string,
  type: 'transcription' | 'memo' | 'file',
  userId: string
) => {
  let text = '';
  let title = '';

  // 1. Récupérer le document et vérifier l'accès
  if (type === 'transcription') {
    let doc = await db('transcriptions').where({ id: documentId }).first();
    if (!doc) {
      // Fallback: recherche par préfixe (au cas où l'ID a un suffixe)
      doc = await db('transcriptions').where('id', 'like', `${documentId}%`).first();
    }
    if (!doc) throw new Error(`Transcription "${documentId}" introuvable.`);
    
    // Vérification d'accès (owner ou membre du projet)
    const isOwner = doc.userId === userId;
    const isMember = doc.projectId && await db('project_members').where({ projectId: doc.projectId, userId }).first();
    if (!isOwner && !isMember) throw new Error('Vous n\'avez pas accès à cette transcription.');

    text = doc.transcriptText || '';
    title = doc.title;

  } else if (type === 'memo') {
    let doc = await db('memos').where({ id: documentId }).first();
    if (!doc) {
      doc = await db('memos').where('id', 'like', `${documentId}%`).first();
    }
    if (!doc) throw new Error(`Mémo "${documentId}" introuvable.`);

    const isOwner = doc.userId === userId;
    const isMember = doc.projectId && await db('project_members').where({ projectId: doc.projectId, userId }).first();
    if (!isOwner && !isMember) throw new Error('Vous n\'avez pas accès à ce mémo.');

    text = doc.content || '';
    title = doc.title;

  } else if (type === 'file') {
    let doc = await db('project_files').where({ id: documentId }).first();
    if (!doc) {
      doc = await db('project_files').where('id', 'like', `${documentId}%`).first();
    }
    if (!doc) throw new Error(`Fichier "${documentId}" introuvable.`);

    // Vérification d'accès (membre du projet)
    const isMember = await db('project_members').where({ projectId: doc.projectId, userId }).first();
    if (!isMember) throw new Error('Vous n\'avez pas accès à ce fichier.');

    title = doc.fileName;

    // ✅ NOUVEAU : Utilisation de extractedText (pour les PDF générés)
    if (doc.extractedText && doc.extractedText.trim().length > 0) {
      text = doc.extractedText;
      logger.info(`📝 [analysis] Utilisation du texte extrait (${text.length} caractères) pour le fichier ${documentId}`);
    } 
    // Fallback : Extraction classique depuis Cloudinary ou local
    else if (doc.filePath && doc.filePath.startsWith('http')) {
      logger.info(`📂 [analysis] Téléchargement depuis Cloudinary : ${doc.filePath}`);
      text = await extractTextFromUrl(doc.filePath, doc.mimeType);
    } else {
      const filePath = path.join(__dirname, '../../', doc.filePath);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier physique introuvable : ${filePath}`);
      }
      const buffer = await fs.promises.readFile(filePath);
      text = await extractTextFromBuffer(buffer, doc.mimeType);
    }
  }

  // 2. Vérifier que le texte n'est pas vide
  if (!text || text.trim().length < 50) {
    throw new Error(`Le document "${title}" est vide ou trop court pour être analysé (50 caractères minimum).`);
  }

  // 3. Vérifier le quota IA
  const quota = await checkAndIncrementAiQuota(userId);
  if (!quota.allowed) {
    const err: any = new Error(quota.message);
    err.code = 'QUOTA_EXCEEDED';
    err.limit = quota.limit;
    err.used = quota.used;
    throw err;
  }

  // 4. Analyse
  logger.info(`📊 [analysis] Analyse du document ${documentId} (${text.length} caractères)`);
  const result = analyzeTextContent(text);

  return {
    ...result,
    documentId,
    title,
    type,
    quota: { used: quota.used, limit: quota.limit },
  };
};

/**
 * ✅ Analyse agrégée de tous les documents d'un projet
 */
export const getProjectAnalysis = async (projectId: string, userId: string) => {
  // 1. Vérifier l'accès au projet
  const isMember = await db('project_members').where({ projectId, userId }).first();
  if (!isMember) throw new Error('Vous n\'avez pas accès à ce projet.');

  let allText = '';

  // 2. Récupérer tous les textes
  const transcriptions = await db('transcriptions').where({ projectId }).select('transcriptText');
  const memos = await db('memos').where({ projectId }).select('content');
  const files = await db('project_files').where({ projectId }).select('filePath', 'mimeType', 'extractedText');

  transcriptions.forEach(t => { if (t.transcriptText) allText += ' ' + t.transcriptText; });
  memos.forEach(m => { if (m.content) allText += ' ' + m.content; });

  // 3. Traitement des fichiers
  for (const f of files) {
    // Priorité au texte extrait
    if (f.extractedText && f.extractedText.trim().length > 0) {
      allText += ' ' + f.extractedText;
      continue;
    }

    // Fallback pour les fichiers natifs (PDF, DOCX, etc.)
    try {
      let text = '';
      if (f.filePath && f.filePath.startsWith('http')) {
        text = await extractTextFromUrl(f.filePath, f.mimeType);
      } else {
        const filePath = path.join(__dirname, '../../', f.filePath);
        if (fs.existsSync(filePath)) {
          const buffer = await fs.promises.readFile(filePath);
          text = await extractTextFromBuffer(buffer, f.mimeType);
        }
      }
      if (text && text.trim().length > 0) {
        allText += ' ' + text;
      }
    } catch (err: any) {
      logger.warn(`⚠️ [analysis] Fichier ignoré (${f.mimeType}): ${err.message}`);
    }
  }

  if (allText.trim().length < 50) {
    throw new Error('Pas assez de contenu pour analyser ce projet.');
  }

  // 4. Vérifier le quota IA
  const quota = await checkAndIncrementAiQuota(userId);
  if (!quota.allowed) {
    const err: any = new Error(quota.message);
    err.code = 'QUOTA_EXCEEDED';
    err.limit = quota.limit;
    err.used = quota.used;
    throw err;
  }

  // 5. Analyse globale
  logger.info(`📊 [analysis] Analyse globale du projet ${projectId} (${allText.length} caractères)`);
  const result = analyzeTextContent(allText);

  return {
    ...result,
    projectId,
    quota: { used: quota.used, limit: quota.limit },
  };
};
