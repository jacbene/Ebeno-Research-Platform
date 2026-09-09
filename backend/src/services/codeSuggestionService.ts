// backend/src/services/codeSuggestionService.ts
import { db } from '../db/knex';
import { extractText, extractTextFromUrl } from './textExtractor';
import path from 'path';
import fs from 'fs';

const stopwords = new Set([
  'le', 'la', 'les', 'de', 'des', 'et', 'ou', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'sans', 'par', 'chez', 'entre', 'avant', 'après', 'pendant', 'depuis', 'dont', 'où', 'lui', 'elle', 'nous', 'vous', 'ils', 'elles', 'même', 'très', 'plus', 'moins', 'aussi', 'encore', 'toujours', 'jamais', 'alors', 'ainsi', 'donc', 'enfin', 'mais', 'ou', 'et', 'donc', 'or', 'ni', 'car',
  'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se', 'le', 'la', 'les', 'lui', 'leur', 'y', 'en', 'ce', 'cette', 'ces', 'mon', 'ton', 'son', 'notre', 'votre', 'leur', 'ma', 'ta', 'sa', 'nos', 'vos', 'leurs',
  'dans', 'hors', 'avec', 'sans', 'par', 'pour', 'chez', 'entre', 'en', 'à', 'au', 'aux', 'du', 'des',
  'est', 'sont', 'était', 'étaient', 'sera', 'seront', 'être', 'avoir', 'faire', 'dire', 'voir', 'vouloir',
  'un', 'une', 'des', 'ce', 'cet', 'cette', 'ces'
]);

const extractKeywords = (text: string): string[] => {
  // Extraction de tous les mots de plus de 2 caractères, hors stopwords
  const words = text.toLowerCase().match(/[a-zàâäéèêëîïôöùûüÿç']+/g) || [];
  return words
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopwords.has(w));
};

export const suggestCodesForProject = async (projectId: string): Promise<string[]> => {
  console.log(`🔍 Suggestions de codes pour projet ${projectId}`);

  const memos = await db('memos').where({ projectId }).select('content');
  const transcriptions = await db('transcriptions').where({ projectId }).select('transcriptText');
  const files = await db('project_files').where({ projectId }).select('filePath', 'mimeType', 'id');

  let allText = '';

  memos.forEach(m => { if (m.content) allText += ' ' + m.content; });
  transcriptions.forEach(t => { if (t.transcriptText) allText += ' ' + t.transcriptText; });

  for (const f of files) {
    try {
      let text = '';
      if (f.filePath && f.filePath.startsWith('http')) {
        console.log(`📂 [codes] Téléchargement depuis Cloudinary : ${f.filePath}`);
        text = await extractTextFromUrl(f.filePath, f.mimeType);
      } else {
        const filePath = path.join(__dirname, '../../', f.filePath);
        if (fs.existsSync(filePath)) {
          text = await extractText(filePath, f.mimeType);
        }
      }
      if (text && text.trim().length > 10) {
        allText += ' ' + text;
        console.log(`✅ [codes] ${f.id} : ${text.length} caractères ajoutés`);
      }
    } catch (err) {
      console.error(`❌ Erreur extraction fichier ${f.id}:`, err.message);
    }
  }

  console.log(`📝 [codes] Texte total collecté : ${allText.length} caractères`);

  if (allText.trim().length < 50) {
    console.log('⚠️ Pas assez de texte pour générer des suggestions.');
    return [];
  }

  const keywords = extractKeywords(allText);
  console.log(`🔑 [codes] ${keywords.length} mots-clés extraits (ex: ${keywords.slice(0, 15).join(', ')})`);

  if (keywords.length < 3) {
    console.log('⚠️ Pas assez de mots-clés pour générer des suggestions.');
    return [];
  }

  const freq: Record<string, number> = {};
  keywords.forEach(k => { freq[k] = (freq[k] || 0) + 1; });

  const minCount = allText.trim().split(/\s+/).length > 200 ? 2 : 1;
  console.log(`📊 [codes] Seuil de fréquence : ${minCount}`);

  const suggestions = Object.entries(freq)
    .filter(([word, count]) => count >= minCount)
    .sort((a, b) => b[1] - a[1])
    .map(([word, count]) => word);

  console.log(`💡 [codes] ${suggestions.length} suggestions générées (ex: ${suggestions.slice(0, 10).join(', ')})`);

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
