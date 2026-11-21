// backend/src/services/whisperLocalService.ts
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { logger } from '../utils/logger';
import { isServiceAvailable, recordFailure, recordSuccess } from './circuitBreaker';

const WHISPER_LOCAL_URL = process.env.WHISPER_LOCAL_URL || '';
const WHISPER_LOCAL_LANG = process.env.WHISPER_LOCAL_LANG || 'fr';
const SERVICE_WHISPER_LOCAL = 'whisper-local';

export interface WhisperLocalResult {
  text: string;
  language: string | null;
  provider: 'whisper-local';
}

export const isWhisperLocalConfigured = (): boolean => {
  return !!WHISPER_LOCAL_URL;
};

/**
 * Envoie un fichier audio local à un serveur Whisper auto-hébergé
 * (ex: onerahmet/openai-whisper-asr-webservice).
 * API attendue : POST {WHISPER_LOCAL_URL}/asr avec multipart/form-data
 */
export const transcribeWithWhisperLocal = async (
  audioPath: string,
  languageHint?: string
): Promise<WhisperLocalResult> => {
  if (!WHISPER_LOCAL_URL) {
    throw new Error('WHISPER_LOCAL_URL non configurée');
  }

  if (!isServiceAvailable(SERVICE_WHISPER_LOCAL)) {
    throw new Error('Whisper Local temporairement indisponible (circuit ouvert)');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Fichier audio introuvable: ${audioPath}`);
  }

  const lang = languageHint || WHISPER_LOCAL_LANG;
  const sizeMB = fs.statSync(audioPath).size / (1024 * 1024);
  logger.info(
    `🎧 [Whisper Local] Transcription ${path.basename(audioPath)} (${sizeMB.toFixed(1)} MB, lang=${lang})...`
  );

  const startTime = Date.now();

  try {
    const form = new FormData();
    form.append('audio_file', fs.createReadStream(audioPath));

    const response = await axios.post(
      `${WHISPER_LOCAL_URL}/asr`,
      form,
      {
        params: {
          output: 'json',
          language: lang,
          encode: 'true',       // retourne un texte simple
          task: 'transcribe',
        },
        headers: form.getHeaders(),
        timeout: 10 * 60 * 1000, // 10 min (fichiers longs)
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    // Le serveur retourne soit une string brute, soit { text, language }
    const data = response.data;
    const text =
      typeof data === 'string'
        ? data
        : data?.text || data?.transcription || '';
    const language = typeof data === 'object' ? data?.language || lang : lang;

    const elapsed = Date.now() - startTime;
    recordSuccess(SERVICE_WHISPER_LOCAL);

    logger.info(
      `✅ [Whisper Local] Terminé en ${elapsed}ms : ${text.length} caractères, langue=${language || '?'}`
    );

    return { text, language, provider: 'whisper-local' };
  } catch (error: any) {
    const status = error.response?.status;
    const message = error.message || 'Erreur inconnue';

    logger.error(`❌ [Whisper Local] Erreur ${status || 'ERR'} : ${message}`);
    recordFailure(SERVICE_WHISPER_LOCAL, new Error(message));

    throw new Error(`Whisper Local: ${message}`);
  }
};

export default {
  transcribeWithWhisperLocal,
  isWhisperLocalConfigured,
};
