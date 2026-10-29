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
import { detectLanguage } from './languageDetectionService';
import { decrypt } from './encryptionService';
import { canSendEmail } from './emailPreferencesService';
import { sendTranscriptionCompleteEmail } from './emailService';
import { transcribeWithWhisper, isWhisperConfigured } from './whisperService';
import { refundAiQuota } from './aiQuotaService';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_API_KEY) {
  logger.error('❌ DEEPGRAM_API_KEY non définie dans le fichier .env');
}

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';
const SERVICE_DEEPGRAM = 'deepgram';

const TranscriptionStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

// ✅ Helper : déchiffre l'email si nécessaire
const getUserEmail = (user: any): string => {
  if (user?.emailEncrypted) {
    const decrypted = decrypt(user.emailEncrypted);
    if (decrypted) return decrypted;
  }
  return user?.email || '';
};

// ============================================================
// ✅ FALLBACK WHISPER
// ============================================================
const tryWhisperFallback = async (
  transcriptionId: string,
  audioUrl: string // ✅ On passe l'URL
): Promise<{ text: string; language: string | null } | null> => {
  if (!isWhisperConfigured()) return null;
  if (!isServiceAvailable('whisper')) return null;

  try {
    logger.info(`🔄 [Fallback] Téléchargement Cloudinary pour Whisper...`);
    
    // ✅ Télécharger le fichier depuis Cloudinary
    const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);
    
    // Sauvegarde temporaire dans /tmp (autorisé par Render/Node)
    const tempPath = path.join('/tmp', `${transcriptionId}.mp3`);
    fs.writeFileSync(tempPath, buffer);

    const result = await transcribeWithWhisper(tempPath);
    
    // Nettoyage
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

    return { text: result.text, language: result.language };
  } catch (err: any) {
    logger.warn(`⚠️ [Fallback] Whisper échoué : ${err.message}`);
    return null;
  }
};

// ============================================================
// ✅ NOTIFICATION EMAIL (non bloquant)
// ============================================================
const notifyTranscriptionComplete = async (
  transcriptionId: string,
  transcription: any
): Promise<void> => {
  (async () => {
    try {
      const uploader = await db('users').where({ id: transcription.userId }).first();
      if (!uploader) return;

      const wantsEmail = await canSendEmail(uploader.id, 'transcriptionComplete');
      if (!wantsEmail) {
        logger.info(`ℹ️  [email] ${uploader.id} a désactivé les notifs "transcription terminée"`);
        return;
      }

      const to = getUserEmail(uploader);
      if (!to) {
        logger.warn(`⚠️ [email] Pas d'email pour ${uploader.id}`);
        return;
      }

      await sendTranscriptionCompleteEmail({
        to,
        name: uploader.name || 'chercheur',
        transcriptionTitle: transcription.title || 'Transcription',
        projectId: transcription.projectId || '',
        lang: uploader.language || 'fr',
      });
    } catch (err: any) {
      logger.warn(`⚠️ [email] Échec notif "transcription terminée": ${err.message}`);
    }
  })();
};

