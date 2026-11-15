// backend/src/services/thematicAnalysisService.ts
import { logger } from '../utils/logger';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

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

export const generateThematicAnalysis = async (
  codes: CodeWithNotes[]
): Promise<Theme[]> => {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY non configurée');
  }

  // Construire le contexte pour l'IA
  const codesContext = codes
    .map((c) => {
      const notesText = c.notes.length > 0
        ? `\n  Notes analytiques:\n${c.notes.map((n) => `  - "${n}"`).join('\n')}`
        : '\n  (aucune note analytique)';
      return `Code: "${c.name}" (utilisé ${c.count} fois)${notesText}`;
    })
    .join('\n\n');

  const prompt = `Tu es un expert en analyse qualitative (CAQDAS) et en méthodologie de recherche.

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
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API ${response.status}: ${err}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    if (!Array.isArray(result.themes)) {
      throw new Error('Format de réponse invalide');
    }

    return result.themes;
  } catch (error: any) {
    logger.error('❌ [thematic] Erreur DeepSeek:', error.message);
    throw new Error("Impossible de générer l'analyse thématique pour le moment.");
  }
};
