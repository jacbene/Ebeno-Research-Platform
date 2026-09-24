// backend/src/routes/translationRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  translateDocumentHandler,
  getTranslationHandler,
  listTranslationsHandler,
  deleteTranslationHandler,
  translationStatusHandler,
} from '../controllers/translationController';

const router = Router();

// ============================================================
// ROUTES PUBLIQUES (pas d'auth requise)
// ============================================================

// ✅ Status du service (frontend utilise pour disable le bouton si HS)
router.get('/status', translationStatusHandler);

// ============================================================
// ROUTES PROTÉGÉES (auth JWT)
// ============================================================

// ✅ Traduire un document
router.post(
  '/:documentType/:documentId',
  authenticate,
  translateDocumentHandler
);

// ✅ Lister toutes les traductions d'un document
router.get(
  '/:documentType/:documentId/all',
  authenticate,
  listTranslationsHandler
);

// ✅ Récupérer une traduction précise
router.get(
  '/:documentType/:documentId',
  authenticate,
  getTranslationHandler
);

// ✅ Supprimer une traduction
router.delete('/:id', authenticate, deleteTranslationHandler);

export default router;