// ============================================================
// ✅ CASCADE : Deepgram → Whisper
// ============================================================
export const processTranscriptionDeepgram = async (transcriptionId: string) => {
  try {
    const transcription = await db('transcriptions').where({ id: transcriptionId }).first();
    if (!transcription) throw new Error('Transcription introuvable');

    // Marquer PROCESSING
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

    // ============================================================
    // ÉTAPE 1 : Deepgram
    // ============================================================
    let transcriptText: string | null = null;
    let detectedLang: string | null = null;
    let provider = 'deepgram';
    let deepgramError: string | null = null;

    if (DEEPGRAM_API_KEY && isServiceAvailable(SERVICE_DEEPGRAM)) {
      try {
        logger.info(`🎙️ [Deepgram] Transcription en cours pour ${transcriptionId}...`);

        const audioFile = fs.createReadStream(audioPath);
        const formData = new FormData();
        formData.append('audio', audioFile);

        // ✅ NOUVEAU : Deepgram accepte directement l'URL Cloudinary
const response = await axios.post(
  DEEPGRAM_URL,
  { url: transcription.audioUrl }, // ✅ On passe l'URL
  {
    params: {
      model: 'nova-2',
      detect_language: 'true',
      smart_format: 'true',
      punctuate: 'true',
      diarize: 'false',
      filler_words: 'false',
    },
    headers: {
      Authorization: `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'application/json', // ✅ JSON au lieu de multipart
    },
    timeout: 5 * 60 * 1000,
  }
);

        recordSuccess(SERVICE_DEEPGRAM);

        transcriptText =
          response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

        // Deepgram retourne detected_language dans les résultats
        detectedLang =
          response.data?.results?.channels?.[0]?.detected_language ||
          detectLanguage(transcriptText).language;

        logger.info(
          `✅ [Deepgram] Transcription ${transcriptionId} : ${transcriptText.length} caractères, langue=${detectedLang || '?'}`
        );
      } catch (err: any) {
        const status = err.response?.status;
        const errorData = err.response?.data
          ? JSON.stringify(err.response.data)
          : err.message;

        logger.warn(
          `⚠️ [Deepgram] Échec (${status || 'ERR'}) pour ${transcriptionId} : ${errorData}`
        );
        deepgramError = `${status || 'ERR'} : ${errorData}`;

        recordFailure(SERVICE_DEEPGRAM, new Error(deepgramError));
      }
    } else {
      logger.info('⏭️ [Deepgram] Ignoré (circuit ouvert ou clé absente)');
      deepgramError = 'Circuit ouvert ou clé absente';
    }

    // ============================================================
    // ÉTAPE 2 : Fallback Whisper (si Deepgram a échoué)
    // ============================================================
    if (!transcriptText && deepgramError) {
      logger.info(`🔄 [Cascade] Bascule vers Whisper pour ${transcriptionId}...`);

      const whisperResult = await tryWhisperFallback(transcriptionId, audioPath);

      if (whisperResult) {
        transcriptText = whisperResult.text;
        detectedLang = whisperResult.language;
        provider = 'whisper';
      } else {
        // Les 2 services ont échoué
        throw new Error(
          `Deepgram: ${deepgramError}. Whisper: indisponible ou échec.`
        );
      }
    }

    // ============================================================
    // ÉTAPE 3 : Sauvegarder le résultat
    // ============================================================
    if (!transcriptText) {
      throw new Error('Aucun texte transcrit (résultat vide)');
    }

    await db('transcriptions').where({ id: transcriptionId }).update({
      transcriptText,
      status: TranscriptionStatus.COMPLETED,
      language: detectedLang,
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    });

    logger.info(
      `✅ [Cascade] Transcription ${transcriptionId} terminée via ${provider}`
    );

    // ✅ Notifier par email (non bloquant)
    const updated = await db('transcriptions').where({ id: transcriptionId }).first();
    await notifyTranscriptionComplete(transcriptionId, updated || transcription);
  } catch (error: any) {
  logger.error(`❌ [Cascade] Erreur finale ${transcriptionId} : ${error.message}`);

  // ✅ Récupérer la transcription AVANT de la marquer FAILED
  //    pour vérifier si le quota a déjà été remboursé
  const failedTranscription = await db('transcriptions')
    .where({ id: transcriptionId })
    .first();

  await db('transcriptions').where({ id: transcriptionId }).update({
    status: TranscriptionStatus.FAILED,
    errorMessage: error.message || 'Erreur inconnue',
    updatedAt: new Date().toISOString(),
  });

  // ✅ REMBOURSEMENT : ne rembourse que si pas déjà fait
  if (failedTranscription && !failedTranscription.quotaRefunded && failedTranscription.userId) {
    await refundAiQuota(failedTranscription.userId);
    await db('transcriptions')
      .where({ id: transcriptionId })
      .update({ quotaRefunded: true });
    logger.info(`💸 [Quota] 1 crédit remboursé à ${failedTranscription.userId} (échec transcription ${transcriptionId})`);
  }
}
};

// ============================================================
// UPLOAD + LANCEMENT
// ============================================================
export const uploadAndProcessDeepgram = async (
  audioUrl: string, // ✅ Devient une URL au lieu d'un objet File
  userId: string,
  projectId?: string,
  originalName?: string
) => {
  const id = Date.now().toString();

  await db('transcriptions').insert({
    id,
    userId,
    projectId: projectId || null,
    title: originalName || 'Transcription sans titre',
    status: TranscriptionStatus.PENDING,
    audioUrl, // ✅ Stocke l'URL Cloudinary
    transcriptText: null,
    errorMessage: null,
    quotaRefunded: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  logger.info(`📥 [Cascade] Nouvelle transcription ${id} (Cloudinary)`);

  processTranscriptionDeepgram(id).catch((err) =>
    logger.error('Erreur asynchrone transcription:', err)
  );

  return { id, message: 'Transcription démarrée', status: 'PENDING' };
};

export default {
  processTranscriptionDeepgram,
  uploadAndProcessDeepgram,
};
