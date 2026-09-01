// backend/src/services/codeSuggestionService.ts
import { db } from '../db/knex';
import { extractText } from './textExtractor';
import path from 'path';
import fs from 'fs';
import nlp from 'compromise';

const stopwords = new Set([
  'le', 'la', 'les', 'de', 'des', 'et', 'ou', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'sans', 'par', 'chez', 'entre', 'avant', 'après', 'pendant', 'depuis', 'dont', 'où', 'lui', 'elle', 'nous', 'vous', 'ils', 'elles', 'même', 'très', 'plus', 'moins', 'aussi', 'encore', 'toujours', 'jamais', 'alors', 'ainsi', 'donc', 'enfin', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'le', 'la', 'les', 'lui', 'leur', 'y', 'en', 'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'ma', 'ta', 'sa', 'nos', 'vos', 'leurs'
]);

const extractKeywords = (text: string): string[] => {
  const doc = nlp(text);
  const terms = doc.match('#Noun+|#Adjective').out('array');
  return terms
    .map(t => t.toLowerCase().trim())
    .filter(t => t.length > 2 && !stopwords.has(t));
};

export const suggestCodesForProject = async (projectId: string): Promise<string[]> => {
  console.log(`🔍 Suggestions de codes pour projet ${projectId}`);

  const memos = await db('memos').where({ projectId }).select('content');
  const transcriptions = await db('transcriptions').where({ projectId }).select('transcriptText');
  const files = await db('project_files').where({ projectId }).select('filePath', 'mimeType');

  let allText = '';

  memos.forEach(m => { if (m.content) allText += ' ' + m.content; });
  transcriptions.forEach(t => { if (t.transcriptText) allText += ' ' + t.transcriptText; });

  for (const f of files) {
    const filePath = path.join(__dirname, '../../', f.filePath);
    if (fs.existsSync(filePath)) {
      try {
        const text = await extractText(filePath, f.mimeType);
        if (text && text.trim().length > 10) {
          allText += ' ' + text;
        }
      } catch (err) {
        console.error(`Erreur extraction fichier ${f.filePath}:`, err.message);
      }
    }
  }

  if (allText.trim().length < 50) {
    console.log('⚠️ Pas assez de texte pour générer des suggestions.');
    return [];
  }

  const keywords = extractKeywords(allText);
  const freq: Record<string, number> = {};
  keywords.forEach(k => { freq[k] = (freq[k] || 0) + 1; });

  const suggestions = Object.entries(freq)
    .filter(([word, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => word);

  const now = Date.now();
  for (const code of suggestions) {
    const existing = await db('suggested_codes')
      .where({ projectId, code, status: 'pending' })
      .first();
    if (!existing) {
      await db('suggested_codes').insert({
        id: `${projectId}-${code}-${now}-${Math.random().toString(36).substring(7)}`,
        projectId,
        code,
        frequency: freq[code] || 1,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return suggestions;
};

export const getSuggestedCodes = async (projectId: string): Promise<any[]> => {
  return db('suggested_codes')
    .where({ projectId })
    .orderBy('frequency', 'desc')
    .select('*');
};

export const updateCodeStatus = async (codeId: string, status: 'accepted' | 'rejected'): Promise<void> => {
  await db('suggested_codes')
    .where({ id: codeId })
    .update({ status, updatedAt: Date.now() });
};

