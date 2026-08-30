import natural from 'natural';
import { db } from '../db/knex';
import { extractText } from './textExtractor';
import path from 'path';
import fs from 'fs';

const tokenizer = new natural.WordTokenizer();
const stopwords = new Set([
  'le', 'la', 'les', 'de', 'des', 'et', 'ou', 'que', 'qui', 'dans', 'pour',
  'sur', 'avec', 'sans', 'par', 'chez', 'entre', 'avant', 'après', 'pendant',
  'depuis', 'dont', 'où', 'lui', 'elle', 'nous', 'vous', 'ils', 'elles', 'même',
  'très', 'plus', 'moins', 'aussi', 'encore', 'toujours', 'jamais', 'alors',
  'ainsi', 'donc', 'enfin', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
  'je', 'tu', 'il', 'elle', 'on', 'me', 'te', 'se', 'y', 'en', 'ce', 'cette',
  'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'ma', 'ta', 'sa', 'nos',
  'vos', 'leurs'
]);

export const extractKeywords = (text: string): Array<{ word: string; count: number }> => {
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const filtered = tokens.filter(t => t.length > 2 && !stopwords.has(t));
  const frequency: Record<string, number> = {};
  filtered.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  return Object.entries(frequency)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
};

export const getDocumentAnalysis = async (
  documentId: string,
  type: 'transcription' | 'memo' | 'file',
  userId: string
) => {
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
    throw new Error('Type invalide');
  }

  if (!text || text.trim().length < 10) {
    return { totalWords: 0, uniqueWords: 0, topKeywords: [], wordCloud: [] };
  }

  const keywords = extractKeywords(text);
  const totalWords = keywords.reduce((sum, k) => sum + k.count, 0);

  return {
    totalWords,
    uniqueWords: keywords.length,
    topKeywords: keywords.slice(0, 20),
    wordCloud: keywords.map(k => ({ word: k.word, value: k.count })),
  };
};

export const getProjectAnalysis = async (projectId: string, userId: string) => {
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

  transcriptions.forEach(t => { if (t.transcriptText) allText += ' ' + t.transcriptText; });
  memos.forEach(m => { if (m.content) allText += ' ' + m.content; });

  for (const f of files) {
    const filePath = path.join(__dirname, '../../', f.filePath);
    if (fs.existsSync(filePath)) {
      try {
        const text = await extractText(filePath, f.mimeType);
        if (text) allText += ' ' + text;
      } catch (err) {
        console.warn(`⚠️ Ignoré fichier ${f.filePath} pour l'analyse:`, err.message);
      }
    }
  }

  if (!allText || allText.trim().length < 10) {
    return { totalWords: 0, uniqueWords: 0, topKeywords: [], wordCloud: [] };
  }

  const keywords = extractKeywords(allText);
  const totalWords = keywords.reduce((sum, k) => sum + k.count, 0);

  return {
    totalWords,
    uniqueWords: keywords.length,
    topKeywords: keywords.slice(0, 20),
    wordCloud: keywords.map(k => ({ word: k.word, value: k.count })),
  };
};

// Conserver pour compatibilité si utilisée ailleurs
export const getTranscriptionAnalysis = async (transcriptionId: string) => {
  // ... (optionnel, si vous l'utilisez)
};
