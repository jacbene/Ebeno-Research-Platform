// backend/src/services/streamService.ts
/**
 * Service de streaming IA (Ollama → DeepSeek → OpenAI)
 * API en mode "stream: true" → AsyncIterator de chunks.
 *
 * Ordre (self-hosted prioritaire) :
 *   1. Ollama (local) — NDJSON
 *   2. DeepSeek (cloud) — SSE
 *   3. OpenAI (cloud) — SSE
 *   4. Fallback texte
 *
 * ⚠️ Si un provider émet des chunks PUIS échoue, on ne peut pas rejouer
 *    depuis zéro (le client a déjà reçu du texte). On émet alors un
 *    `done` avec finishReason='partial' et on conserve le texte partiel.
 */

import { logger } from '../utils/logger';
import type { ChatMessage } from './chatService';
import { isOllamaConfigured, chatWithOllamaStream } from './ollamaService';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini';

const MAX_RESPONSE_TOKENS = 1500;
const REQUEST_TIMEOUT_MS = 90000;

export interface StreamChunk {
  type: 'chunk' | 'done' | 'error';
  content?: string;
  model?: string;
  tokens?: number;
  finishReason?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// Parser SSE (Server-Sent Events) — DeepSeek / OpenAI
// ═══════════════════════════════════════════════════════════

async function* parseSSE(
  response: Response,
): AsyncGenerator<{ content: string; finishReason?: string; tokens?: number }, void, void> {
  if (!response.body) throw new Error('Pas de body dans la réponse');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalTokens: number | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        const lines = event.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';
            const finishReason = parsed.choices?.[0]?.finish_reason;
            const usage = parsed.usage;

            if (usage?.total_tokens) totalTokens = usage.total_tokens;

            if (delta || finishReason) {
              yield { content: delta, finishReason, tokens: totalTokens };
            }
          } catch {
            // Chunk invalide → ignorer
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ═══════════════════════════════════════════════════════════
// Ollama streaming (NDJSON via ollamaService)
// ═══════════════════════════════════════════════════════════

async function* streamOllama(
  messages: ChatMessage[],
): AsyncGenerator<StreamChunk, void, void> {
  for await (const content of chatWithOllamaStream(messages as any)) {
    if (content) {
      yield { type: 'chunk', content, model: 'ollama' };
    }
  }
  // Fin normale : `chatWithOllamaStream` a vu `json.done === true`
  yield { type: 'done', model: 'ollama', finishReason: 'stop' };
}

// ═══════════════════════════════════════════════════════════
// DeepSeek streaming
// ═══════════════════════════════════════════════════════════

async function* streamDeepSeek(
  messages: ChatMessage[],
): AsyncGenerator<StreamChunk, void, void> {
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
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`DeepSeek HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    let lastTokens: number | undefined;
    let lastFinishReason: string | undefined;

    for await (const chunk of parseSSE(res)) {
      if (chunk.content) {
        yield { type: 'chunk', content: chunk.content, model: DEEPSEEK_MODEL };
      }
      if (chunk.tokens) lastTokens = chunk.tokens;
      if (chunk.finishReason) lastFinishReason = chunk.finishReason;
    }

    yield {
      type: 'done',
      model: DEEPSEEK_MODEL,
      tokens: lastTokens,
      finishReason: lastFinishReason,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════
// OpenAI streaming (fallback)
// ═══════════════════════════════════════════════════════════

async function* streamOpenAI(
  messages: ChatMessage[],
): AsyncGenerator<StreamChunk, void, void> {
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
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    let lastTokens: number | undefined;
    let lastFinishReason: string | undefined;

    for await (const chunk of parseSSE(res)) {
      if (chunk.content) {
        yield { type: 'chunk', content: chunk.content, model: OPENAI_MODEL };
      }
      if (chunk.tokens) lastTokens = chunk.tokens;
      if (chunk.finishReason) lastFinishReason = chunk.finishReason;
    }

    yield {
      type: 'done',
      model: OPENAI_MODEL,
      tokens: lastTokens,
      finishReason: lastFinishReason,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ═══════════════════════════════════════════════════════════
// Cascade streaming : Ollama → DeepSeek → OpenAI
// ═══════════════════════════════════════════════════════════

export async function* streamAI(
  messages: ChatMessage[],
): AsyncGenerator<StreamChunk, void, void> {
  // Compteur partagé : a-t-on déjà émis du contenu au client ?
  let hasEmittedChunk = false;

  // ─── 1. Ollama (self-hosted prioritaire) ───
  if (isOllamaConfigured()) {
    try {
      logger.info('[stream] Appel Ollama (local)...');
      for await (const chunk of streamOllama(messages)) {
        if (chunk.type === 'chunk' && chunk.content) hasEmittedChunk = true;
        yield chunk;
        if (chunk.type === 'done') return;
      }
    } catch (err) {
      logger.warn(`[stream] ❌ Ollama échec : ${(err as Error).message}`);
      if (hasEmittedChunk) {
        // Le client a déjà reçu du texte — on ne peut pas relancer
        logger.warn('[stream] Stream Ollama partiel conservé (pas de fallback)');
        yield { type: 'done', model: 'ollama', finishReason: 'partial' };
        return;
      }
    }
  }

  // ─── 2. DeepSeek ───
  try {
    logger.info('[stream] Appel DeepSeek...');
    for await (const chunk of streamDeepSeek(messages)) {
      if (chunk.type === 'chunk' && chunk.content) hasEmittedChunk = true;
      yield chunk;
      if (chunk.type === 'done') return;
    }
  } catch (err) {
    logger.warn(`[stream] ❌ DeepSeek échec : ${(err as Error).message}`);
    if (hasEmittedChunk) {
      yield { type: 'done', model: DEEPSEEK_MODEL, finishReason: 'partial' };
      return;
    }
  }

  // ─── 3. OpenAI fallback ───
  try {
    logger.info('[stream] Fallback OpenAI...');
    for await (const chunk of streamOpenAI(messages)) {
      if (chunk.type === 'chunk' && chunk.content) hasEmittedChunk = true;
      yield chunk;
      if (chunk.type === 'done') return;
    }
  } catch (err) {
    logger.error(`[stream] ❌ OpenAI échec : ${(err as Error).message}`);
    if (hasEmittedChunk) {
      yield { type: 'done', model: OPENAI_MODEL, finishReason: 'partial' };
      return;
    }
  }

  // ─── 4. Fallback texte ───
  yield {
    type: 'chunk',
    content:
      "Désolé, les services d'IA sont temporairement indisponibles. Réessayez dans quelques minutes.",
    model: 'fallback',
  };
  yield { type: 'done', model: 'fallback', finishReason: 'error' };
}
