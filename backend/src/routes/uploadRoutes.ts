import { Router } from 'express';
import { uploadFile } from '../controllers/uploadController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, uploadFile);

export default router;
