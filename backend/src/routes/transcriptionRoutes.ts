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
  getTranscriptionProgress
} from '../controllers/transcriptionController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadTranscription);
router.get('/', authenticate, getUserTranscriptions);

// ⚠️ Routes spécifiques AVANT /:id pour éviter les conflits
router.get('/trash', authenticate, getTrashedTranscriptions);
router.patch('/:id/restore', authenticate, restoreTranscription);
router.delete('/:id/permanent', authenticate, permanentlyDeleteTranscription);

router.get('/:id', authenticate, getTranscription);
router.get('/:id/progress', authenticate, getTranscriptionProgress);
router.delete('/:id', authenticate, deleteTranscription);

export default router;
