// backend/src/routes/fileRoutes.ts
import { Router } from 'express';
import {
  uploadFile,
  getFiles,
  deleteFile,
  getTrashedFiles,
  restoreFile,
  permanentlyDeleteFile,
  emptyTrash,
  previewFile,
  editFile,
  listFileVersions,
  getFileText,
  restoreVersion,
} from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authenticate, uploadFile);
router.get('/', authenticate, getFiles);

// ✅ Preview + Édition
router.get('/:fileId/preview', authenticate, previewFile);
router.post('/:fileId/restore/:version', authenticate, restoreVersion);
router.put('/:fileId/edit', authenticate, editFile);
router.get('/:fileId/versions', authenticate, listFileVersions);
router.get('/:fileId/text', authenticate, getFileText);
// Corbeille
router.get('/trash', authenticate, getTrashedFiles);
router.delete('/trash/empty', authenticate, emptyTrash);  // ✅ Vider
router.patch('/:fileId/restore', authenticate, restoreFile);
router.delete('/:fileId/permanent', authenticate, permanentlyDeleteFile);

// Soft delete
router.delete('/:fileId', authenticate, deleteFile);

export default router;
