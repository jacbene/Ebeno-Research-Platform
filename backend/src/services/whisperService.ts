// backend/src/services/whisperService.ts
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { isServiceAvailable, recordFailure, recordSuccess } from './circuitBreaker';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const SERVICE_WHISPER = 'whisper';
const MAX_FILE_SIZE_MB = 25; // Limite stricte OpenAI

// ✅ Client OpenAI lazy-init
let client: OpenAI | null = null;
if (OPENAI_API_KEY && OPENAI_API_KEY.startsWith('sk-')) {
  client = new OpenAI({ apiKey: OPENAI_API_KEY });
  logger.info('✅ [Whisper] Service initialisé');
} else {
  logger.warn('⚠️ [Whisper] OPENAI_API_KEY non configurée');
}

export interface WhisperResult {
  text: string;
  language: string | null;
  duration?: number;
  provider: 'whisper';
}

/**
 * Vérifie si Whisper est configuré (clé valide)
 */
export const isWhisperConfigured = (): boolean => {
  return !!client;
};

/**
 * Transcrit un fichier audio via OpenAI Whisper.
 * Détecte automatiquement la langue (99 langues supportées).
 * Limite : 25 MB par fichier.
 */
export const transcribeWithWhisper = async (
  audioPath: string,
  languageHint?: string
): Promise<WhisperResult> => {
  if (!client) {
    throw new Error('OPENAI_API_KEY non configurée ou invalide');
  }

  if (!isServiceAvailable(SERVICE_WHISPER)) {
    throw new Error('Service Whisper temporairement indisponible (circuit ouvert)');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Fichier audio introuvable: ${audioPath}`);
  }

  // ✅ Vérifier la taille (limite 25 MB OpenAI)
  const stats = fs.statSync(audioPath);
  const sizeMB = stats.size / (1024 * 1024);

  if (sizeMB > MAX_FILE_SIZE_MB) {
    throw new Error(
      `Fichier trop volumineux pour Whisper (${sizeMB.toFixed(1)} MB > ${MAX_FILE_SIZE_MB} MB)`
    );
  }

  logger.info(
    `🎧 [Whisper] Transcription ${path.basename(audioPath)} (${sizeMB.toFixed(1)} MB)...`
  );

  const startTime = Date.now();

  try {
    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      // ✅ Language auto-détecté si non fourni
      ...(languageHint ? { language: languageHint } : {}),
    });

    const text = response.text || '';
    const language = (response as any).language || null;
    const duration = (response as any).duration;

    const elapsed = Date.now() - startTime;
    recordSuccess(SERVICE_WHISPER);

    logger.info(
      `✅ [Whisper] Terminé en ${elapsed}ms : ${text.length} caractères, langue=${language || 'inconnue'}`
    );

    return {
      text,
      language,
      duration,
      provider: 'whisper',
    };
  } catch (error: any) {
    const status = error.status || error.response?.status;
    const message = error.message || 'Erreur inconnue';

    logger.error(`❌ [Whisper] Erreur ${status || 'ERR'} : ${message}`);

    // ✅ Messages d'erreur clairs selon le code HTTP
    let userMessage = message;
    if (status === 401) userMessage = 'Clé OpenAI invalide';
    else if (status === 429) userMessage = 'Quota OpenAI dépassé';
    else if (status === 413) userMessage = 'Fichier trop volumineux pour Whisper';
    else if (status === 400) userMessage = 'Format audio non supporté par Whisper';

    recordFailure(SERVICE_WHISPER, new Error(userMessage));

    throw new Error(userMessage);
  }
};

export default {
  transcribeWithWhisper,
  isWhisperConfigured,
};
