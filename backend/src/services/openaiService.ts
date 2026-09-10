// backend/src/services/openaiService.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Génère un résumé en français via OpenAI GPT-3.5-turbo
 */
export const generateSummaryWithOpenAI = async (text: string): Promise<string> => {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY non configurée');
  }

  const truncatedText = text.length > 12000 ? text.substring(0, 12000) + '...' : text;

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
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

  // ✅ Détection explicite du 429 (quota dépassé)
  if (response.status === 429) {
    const errorBody = await response.text();
    console.error('❌ OpenAI 429 (quota dépassé):', errorBody);
    throw new Error('Quota OpenAI dépassé');
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erreur OpenAI:', response.status, errorText);
    throw new Error(`Erreur OpenAI: ${response.status}`);
  }

  const data: any = await response.json();
  const summary = data?.choices?.[0]?.message?.content;

  if (!summary) {
    throw new Error('Réponse OpenAI vide');
  }

  console.log(`✅ Résumé OpenAI généré : ${summary.length} caractères`);
  return summary;
};

export const isOpenAIConfigured = (): boolean => {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-');
};
