// backend/src/services/summaryService.ts
import { db } from '../db/knex';
import { extractTextFromUrl, extractTextFromBuffer } from './textExtractor';
import { generateSummaryWithOpenAI, isOpenAIConfigured } from './openaiService';
import { generateSummaryWithDeepSeek, isDeepSeekConfigured } from './deepseekSummaryService';

import {
  isServiceAvailable,
  recordFailure,
  recordSuccess,
} from './circuitBreaker';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { decrypt } from './encryptionService';
import { canSendEmail } from './emailPreferencesService';
import { sendSummaryReadyEmail } from './emailService';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY || '';

// Noms des services pour le circuit breaker
const SERVICE_OPENAI = 'openai';
const SERVICE_DEEPGRAM = 'deepgram';
const SERVICE_DEEPSEEK = 'deepseek';

// ✅ Helper : déchiffre l'email si nécessaire
const getUserEmail = (user: any): string => {
  if (user?.emailEncrypted) {
    const decrypted = decrypt(user.emailEncrypted);
    if (decrypted) return decrypted;
  }
  return user?.email || '';
};

/**
 * Résumé via Deepgram Text Intelligence (/v1/read)
 */
const generateSummaryWithDeepgram = async (text: string): Promise<string> => {
  if (!DEEPGRAM_API_KEY) {
    throw new Error('DEEPGRAM_API_KEY non configurée');
  }

  const truncatedText = text.length > 100000 ? text.substring(0, 100000) + '...' : text;

  const response = await fetch(
    'https://api.deepgram.com/v1/read?summarize=true&language=en',
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
    throw new Error(`Deepgram ${response.status} : ${errorText}`);
  }

  const data: any = await response.json();
  const summary = data?.results?.summary?.text;

  if (!summary) {
    throw new Error('Réponse Deepgram vide');
  }

  return summary;
};

/**
 * Résumé heuristique (fallback ultime)
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
 * ✅ Cascade intelligente :
 *   DeepSeek → OpenAI → Deepgram → Heuristique
 */
const generateSummary = async (text: string): Promise<string> => {
  // 1️⃣ DeepSeek
  if (isDeepSeekConfigured() && isServiceAvailable(SERVICE_DEEPSEEK)) {
    try {
      logger.info('🟣 [summary] Tentative DeepSeek...');
      const result = await generateSummaryWithDeepSeek(text);
      recordSuccess(SERVICE_DEEPSEEK);
      return result;
    } catch (error: any) {
      recordFailure(SERVICE_DEEPSEEK, error);
      logger.warn(`⚠️ [summary] DeepSeek échoué, bascule vers OpenAI`);
    }
  } else if (!isServiceAvailable(SERVICE_DEEPSEEK)) {
    logger.info('⏭️ [summary] DeepSeek ignoré (circuit ouvert)');
  } else {
    logger.info('⚠️ [summary] DeepSeek non configuré');
  }

  // 2️⃣ OpenAI
  if (isOpenAIConfigured() && isServiceAvailable(SERVICE_OPENAI)) {
    try {
      logger.info('🔵 [summary] Tentative OpenAI...');
      const result = await generateSummaryWithOpenAI(text);
      recordSuccess(SERVICE_OPENAI);
      return result;
    } catch (error: any) {
      recordFailure(SERVICE_OPENAI, error);
      logger.warn(`⚠️ [summary] OpenAI échoué, bascule vers Deepgram`);
    }
  } else if (!isServiceAvailable(SERVICE_OPENAI)) {
    logger.info('⏭️ [summary] OpenAI ignoré (circuit ouvert)');
  } else {
    logger.info('⚠️ [summary] OpenAI non configuré');
  }

  // 3️⃣ Deepgram
  if (DEEPGRAM_API_KEY && isServiceAvailable(SERVICE_DEEPGRAM)) {
    try {
      logger.info('🟢 [summary] Tentative Deepgram...');
      const result = await generateSummaryWithDeepgram(text);
      recordSuccess(SERVICE_DEEPGRAM);
      return result;
    } catch (error: any) {
      recordFailure(SERVICE_DEEPGRAM, error);
      logger.warn(`⚠️ [summary] Deepgram échoué, bascule vers heuristique`);
    }
  } else if (!isServiceAvailable(SERVICE_DEEPGRAM)) {
    logger.info('⏭️ [summary] Deepgram ignoré (circuit ouvert)');
  } else {
    logger.info('⚠️ [summary] Deepgram non configuré');
  }

  // 4️⃣ Heuristique
  logger.info('🟠 [summary] Utilisation du résumé heuristique (fallback final)');
  return generateHeuristicSummary(text);
};

