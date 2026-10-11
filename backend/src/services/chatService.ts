// backend/src/services/chatService.ts
/**
 * Chat IA multilingue avec contexte projet
 *
 * Cascade IA : DeepSeek → OpenAI
 * Contexte : résumés + transcriptions + documents du projet
 */

import { db } from '../db/knex';
import { logger } from '../utils/logger';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  model: string;          // 'deepseek-chat' | 'gpt-4o-mini' | 'fallback'
  tokens?: number;
  finishReason?: string;
}

export interface SourceCitation {
  type: 'document' | 'transcription' | 'summary' | 'analysis';
  id: string;
  name: string;
}

// ═══════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const MAX_CONTEXT_CHARS = 20000;    // ~5000 tokens de contexte
const MAX_RESPONSE_TOKENS = 1500;
const REQUEST_TIMEOUT_MS = 45000;

// ═══════════════════════════════════════════════════════════
// 1. Contexte projet
// ═══════════════════════════════════════════════════════════

/**
 * Construit le contexte du projet à envoyer à l'IA.
 * Récupère : titre, description, résumés, transcriptions, documents.
 * Tronque à MAX_CONTEXT_CHARS.
 */
export async function buildProjectContext(projectId: string): Promise<{
  contextText: string;
  sources: SourceCitation[];
}> {
  const sources: SourceCitation[] = [];
  const parts: string[] = [];

  // ─── 1.1 Projet ───
  const project = await db('projects').where({ id: projectId }).first();
  if (project) {
    parts.push(`# PROJET : ${project.title}`);
    if (project.description) parts.push(`Description : ${project.description}`);
  }

  // ─── 1.2 Fichiers du projet (pour JOIN résumés) ───
  let projectFileIds: string[] = [];
  try {
    const files = await db('project_files')
      .where({ projectId })
      .whereNull('deletedAt')
      .orderBy('uploadedAt', 'desc')
      .limit(20)
      .select('id', 'fileName');

    projectFileIds = files.map((f: any) => f.id);

    if (files.length > 0) {
      parts.push('\n## DOCUMENTS DU PROJET');
      for (const f of files) {
        parts.push(`- ${f.fileName}`);
        sources.push({
          type: 'document',
          id: f.id,
          name: f.fileName,
        });
      }
    }
  } catch (err) {
    logger.warn(`[chat] files non chargés : ${(err as Error).message}`);
  }

  // ─── 1.3 Résumés (JOIN via documentId) ───
  try {
    if (projectFileIds.length > 0) {
      const summaries = await db('document_summaries')
        .whereIn('documentId', projectFileIds)
        .orderBy('createdAt', 'desc')
        .limit(10);

      if (summaries.length > 0) {
        parts.push('\n## RÉSUMÉS DE DOCUMENTS');
        for (const s of summaries) {
          const content = (s.summary || '').slice(0, 1500);
          if (content) {
            // Retrouver le nom du document
            const file = await db('project_files').where({ id: s.documentId }).first();
            const docName = file?.fileName || 'Document';
            parts.push(`### ${docName}\n${content}`);
            sources.push({
              type: 'summary',
              id: s.id,
              name: `Résumé — ${docName}`,
            });
          }
        }
      }
    }
  } catch (err) {
    logger.warn(`[chat] summaries non chargés : ${(err as Error).message}`);
  }

  // ─── 1.4 Transcriptions ───
  try {
    const transcriptions = await db('transcriptions')
      .where({ projectId })
      .whereNull('deletedAt')
      .orderBy('createdAt', 'desc')
      .limit(15);

    if (transcriptions.length > 0) {
      parts.push('\n## TRANSCRIPTIONS');
      for (const tr of transcriptions) {
        // ⚠️ Colonne réelle : transcriptText (pas content)
        const content = (tr.transcriptText || '').slice(0, 2000);
        if (content) {
          parts.push(`### ${tr.title || tr.fileName || 'Transcription'}\n${content}`);
          sources.push({
            type: 'transcription',
            id: tr.id,
            name: tr.title || tr.fileName || 'Transcription',
          });
        }
      }
    }
  } catch (err) {
    logger.warn(`[chat] transcriptions non chargées : ${(err as Error).message}`);
  }

  // ─── 1.5 Troncature ───
  let contextText = parts.join('\n\n');
  if (contextText.length > MAX_CONTEXT_CHARS) {
    contextText = contextText.slice(0, MAX_CONTEXT_CHARS) + '\n\n[... contexte tronqué]';
  }

  logger.info(`[chat] Contexte construit : ${contextText.length} chars, ${sources.length} sources`);

  return { contextText, sources };
}

