// backend/src/services/summaryService.ts
import { db } from '../db/knex';
import { extractTextFromUrl, extractTextFromBuffer } from './textExtractor';
import { generateSummaryWithOpenAI, isOpenAIConfigured } from './openaiService';
import fs from 'fs';
import path from 'path';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

/**
 * Résumé via Deepgram Text Intelligence (/v1/read)
 * NOTE : Deepgram ne supporte que l'anglais pour la summarization.
 */
const generateSummaryWithDeepgram = async (text: string): Promise<string> => {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY non configurée');
  }

  const truncatedText = text.length > 100000 ? text.substring(0, 100000) + '...' : text;

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

  const data: any = await response.json();
  const summary = data?.results?.summary?.text;

  if (!summary) {
    throw new Error('Réponse Deepgram vide');
  }

  console.log(`✅ Résumé Deepgram généré : ${summary.length} caractères`);
  return summary;
};

/**
 * Résumé heuristique (fallback ultime, toujours disponible)
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

  const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);
  const ordered = top.sort((a, b) =>
    text.indexOf(a.sentence) - text.indexOf(b.sentence)
  );

  return ordered.map(item => item.sentence.trim()).join(' ');
};

/**
 * ✅ Fonction principale : cascade OpenAI → Deepgram → Heuristique
 */
const generateSummary = async (text: string): Promise<string> => {
  // 1️⃣ Tentative OpenAI (français, meilleure qualité)
  if (isOpenAIConfigured()) {
    try {
      console.log('🔵 [summary] Tentative OpenAI...');
      return await generateSummaryWithOpenAI(text);
    } catch (error: any) {
      console.warn(`⚠️ [summary] OpenAI échoué (${error.message}), bascule vers Deepgram`);
    }
  } else {
    console.log('⚠️ [summary] OpenAI non configuré');
  }

  // 2️⃣ Tentative Deepgram (anglais uniquement)
  if (DEEPGRAM_API_KEY) {
    try {
      console.log('🟢 [summary] Tentative Deepgram...');
      return await generateSummaryWithDeepgram(text);
    } catch (error: any) {
      console.warn(`⚠️ [summary] Deepgram échoué (${error.message}), bascule vers heuristique`);
    }
  } else {
    console.log('⚠️ [summary] Deepgram non configuré');
  }

  // 3️⃣ Fallback heuristique (toujours disponible)
  console.log('🟠 [summary] Utilisation du résumé heuristique (fallback final)');
  return generateHeuristicSummary(text);
};

/**
 * Génère le résumé d'un document (transcription, memo ou fichier)
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

  // Sauvegarder le résumé
  const existing = await db('document_summaries')
    .where({ documentId, type })
    .first();

  if (existing) {
    await db('document_summaries')
      .where({ documentId, type })
      .update({ summary, updatedAt: new Date().toISOString() });
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

export const getDocumentSummary = async (
  documentId: string,
  type: string
): Promise<string | null> => {
  const record = await db('document_summaries').where({ documentId, type }).first();
  return record?.summary || null;
};

export const getProjectSummaries = async (projectId: string, userId: string): Promise<any[]> => {
  const transcriptions = await db('transcriptions').where({ projectId, userId }).select('id', 'title', 'type');
  const memos = await db('memos').where({ projectId, userId }).select('id', 'title', db.raw("'memo' as type"));
  const files = await db('project_files').where({ projectId, userId }).select('id', 'fileName as title', db.raw("'file' as type"));

  const allDocs = [...transcriptions, ...memos, ...files];
  const results = [];
  for (const doc of allDocs) {
    const summary = await getDocumentSummary(doc.id, doc.type);
    results.push({ ...doc, hasSummary: !!summary, summary });
  }
  return results;
};

export const generateProjectSummary = async (projectId: string, userId: string): Promise<string> => {
  console.log(`🔍 [summary] Résumé global du projet ${projectId}`);

  const transcriptions = await db('transcriptions').where({ projectId, userId }).select('transcriptText');
  const memos = await db('memos').where({ projectId, userId }).select('content');
  const files = await db('project_files').where({ projectId, userId }).select('filePath', 'mimeType');

  let allText = '';
  transcriptions.forEach(t => { if (t.transcriptText) allText += ' ' + t.transcriptText; });
  memos.forEach(m => { if (m.content) allText += ' ' + m.content; });

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
  return generateSummary(allText);
};
