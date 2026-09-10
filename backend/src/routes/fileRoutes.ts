// backend/src/routes/fileRoutes.ts
import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  deleteFile,
  getTrashedFiles,
  restoreFile,
  permanentlyDeleteFile,
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

// Upload et liste
router.post('/', authenticate, uploadFile);
router.get('/', authenticate, getFiles);

// ⚠️ IMPORTANT : les routes spécifiques (trash) doivent être AVANT /:fileId
router.get('/trash', authenticate, getTrashedFiles);

// Restauration et suppression définitive
router.patch('/:fileId/restore', authenticate, restoreFile);
router.delete('/:fileId/permanent', authenticate, permanentlyDeleteFile);

// Soft delete (déplacer à la corbeille)
router.delete('/:fileId', authenticate, deleteFile);

export default router;
