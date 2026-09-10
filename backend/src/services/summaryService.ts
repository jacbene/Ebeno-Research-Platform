// backend/src/services/summaryService.ts
import { db } from '../db/knex';
import { extractTextFromUrl, extractTextFromBuffer } from './textExtractor';
import fs from 'fs';
import path from 'path';

// Configuration Deepgram
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

/**
 * Résumé via Deepgram Text Intelligence (/v1/read)
 * Note : Deepgram ne supporte que l'anglais pour la summarization.
 */
const generateSummaryWithDeepgram = async (text: string): Promise<string> => {
  // Limiter la longueur pour éviter les dépassements
  const truncatedText = text.length > 100000 ? text.substring(0, 100000) + '...' : text;

  try {
    // ✅ Pas de paramètre language=fr (non supporté)
    const response = await fetch(
      'https://api.deepgram.com/v1/read?summarize=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: truncatedText }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur Deepgram:', response.status, errorText);
      throw new Error(`Erreur Deepgram: ${response.status}`);
    }

    // ✅ Typage any pour éviter l'erreur TS2339
    const data: any = await response.json();

    const summary = data?.results?.summary?.text;

    if (summary) {
      console.log(`✅ Résumé Deepgram généré : ${summary.length} caractères`);
      return summary;
    }

    console.warn('⚠️ Réponse Deepgram vide, fallback heuristique');
    return generateHeuristicSummary(truncatedText);
  } catch (error) {
    console.error('❌ Erreur Deepgram, fallback heuristique:', error);
    return generateHeuristicSummary(truncatedText);
  }
};

/**
 * Résumé heuristique (sans API) - fallback
 */
const generateHeuristicSummary = (text: string): string => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length <= 3) return text;

  const filtered = sentences.filter(s => s.trim().split(/\s+/).length > 5);
  if (filtered.length === 0) return text.substring(0, 500);

  const scored = filtered.map(sentence => {
    const words = sentence.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const uniqueWords = new Set(words);
    const score = (uniqueWords.size / words.length) * words.length;
    return { sentence, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const ordered = top.sort((a, b) =>
    text.indexOf(a.sentence) - text.indexOf(b.sentence)
  );

  return ordered.map(item => item.sentence.trim()).join(' ');
};

/**
 * Fonction de résumé principale (Deepgram si dispo, sinon heuristique)
 */
const generateSummary = async (text: string): Promise<string> => {
  if (DEEPGRAM_API_KEY) {
    return generateSummaryWithDeepgram(text);
  }
  console.log('⚠️ Deepgram non configuré, utilisation de l\'heuristique');
  return generateHeuristicSummary(text);
};

/**
 * Génère le résumé d'un document
 */
export const generateDocumentSummary = async (
  documentId: string,
  type: 'transcription' | 'memo' | 'file',
  userId: string
): Promise<string> => {
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

    if (doc.filePath && doc.filePath.startsWith('http')) {
      console.log(`📂 [summary] Téléchargement depuis Cloudinary : ${doc.filePath}`);
      text = await extractTextFromUrl(doc.filePath, doc.mimeType);
    } else {
      const filePath = path.join(__dirname, '../../', doc.filePath);
      console.log(`📂 [summary] Chemin local : ${filePath}`);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Fichier physique introuvable : ${filePath}`);
      }
      const buffer = await fs.promises.readFile(filePath);
      text = await extractTextFromBuffer(buffer, doc.mimeType);
    }
  } else {
    throw new Error('Type de document inconnu');
  }

  if (!text || text.trim().length < 50) {
    return 'Texte trop court pour générer un résumé.';
  }

  console.log(`📝 [summary] Texte extrait : ${text.length} caractères`);

  const summary = await generateSummary(text);

  const existing = await db('document_summaries')
    .where({ documentId, type })
    .first();

  if (existing) {
    await db('document_summaries')
      .where({ documentId, type })
      .update({
        summary,
        updatedAt: new Date().toISOString(),
      });
  } else {
    await db('document_summaries').insert({
      id: Date.now().toString(),
      documentId,
      type,
      summary,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return summary;
};

/**
 * Récupère un résumé existant
 */
export const getDocumentSummary = async (
  documentId: string,
  type: string
): Promise<string | null> => {
  const record = await db('document_summaries')
    .where({ documentId, type })
    .first();
  return record?.summary || null;
};

/**
 * Récupère les résumés d'un projet
 */
export const getProjectSummaries = async (
  projectId: string,
  userId: string
): Promise<any[]> => {
  const transcriptions = await db('transcriptions')
    .where({ projectId, userId })
    .select('id', 'title', 'type');
  const memos = await db('memos')
    .where({ projectId, userId })
    .select('id', 'title', db.raw("'memo' as type"));
  const files = await db('project_files')
    .where({ projectId, userId })
    .select('id', 'fileName as title', db.raw("'file' as type"));

  const allDocs = [...transcriptions, ...memos, ...files];

  const results = [];
  for (const doc of allDocs) {
    const summary = await getDocumentSummary(doc.id, doc.type);
    results.push({
      ...doc,
      hasSummary: !!summary,
      summary,
    });
  }

  return results;
};

/**
 * Résumé global d'un projet entier
 */
export const generateProjectSummary = async (
  projectId: string,
  userId: string
): Promise<string> => {
  console.log(`🔍 [summary] Résumé global du projet ${projectId}`);

  const transcriptions = await db('transcriptions')
    .where({ projectId, userId })
    .select('transcriptText');
  const memos = await db('memos')
    .where({ projectId, userId })
    .select('content');
  const files = await db('project_files')
    .where({ projectId, userId })
    .select('filePath', 'mimeType');

  let allText = '';

  transcriptions.forEach(t => {
    if (t.transcriptText) allText += ' ' + t.transcriptText;
  });
  memos.forEach(m => {
    if (m.content) allText += ' ' + m.content;
  });

  for (const f of files) {
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
      if (text) allText += ' ' + text;
    } catch (err: any) {
      console.warn(`⚠️ Fichier ignoré : ${err.message}`);
    }
  }

  if (allText.trim().length < 200) {
    return 'Pas assez de contenu pour générer un résumé de projet.';
  }

  console.log(`📝 [summary] Texte total collecté : ${allText.length} caractères`);

  const summary = await generateSummary(allText);
  return summary;
};
