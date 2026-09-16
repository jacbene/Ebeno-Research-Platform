// backend/src/routes/transcriptionRoutes.ts
import {
  uploadTranscription,
  getUserTranscriptions,
  getTranscription,
  deleteTranscription,
  getTrashedTranscriptions,
  restoreTranscription,
  permanentlyDeleteTranscription,
  emptyTrashTranscriptions,
  retryTranscription,   // ✅ NOUVEAU
  getTranscriptionProgress,
} from '../controllers/transcriptionController';

import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadTranscription);
router.get('/', authenticate, getUserTranscriptions);

// Corbeille
router.get('/trash', authenticate, getTrashedTranscriptions);
router.delete('/trash/empty', authenticate, emptyTrashTranscriptions);  // ✅
router.patch('/:id/restore', authenticate, restoreTranscription);
router.delete('/:id/permanent', authenticate, permanentlyDeleteTranscription);

// ✅ Relancer une transcription échouée
router.post('/:id/retry', authenticate, retryTranscription);
router.get('/:id', authenticate, getTranscription);
router.get('/:id/progress', authenticate, getTranscriptionProgress);
router.delete('/:id', authenticate, deleteTranscription);

export default router;
