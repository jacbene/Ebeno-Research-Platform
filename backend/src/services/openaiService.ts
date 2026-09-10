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

  // Limiter la longueur (contexte GPT-3.5 ≈ 16k tokens, on garde une marge)
  const truncatedText = text.length > 12000 ? text.substring(0, 12000) + '...' : text;

  try {
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

    console.log(`✅ [OpenAI] Résumé généré : ${summary.length} caractères`);
    return summary;

  } catch (error) {
    console.error('❌ [OpenAI] Erreur:', error);
    throw error;
  }
};

/**
 * Extrait les entités d'un texte via OpenAI (bonus)
 */
export const extractEntitiesWithOpenAI = async (text: string): Promise<any> => {
  if (!OPENAI_API_KEY || !OPENAI_API_KEY.startsWith('sk-')) {
    throw new Error('OPENAI_API_KEY non configurée');
  }

  const truncatedText = text.length > 8000 ? text.substring(0, 8000) + '...' : text;

  try {
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
            content: `Extrayez les entités nommées du texte suivant au format JSON :
{
  "Personnes": [],
  "Organisations": [],
  "Lieux": [],
  "Dates": [],
  "Concepts": []
}
Répondez uniquement avec le JSON, sans texte autour.`,
          },
          { role: 'user', content: truncatedText },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Erreur OpenAI: ${response.status}`);
    }

    const data: any = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    return JSON.parse(content);
  } catch (error) {
    console.error('❌ [OpenAI] Erreur extraction entités:', error);
    throw error;
  }
};

export const isOpenAIConfigured = (): boolean => {
  return !!OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-');
};
