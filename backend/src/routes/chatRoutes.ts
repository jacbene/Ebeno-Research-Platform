// backend/src/routes/chatRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  postMessage,
} from '../controllers/chatController';

const router = Router();

router.use(authenticate);

router.get('/conversations', listConversations);
router.post('/conversations', createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

router.post('/conversations/:id/messages', postMessage);

export default router;
