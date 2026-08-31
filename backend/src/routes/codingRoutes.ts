import { Router } from 'express';
import {
  getCodes,
  createCode,
  updateCode,
  deleteCode,
  assignCodeToDocument,
  removeCodeFromDocument,
  getDocumentCodes,
  getCodeFrequencies
} from '../controllers/codingController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Routes pour les codes (CRUD)
router.get('/project/:projectId', authenticate, getCodes);
router.post('/project/:projectId', authenticate, createCode);
router.put('/project/:projectId/code/:codeId', authenticate, updateCode);
router.delete('/project/:projectId/code/:codeId', authenticate, deleteCode);

// Routes pour les associations codes-documents
router.post('/document/:documentId/assign', authenticate, assignCodeToDocument);
router.delete('/document/:documentId/code/:codeId', authenticate, removeCodeFromDocument);
router.get('/document/:documentId/codes', authenticate, getDocumentCodes);

// Route pour les fréquences d'utilisation
router.get('/project/:projectId/frequencies', authenticate, getCodeFrequencies);

export default router;
