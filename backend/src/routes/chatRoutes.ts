// backend/src/routes/chatRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireProjectMember } from '../middleware/projectAuth';
import {
  listConversations,
  createConversation,
  getConversation,
  deleteConversation,
  postMessage,
  exportConversationToProject,
} from '../controllers/chatController';

const router = Router();

// Toutes les routes de chat nécessitent une authentification
router.use(authenticate);

router.get('/conversations', listConversations);
router.post('/conversations', requireProjectMember, createConversation);
router.get('/conversations/:id', getConversation);
router.delete('/conversations/:id', deleteConversation);

router.post('/conversations/:id/messages', postMessage);
router.post('/conversations/:id/export-to-project', exportConversationToProject);

export default router;