/**
 * ✅ Récupère le titre + projectId d'un document
 */
const getDocumentMeta = async (
  documentId: string,
  type: 'transcription' | 'memo' | 'file'
): Promise<{ title: string; projectId: string | null }> => {
  try {
    if (type === 'transcription') {
      const doc = await db('transcriptions').where({ id: documentId }).select('title', 'projectId').first();
      return { title: doc?.title || 'Transcription', projectId: doc?.projectId || null };
    }
    if (type === 'memo') {
      const doc = await db('memos').where({ id: documentId }).select('title', 'projectId').first();
      return { title: doc?.title || 'Memo', projectId: doc?.projectId || null };
    }
    if (type === 'file') {
      const doc = await db('project_files').where({ id: documentId }).select('fileName as title', 'projectId').first();
      return { title: doc?.title || 'Fichier', projectId: doc?.projectId || null };
    }
  } catch (err: any) {
    logger.warn(`⚠️ [summary] getDocumentMeta échoué: ${err.message}`);
  }
  return { title: 'Document', projectId: null };
};

/**
 * ✅ Envoie la notification email (non bloquant)
 */
const notifySummaryReady = async (
  userId: string,
  documentId: string,
  type: 'transcription' | 'memo' | 'file',
  summary: string
): Promise<void> => {
  (async () => {
    try {
      // 1. Vérifier les préférences email
      const wantsEmail = await canSendEmail(userId, 'summaryReady');
      if (!wantsEmail) {
        logger.info(`ℹ️  [email] ${userId} a désactivé les notifs "résumé prêt"`);
        return;
      }

      // 2. Récupérer l'utilisateur
      const user = await db('users').where({ id: userId }).first();
      if (!user) return;

      const to = getUserEmail(user);
      if (!to) {
        logger.warn(`⚠️ [email] Pas d'email pour ${userId}`);
        return;
      }

      // 3. Récupérer le titre + projectId
      const { title, projectId } = await getDocumentMeta(documentId, type);

      // 4. Envoyer
      await sendSummaryReadyEmail({
        to,
        name: user.name || 'chercheur',
        summaryTitle: title,
        summaryExcerpt: summary,
        projectId: projectId || '',
        lang: user.language || 'fr',
      });
    } catch (err: any) {
      logger.warn(`⚠️ [email] Échec notif "résumé prêt": ${err.message}`);
    }
  })();
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
      logger.info(`📂 [summary] Téléchargement depuis Cloudinary : ${doc.filePath}`);
      text = await extractTextFromUrl(doc.filePath, doc.mimeType);
    } else {
      const filePath = path.join(__dirname, '../../', doc.filePath);
      logger.info(`📂 [summary] Chemin local : ${filePath}`);
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

  logger.info(`📝 [summary] Texte extrait : ${text.length} caractères`);

  const summary = await generateSummary(text);

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

  // ✅ NOUVEAU : Notifier par email (non bloquant)
  await notifySummaryReady(userId, documentId, type, summary);

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
  logger.info(`🔍 [summary] Résumé global du projet ${projectId}`);

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
      logger.warn(`⚠️ Fichier ignoré : ${err.message}`);
    }
  }

  if (allText.trim().length < 200) {
    return 'Pas assez de contenu pour générer un résumé de projet.';
  }

  logger.info(`📝 [summary] Texte total collecté : ${allText.length} caractères`);
  return generateSummary(allText);
};