// ═══════════════════════════════════════════════════════════
// 2. DeepSeek
// ═══════════════════════════════════════════════════════════

async function callDeepSeek(messages: ChatMessage[]): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY manquant');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const finishReason = data?.choices?.[0]?.finish_reason;
    const tokens = data?.usage?.total_tokens;

    if (!content) throw new Error('DeepSeek : réponse vide');

    return {
      content,
      model: DEEPSEEK_MODEL,
      tokens,
      finishReason,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════
// 3. OpenAI (fallback)
// ═══════════════════════════════════════════════════════════

async function callOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY manquant');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        max_tokens: MAX_RESPONSE_TOKENS,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    const finishReason = data?.choices?.[0]?.finish_reason;
    const tokens = data?.usage?.total_tokens;

    if (!content) throw new Error('OpenAI : réponse vide');

    return {
      content,
      model: OPENAI_MODEL,
      tokens,
      finishReason,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════
// 4. Cascade DeepSeek → OpenAI
// ═══════════════════════════════════════════════════════════

export async function callAI(messages: ChatMessage[]): Promise<AIResponse> {
  // 1. DeepSeek
  try {
    logger.info('[chat] Appel DeepSeek...');
    const result = await callDeepSeek(messages);
    logger.info(`[chat] ✅ DeepSeek OK (${result.tokens || '?'} tokens)`);
    return result;
  } catch (err) {
    logger.warn(`[chat] ❌ DeepSeek échec : ${(err as Error).message}`);
  }

  // 2. OpenAI (fallback)
  try {
    logger.info('[chat] Fallback OpenAI...');
    const result = await callOpenAI(messages);
    logger.info(`[chat] ✅ OpenAI OK (${result.tokens || '?'} tokens)`);
    return result;
  } catch (err) {
    logger.error(`[chat] ❌ OpenAI échec : ${(err as Error).message}`);
  }

  // 3. Fallback ultime
  return {
    content:
      "Désolé, les services d'IA sont temporairement indisponibles. Réessayez dans quelques minutes.",
    model: 'fallback',
    finishReason: 'error',
  };
}

// ═══════════════════════════════════════════════════════════
// 5. Titre automatique
// ═══════════════════════════════════════════════════════════

export async function generateTitle(firstUserMessage: string): Promise<string> {
  const prompt: ChatMessage[] = [
    {
      role: 'system',
      content:
        'Génère un titre très court (3-6 mots, sans guillemets, sans ponctuation finale) qui résume la question suivante. Réponds UNIQUEMENT avec le titre.',
    },
    { role: 'user', content: firstUserMessage.slice(0, 500) },
  ];

  try {
    const res = await callAI(prompt);
    const title = res.content.trim().replace(/^["']|["']$/g, '').slice(0, 100);
    return title || 'Nouvelle conversation';
  } catch {
    return 'Nouvelle conversation';
  }
}

// ═══════════════════════════════════════════════════════════
// 6. Construction du prompt système
// ═══════════════════════════════════════════════════════════

export function buildSystemPrompt(
  projectContext: string,
  language: string = 'fr',
): string {
  const langMap: Record<string, string> = {
    fr: 'français',
    en: 'English',
    es: 'español',
    pt: 'português',
    ar: 'العربية',
  };
  const langName = langMap[language] || 'français';

  return `Tu es un assistant de recherche intégré à la plateforme Ebeno.
Tu aides l'utilisateur à comprendre et analyser ses projets de recherche.

RÈGLES :
- Réponds TOUJOURS en ${langName}.
- Base tes réponses UNIQUEMENT sur le contexte fourni ci-dessous.
- Si l'information n'est pas dans le contexte, dis-le clairement.
- Sois précis, concis, et cite tes sources quand c'est pertinent.
- Utilise le markdown pour structurer tes réponses (listes, gras, citations).

CONTEXTE DU PROJET :
${projectContext}`;
}
