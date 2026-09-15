// backend/src/routes/collaborationRoutes.ts
import { Router } from 'express';
import {
  createDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} from '../controllers/collaborationController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, createDocument);
router.get('/project/:projectId', authenticate, getDocuments);
router.get('/:id', authenticate, getDocument);
router.put('/:id', authenticate, updateDocument);   // ✅ NOUVEAU
router.delete('/:id', authenticate, deleteDocument);

export default router;
