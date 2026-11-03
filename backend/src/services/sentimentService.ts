// backend/src/services/sentimentService.ts
import { logger } from '../utils/logger';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface SentimentResult {
  sentiment: 'Positif' | 'Négatif' | 'Neutre' | 'Mixte';
  score: number;
  explanation: string;
  markdown: string;
}

export const analyzeSentiment = async (text: string): Promise<SentimentResult> => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY non configurée');
  }

  const truncatedText = text.length > 15000 ? text.substring(0, 15000) + '...' : text;

  const prompt = `
Tu es un expert en analyse qualitative. Analyse le sentiment du texte suivant.
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun formatage Markdown autour, avec cette structure exacte :
{
  "sentiment": "Positif" | "Négatif" | "Neutre" | "Mixte",
  "score": (un nombre entre -100 et 100, où -100 est très négatif, 0 est neutre, et 100 est très positif),
  "explanation": "Une explication concise de 2 à 3 phrases en français justifiant ce score."
}

Texte à analyser :
"""
${truncatedText}
"""
`;

  try {
    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${err}`);
    }

 interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const data = (await response.json()) as DeepSeekResponse;
const content = data.choices[0].message.content;
  
    const result: SentimentResult = JSON.parse(content);

    let emoji = '😐';
    if (result.sentiment === 'Positif') emoji = '😊';
    if (result.sentiment === 'Négatif') emoji = '😞';
    if (result.sentiment === 'Mixte') emoji = '🤔';

    const markdown = `
### ${emoji} Analyse du sentiment : ${result.sentiment}
**Score :** ${result.score} / 100

**Explication :**
${result.explanation}
    `.trim();

    return { ...result, markdown };
  } catch (error: any) {
    logger.error('❌ [sentiment] Erreur DeepSeek:', error.message);
    throw new Error("Impossible d'analyser le sentiment pour le moment.");
  }
};
