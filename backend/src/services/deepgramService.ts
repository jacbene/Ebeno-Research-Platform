import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { db } from '../db/knex';

const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
if (!DEEPGRAM_API_KEY) {
  console.error('❌ DEEPGRAM_API_KEY non définie dans le fichier .env');
  process.exit(1);
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

    await db('transcriptions').where({ id: transcriptionId }).update({
      status: TranscriptionStatus.PROCESSING,
      updated_at: Date.now()
    });

    const audioPath = path.join(__dirname, '../../uploads/tmp', path.basename(transcription.audioUrl || ''));
    if (!fs.existsSync(audioPath)) throw new Error(`Fichier introuvable: ${audioPath}`);

    // Lire le fichier et créer un FormData
    const audioFile = fs.createReadStream(audioPath);
    const formData = new FormData();
    formData.append('audio', audioFile);

    // Appel à l'API Deepgram avec axios
    const response = await axios.post(DEEPGRAM_URL, formData, {
      params: {
        model: 'nova-2',
        language: 'fr',
        smart_format: 'true',
        punctuate: 'true',
        diarize: 'false',
      },
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    const transcriptText = response.data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    await db('transcriptions').where({ id: transcriptionId }).update({
      transcriptText,
      status: TranscriptionStatus.COMPLETED,
      updated_at: Date.now()
    });

    console.log(`✅ Transcription Deepgram ${transcriptionId} terminée`);

  } catch (error: any) {
    console.error(`❌ Erreur Deepgram ${transcriptionId}:`, error.message);
    if (error.response) {
      console.error('Détails Deepgram:', error.response.data);
    }
    await db('transcriptions').where({ id: transcriptionId }).update({
      status: TranscriptionStatus.FAILED,
      errorMessage: error.message || 'Erreur inconnue',
      updated_at: Date.now()
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
    created_at: Date.now(),
    updated_at: Date.now()
  });

  processTranscriptionDeepgram(id).catch(err => console.error('Erreur asynchrone:', err));
  return { id, message: 'Transcription démarrée', status: 'PENDING' };
};

export default {
  processTranscriptionDeepgram,
  uploadAndProcessDeepgram,
};
