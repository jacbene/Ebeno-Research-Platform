import { Router } from 'express';
import { uploadText, getTexts } from '../controllers/textController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, uploadText);
router.get('/', authenticate, getTexts);

export default router;
