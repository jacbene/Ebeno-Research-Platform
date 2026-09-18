// backend/src/routes/languageRoutes.ts
import { Router } from 'express';
import {
  getSupportedLanguages,
  getMyLanguage,
  updateMyLanguage,
} from '../controllers/languageController';
import { authenticate } from '../middleware/auth';

const router = Router();

// ✅ Route publique (pas besoin d'auth pour lister les langues)
router.get('/supported', getSupportedLanguages);

// ✅ Routes authentifiées
router.get('/me', authenticate, getMyLanguage);
router.put('/me', authenticate, updateMyLanguage);

export default router;
