// backend/src/services/sentimentService.ts
import { logger } from '../utils/logger';
import { isOllamaConfigured, analyzeSentimentWithOllama } from './ollamaService';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

export interface SentimentResult {
  sentiment: 'Positif' | 'Négatif' | 'Neutre' | 'Mixte';
  score: number;
  explanation: string;
  markdown: string;
}

export const analyzeSentiment = async (text: string): Promise<SentimentResult> => {
  let result: { sentiment: string; score: number; explanation: string } | null = null;

  // ✅ 1. PRIORITÉ : Ollama (si configuré, mode self-hosted)
  if (isOllamaConfigured()) {
    try {
      logger.info('🦙 [sentiment] Tentative via Ollama (local)...');
      result = await analyzeSentimentWithOllama(text);
      logger.info('✅ [sentiment] Analyse via Ollama réussie');
    } catch (error: any) {
      logger.warn(`⚠️ [sentiment] Ollama échoué, bascule vers DeepSeek: ${error.message}`);
    }
  }

  // ✅ 2. FALLBACK : DeepSeek (cloud)
  if (!result) {
    if (!DEEPSEEK_API_KEY) {
      throw new Error('Aucun fournisseur IA disponible (ni Ollama, ni DeepSeek)');
    }

    const truncated = text.length > 15_000 ? text.substring(0, 15_000) + '...' : text;

    const prompt = `
Tu es un expert en analyse qualitative. Analyse le sentiment du texte suivant.
Réponds UNIQUEMENT avec un objet JSON valide, sans aucun formatage Markdown autour, avec cette structure exacte :
{
  "sentiment": "Positif" | "Négatif" | "Neutre" | "Mixte",
  "score": (un nombre entre -100 et 100),
  "explanation": "Une explication concise de 2 à 3 phrases en français."
}

Texte à analyser :
"""
${truncated}
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

      const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
      result = JSON.parse(data.choices[0].message.content);
    } catch (error: any) {
      logger.error('❌ [sentiment] Erreur DeepSeek:', error.message);
      throw new Error("Impossible d'analyser le sentiment pour le moment.");
    }
  }

  if (!result) throw new Error('Aucun résultat');

  // Rendu Markdown commun
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

  return { ...(result as any), markdown };
};
