// backend/src/services/thematicAnalysisService.ts
/**
 * Analyse thématique par IA (CAQDAS)
 *
 * Cascade IA (self-hosted prioritaire) :
 *   Ollama (local, JSON mode) → DeepSeek (cloud, JSON mode) → erreur
 */

import { logger } from '../utils/logger';
import { isOllamaConfigured, chatWithOllama } from './ollamaService';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface CodeWithNotes {
  name: string;
  count: number;
  notes: string[];
}

interface Theme {
  name: string;
  description: string;
  related_codes: string[];
  insight: string;
}

// ═══════════════════════════════════════════════════════════
// Construction du prompt (partagé Ollama / DeepSeek)
// ═══════════════════════════════════════════════════════════

const buildPrompt = (codes: CodeWithNotes[]): string => {
  const codesContext = codes
    .map((c) => {
      const notesText =
        c.notes.length > 0
          ? `\n  Notes analytiques:\n${c.notes.map((n) => `  - "${n}"`).join('\n')}`
          : '\n  (aucune note analytique)';
      return `Code: "${c.name}" (utilisé ${c.count} fois)${notesText}`;
    })
    .join('\n\n');

  return `Tu es un expert en analyse qualitative (CAQDAS) et en méthodologie de recherche.

Voici les codes extraits d'un projet de recherche, avec leurs fréquences et les notes analytiques du chercheur :

${codesContext}

Ta mission : identifier 2 à 4 thèmes émergents qui regroupent ces codes de manière pertinente.

Réponds UNIQUEMENT avec un objet JSON valide, sans aucun formatage Markdown autour, avec cette structure exacte :
{
  "themes": [
    {
      "name": "Nom court et évocateur du thème (max 5 mots)",
      "description": "Description du thème en 2-3 phrases, expliquant comment les codes s'y rattachent.",
      "related_codes": ["Code1", "Code2"],
      "insight": "Une phrase de synthèse percutante qui pourrait figurer dans un article scientifique."
    }
  ]
}

Contraintes :
- Le "name" doit être concis et académique.
- Les "related_codes" doivent être EXACTEMENT les noms des codes fournis ci-dessus.
- L'"insight" doit être une phrase d'analyse originale, pas une simple reformulation.`;
};

// ═══════════════════════════════════════════════════════════
// Parsing commun
// ═══════════════════════════════════════════════════════════

const parseThemesResponse = (content: string): Theme[] => {
  // Nettoyage défensif : certains modèles entourent le JSON de ```json ... ```
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed.themes)) {
    throw new Error('Format de réponse invalide (champ "themes" manquant)');
  }
  return parsed.themes as Theme[];
};

// ═══════════════════════════════════════════════════════════
// Ollama (self-hosted prioritaire)
// ═══════════════════════════════════════════════════════════

const generateWithOllama = async (codes: CodeWithNotes[]): Promise<Theme[]> => {
  const prompt = buildPrompt(codes);

  const content = await chatWithOllama(
    [{ role: 'user', content: prompt }],
    { jsonMode: true, temperature: 0.5 },
  );

  if (!content?.trim()) {
    throw new Error('Ollama : réponse vide');
  }

  return parseThemesResponse(content);
};

// ═══════════════════════════════════════════════════════════
// DeepSeek (cloud fallback)
// ═══════════════════════════════════════════════════════════

const generateWithDeepSeek = async (codes: CodeWithNotes[]): Promise<Theme[]> => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY non configurée');
  }

  const prompt = buildPrompt(codes);

  const response = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API ${response.status}: ${err.substring(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Réponse DeepSeek vide');
  }

  return parseThemesResponse(content);
};

// ═══════════════════════════════════════════════════════════
// Cascade Ollama → DeepSeek
// ═══════════════════════════════════════════════════════════

export const generateThematicAnalysis = async (
  codes: CodeWithNotes[],
): Promise<Theme[]> => {
  // 1. Ollama (self-hosted prioritaire)
  if (isOllamaConfigured()) {
    try {
      logger.info('[thematic] Tentative Ollama (local)...');
      const themes = await generateWithOllama(codes);
      logger.info(`✅ [thematic] Ollama OK (${themes.length} thèmes)`);
      return themes;
    } catch (err: any) {
      logger.warn(`⚠️ [thematic] Ollama échoué : ${err.message}`);
    }
  }

  // 2. DeepSeek (cloud fallback)
  try {
    logger.info('[thematic] Tentative DeepSeek...');
    const themes = await generateWithDeepSeek(codes);
    logger.info(`✅ [thematic] DeepSeek OK (${themes.length} thèmes)`);
    return themes;
  } catch (err: any) {
    logger.error(`❌ [thematic] DeepSeek échoué : ${err.message}`);
    throw new Error("Impossible de générer l'analyse thématique pour le moment.");
  }
};
