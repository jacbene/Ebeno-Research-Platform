import { Router } from 'express';
import { uploadFile, getFiles, deleteFile } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', authenticate, uploadFile);
router.get('/', authenticate, getFiles);
router.delete('/:fileId', authenticate, deleteFile);

export default router;
