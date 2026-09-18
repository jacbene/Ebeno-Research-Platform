// backend/src/services/deepseekSummaryService.ts
import dotenv from 'dotenv';
import path from 'path';
import { logger } from '../utils/logger';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

/**
 * Génère un résumé en français via DeepSeek Chat.
 * API compatible OpenAI — même format de requête/réponse.
 */
export const generateSummaryWithDeepSeek = async (text: string): Promise<string> => {
  if (!DEEPSEEK_API_KEY || !DEEPSEEK_API_KEY.startsWith('sk-')) {
    throw new Error('DEEPSEEK_API_KEY non configurée');
  }

  const truncatedText = text.length > 12000 ? text.substring(0, 12000) + '...' : text;

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `Vous êtes un assistant de recherche en sciences humaines et sociales.
Résumez le texte suivant de manière structurée et académique :
- Identifiez la thèse principale
- Extrayez les arguments clés
- Mentionnez les concepts importants
- Soyez concis (3 à 5 phrases maximum)
- Rédigez en français`,
        },
        { role: 'user', content: truncatedText },
      ],
      temperature: 0.5,
      max_tokens: 400,
    }),
  });

  if (response.status === 429) {
    const errorBody = await response.text();
    logger.error('❌ DeepSeek 429 (quota dépassé)', { error: errorBody.substring(0, 200) });
    throw new Error('Quota DeepSeek dépassé');
  }

  if (response.status === 401) {
    const errorBody = await response.text();
    logger.error('❌ DeepSeek 401 (clé invalide)', { error: errorBody.substring(0, 200) });
    throw new Error('DeepSeek 401 : clé API invalide');
  }

  if (!response.ok) {
    const errorText = await response.text();
    logger.error(`❌ Erreur DeepSeek: ${response.status}`, { error: errorText.substring(0, 200) });
    throw new Error(`Erreur DeepSeek: ${response.status}`);
  }

  const data: any = await response.json();
  const summary = data?.choices?.[0]?.message?.content;

  if (!summary) {
    throw new Error('Réponse DeepSeek vide');
  }

  logger.info(`✅ Résumé DeepSeek généré : ${summary.length} caractères`);
  return summary;
};

export const isDeepSeekConfigured = (): boolean => {
  return !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.startsWith('sk-');
};
