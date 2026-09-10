// backend/src/routes/fileRoutes.ts
import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  deleteFile,
  getTrashedFiles,
  restoreFile,
  permanentlyDeleteFile,
  emptyTrash,   // ✅
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authenticate, uploadFile);
router.get('/', authenticate, getFiles);

// Corbeille
router.get('/trash', authenticate, getTrashedFiles);
router.delete('/trash/empty', authenticate, emptyTrash);  // ✅ Vider
router.patch('/:fileId/restore', authenticate, restoreFile);
router.delete('/:fileId/permanent', authenticate, permanentlyDeleteFile);

// Soft delete
router.delete('/:fileId', authenticate, deleteFile);

export default router;
