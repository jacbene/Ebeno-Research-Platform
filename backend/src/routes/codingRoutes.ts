import express from 'express';
import codingController from '../controllers/codingController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// === ROUTES POUR LES CODES ===
router.post('/projects/:projectId/codes', codingController.createCode);
router.get('/projects/:projectId/codes', codingController.getProjectCodes);
router.get('/projects/:projectId/codes/tree', codingController.getCodeTree);
router.put('/codes/:codeId', codingController.updateCode);
router.delete('/codes/:codeId', codingController.deleteCode);

// === ROUTES POUR LES ANNOTATIONS ===
router.post('/annotations', codingController.createAnnotation);
router.get('/documents/:documentId/annotations', codingController.getDocumentAnnotations);
router.get('/transcripts/:transcriptId/annotations', codingController.getTranscriptAnnotations);
router.get('/codes/:codeId/annotations', codingController.getCodeAnnotations);
router.delete('/annotations/:annotationId', codingController.deleteAnnotation);

// === STATISTIQUES ===
router.get('/projects/:projectId/coding-statistics', codingController.getCodingStatistics);

// === ANALYSE IA (à venir) ===
router.post('/projects/:projectId/suggest-codes', codingController.suggestCodes);

export default router;
