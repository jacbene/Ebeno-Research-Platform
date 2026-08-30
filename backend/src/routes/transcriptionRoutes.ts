import { Router } from 'express';
import {
  uploadTranscription,
  getUserTranscriptions,
  getTranscription,
  deleteTranscription,
  getTranscriptionProgress
} from '../controllers/transcriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadTranscription);
router.get('/', authenticate, getUserTranscriptions);
router.get('/:id', authenticate, getTranscription);
router.delete('/:id', authenticate, deleteTranscription);
router.get('/:id/progress', authenticate, getTranscriptionProgress);
// POST /api/transcriptions/:id/process
router.post('/:id/process', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    const doc = await db('transcriptions').where({ id, userId }).first();
    if (!doc) return res.status(404).json({ error: 'Transcription non trouvée' });
    // Lancer le traitement (appel à Deepgram/OpenAI) - déjà fait via processTranscriptionReal
    // Pour l'instant, on simule
    await processTranscriptionReal(id);
    const updated = await db('transcriptions').where({ id }).first();
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
