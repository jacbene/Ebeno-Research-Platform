import { db } from '../db/knex';
import { extractText } from './textExtractor';
import fs from 'fs';
import path from 'path';

// Utiliser Deepgram (recommandé) ou OpenAI
const useDeepgram = true;

// Si vous utilisez OpenAI
// const OpenAI = require('openai');
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fonction de résumé via Deepgram (ou OpenAI)
const generateSummary = async (text: string): Promise<string> => {
  // Limiter la longueur du texte pour éviter les dépassements
  const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;

  if (useDeepgram) {
    // Appel à Deepgram pour le résumé
    // Note : Deepgram propose le résumé via le paramètre 'summarize'
    // Mais cela nécessite une configuration spécifique
    // Pour l'instant, nous utilisons une approche simplifiée avec OpenAI si disponible
    // OU nous faisons une simulation améliorée

    // Solution de repli : utiliser une approche heuristique simple
    // (extraction des phrases les plus importantes)
    return generateHeuristicSummary(truncatedText);
  } else {
    // Utiliser OpenAI
    try {
      const openai = require('openai');
      const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'Vous êtes un assistant de recherche. Résumez le texte suivant de manière concise et structurée (3-5 phrases).' },
          { role: 'user', content: truncatedText }
        ],
        temperature: 0.5,
        max_tokens: 300,
      });
      return response.choices[0]?.message?.content || 'Résumé non disponible.';
    } catch (error) {
      console.error('Erreur OpenAI:', error);
      return generateHeuristicSummary(truncatedText);
    }
  }
};

// Résumé heuristique simple (sans API)
const generateHeuristicSummary = (text: string): string => {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  if (sentences.length <= 3) return text;

  // Sélectionner les phrases les plus longues (considérées comme plus informatives)
  const sorted = sentences.sort((a, b) => b.length - a.length);
  const topSentences = sorted.slice(0, 5).sort((a, b) => {
    // Réordonner selon l'apparition dans le texte
    return text.indexOf(a) - text.indexOf(b);
  });

  return topSentences.join(' ');
};

export const generateDocumentSummary = async (documentId: string, type: 'transcription' | 'memo' | 'file', userId: string): Promise<string> => {
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
    const filePath = path.join(__dirname, '../../', doc.filePath);
    if (!fs.existsSync(filePath)) throw new Error('Fichier physique introuvable');
    text = await extractText(filePath, doc.mimeType);
  } else {
    throw new Error('Type de document inconnu');
  }

  if (!text || text.trim().length < 50) {
    return 'Texte trop court pour générer un résumé.';
  }

  const summary = await generateSummary(text);

  // Sauvegarder le résumé
  const existing = await db('document_summaries')
    .where({ documentId, type })
    .first();

  if (existing) {
    await db('document_summaries')
      .where({ documentId, type })
      .update({ summary, updated_at: Date.now() });
  } else {
    await db('document_summaries').insert({
      id: Date.now().toString(),
      documentId,
      type,
      summary,
      created_at: Date.now(),
      updated_at: Date.now(),
    });
  }

  return summary;
};

export const getDocumentSummary = async (documentId: string, type: string): Promise<string | null> => {
  const record = await db('document_summaries')
    .where({ documentId, type })
    .first();
  return record?.summary || null;
};

export const getProjectSummaries = async (projectId: string, userId: string): Promise<any[]> => {
  // Récupérer tous les documents du projet avec leurs résumés
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
