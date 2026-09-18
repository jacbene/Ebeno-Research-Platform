// backend/src/services/deepgramService.ts
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { db } from '../db/knex';
import { isServiceAvailable, recordFailure, recordSuccess } from './circuitBreaker';
import { logger } from '../utils/logger';
import { detectLanguage } from './languageDetectionService';   // ✅ NOUVEAU

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_API_KEY) {
  logger.error('❌ DEEPGRAM_API_KEY non définie dans le fichier .env');
}

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';

const TranscriptionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const processTranscriptionDeepgram = async (transcriptionId: string) => {
  try {
    const transcription = await db('transcriptions').where({ id: transcriptionId }).first();
    if (!transcription) throw new Error('Transcription introuvable');

    if (!isServiceAvailable('deepgram')) {
      logger.warn(`⏭️ [Deepgram] Circuit ouvert, transcription ${transcriptionId} annulée`);
      await db('transcriptions').where({ id: transcriptionId }).update({
        status: TranscriptionStatus.FAILED,
        errorMessage: 'Service Deepgram temporairement indisponible (clé invalide ou quota)',
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    if (!DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY non configurée');
    }

    await db('transcriptions').where({ id: transcriptionId }).update({
      status: TranscriptionStatus.PROCESSING,
      updatedAt: new Date().toISOString(),
    });

    const audioPath = path.join(
      __dirname,
      '../../uploads/tmp',
      path.basename(transcription.audioUrl || '')
    );

    if (!fs.existsSync(audioPath)) {
      throw new Error(`Fichier introuvable: ${audioPath}`);
    }

    logger.info(`🎙️ [Deepgram] Transcription en cours pour ${transcriptionId}...`);

    const audioFile = fs.createReadStream(audioPath);
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await axios.post(DEEPGRAM_URL, formData, {
      params: {
        model: 'nova-2',
        language: 'fr',
        smart_format: 'true',
        punctuate: 'true',
        diarize: 'false',
        filler_words: 'false',
      },
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 5 * 60 * 1000,
    });

    recordSuccess('deepgram');

    const transcriptText =
      response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    // ✅ NOUVEAU : détecter la langue du texte transcrit
    const detection = detectLanguage(transcriptText);
    logger.info(
      `🌍 [Deepgram] Langue détectée pour ${transcriptionId} : ` +
      `${detection.language || 'indéterminée'} (confiance: ${detection.confidence})`
    );

    await db('transcriptions').where({ id: transcriptionId }).update({
      transcriptText,
      status: TranscriptionStatus.COMPLETED,
      language: detection.language,   // ✅ 'fr' | 'en' | ... | null
      updatedAt: new Date().toISOString(),
    });

    logger.info(
      `✅ [Deepgram] Transcription ${transcriptionId} terminée : ${transcriptText.length} caractères`
    );
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data
      ? JSON.stringify(error.response.data)
      : error.message;

    logger.error(`❌ [Deepgram] Erreur ${transcriptionId} : ${error.message}`);
    if (error.response) {
      logger.error(`Détails Deepgram (${status}) :`, { data: error.response.data });
    }

    const fullError = new Error(`${status || 'ERR'} : ${errorData}`);
    recordFailure('deepgram', fullError);

    await db('transcriptions').where({ id: transcriptionId }).update({
      status: TranscriptionStatus.FAILED,
      errorMessage: error.message || 'Erreur inconnue',
      updatedAt: new Date().toISOString(),
    });
  }
};

export const uploadAndProcessDeepgram = async (
  file: Express.Multer.File,
  userId: string,
  projectId?: string
) => {
  const id = Date.now().toString();
  const audioUrl = `/uploads/${file.filename}`;

  await db('transcriptions').insert({
    id,
    userId,
    projectId: projectId || null,
    title: file.originalname || 'Transcription sans titre',
    status: TranscriptionStatus.PENDING,
    audioUrl,
    transcriptText: null,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  logger.info(`📥 [Deepgram] Nouvelle transcription ${id} : ${file.originalname}`);

  processTranscriptionDeepgram(id).catch((err) =>
    logger.error('Erreur asynchrone Deepgram:', err)
  );

  return { id, message: 'Transcription démarrée', status: 'PENDING' };
};

export default {
  processTranscriptionDeepgram,
  uploadAndProcessDeepgram,
};
