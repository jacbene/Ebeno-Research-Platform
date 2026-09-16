// backend/src/routes/transcriptionRoutes.ts
import { Router } from 'express';
import {
  uploadTranscription,
  getUserTranscriptions,
  getTranscription,
  deleteTranscription,
  getTrashedTranscriptions,
  restoreTranscription,
  permanentlyDeleteTranscription,
  emptyTrashTranscriptions,
  retryTranscription,
  getTranscriptionProgress,
} from '../controllers/transcriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Upload
router.post('/upload', authenticate, uploadTranscription);

// Liste et corbeille
router.get('/', authenticate, getUserTranscriptions);
router.get('/trash', authenticate, getTrashedTranscriptions);

// Actions spécifiques (avant /:id)
router.delete('/trash/empty', authenticate, emptyTrashTranscriptions);
router.post('/:id/retry', authenticate, retryTranscription);
router.patch('/:id/restore', authenticate, restoreTranscription);
router.delete('/:id/permanent', authenticate, permanentlyDeleteTranscription);
router.get('/:id/progress', authenticate, getTranscriptionProgress);

// Routes génériques (en dernier)
router.get('/:id', authenticate, getTranscription);
router.delete('/:id', authenticate, deleteTranscription);

export default router;
