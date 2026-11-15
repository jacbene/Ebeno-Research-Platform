// backend/src/services/ollamaService.ts
import { logger } from '../utils/logger';

const OLLAMA_URL = process.env.OLLAMA_URL || '';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1';
const OLLAMA_TIMEOUT_MS = 120_000; // 2 minutes (les modèles locaux sont lents)

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

/**
 * Vérifie si Ollama est configuré et accessible
 */
export const isOllamaConfigured = (): boolean => {
  return !!OLLAMA_URL;
};

/**
 * Test rapide de disponibilité d'Ollama
 */
export const pingOllama = async (): Promise<boolean> => {
  if (!OLLAMA_URL) return false;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { 
      signal: AbortSignal.timeout(3000) 
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Chat générique avec Ollama (non-streaming)
 */
export const chatWithOllama = async (
  messages: OllamaChatMessage[],
  options: { jsonMode?: boolean; temperature?: number } = {}
): Promise<string> => {
  if (!OLLAMA_URL) {
    throw new Error('OLLAMA_URL non configurée');
  }

  const body: any = {
    model: OLLAMA_MODEL,
    messages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
    },
  };

  // Active le mode JSON strict (utile pour le sentiment)
  if (options.jsonMode) {
    body.format = 'json';
  }

  try {
    logger.info(`🦙 [Ollama] Requête vers ${OLLAMA_MODEL}...`);

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama HTTP ${res.status}: ${err}`);
    }

    const data = (await res.json()) as OllamaChatResponse;
    const content = data.message?.content || '';

    logger.info(`✅ [Ollama] Réponse reçue (${content.length} caractères)`);
    return content;
  } catch (error: any) {
    logger.error(`❌ [Ollama] Erreur: ${error.message}`);
    throw error;
  }
};

/**
 * Résumé via Ollama
 */
export const summarizeWithOllama = async (text: string): Promise<string> => {
  const truncated = text.length > 15_000 ? text.substring(0, 15_000) + '...' : text;

  return chatWithOllama(
    [
      {
        role: 'system',
        content: 'Tu es un assistant expert en synthèse de documents de recherche. Produis un résumé clair, structuré et concis en français (200 à 400 mots maximum). Utilise du Markdown (titres, listes, gras) pour rendre le résumé lisible.',
      },
      {
        role: 'user',
        content: `Résume le texte suivant :\n\n${truncated}`,
      },
    ],
    { temperature: 0.3 }
  );
};

/**
 * Analyse de sentiment via Ollama (JSON strict)
 */
export const analyzeSentimentWithOllama = async (text: string): Promise<{
  sentiment: 'Positif' | 'Négatif' | 'Neutre' | 'Mixte';
  score: number;
  explanation: string;
}> => {
  const truncated = text.length > 15_000 ? text.substring(0, 15_000) + '...' : text;

  const raw = await chatWithOllama(
    [
      {
        role: 'system',
        content: `Tu es un expert en analyse qualitative. Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, avec la structure exacte :
{"sentiment": "Positif" | "Négatif" | "Neutre" | "Mixte", "score": <nombre entre -100 et 100>, "explanation": "<2-3 phrases en français>"}`,
      },
      {
        role: 'user',
        content: `Analyse le sentiment du texte suivant :\n\n${truncated}`,
      },
    ],
    { jsonMode: true, temperature: 0.2 }
  );

  try {
    const parsed = JSON.parse(raw);
    return {
      sentiment: parsed.sentiment || 'Neutre',
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      explanation: parsed.explanation || '',
    };
  } catch {
    throw new Error('Réponse Ollama invalide (JSON malformé)');
  }
};
