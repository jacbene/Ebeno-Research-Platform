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

// La route suivante est supprimée car elle utilise des imports manquants.
// Si vous en avez besoin, décommentez et ajoutez les imports appropriés.
// router.post('/:id/process', authenticate, async (req, res) => { ... });

export default router;
