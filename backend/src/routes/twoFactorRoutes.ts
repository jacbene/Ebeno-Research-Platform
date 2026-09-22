// backend/src/routes/twoFactorRoutes.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  setup2FA,
  enable2FA,
  disable2FA,
  get2FAStatus,
  regenerateBackupCodes,
} from '../controllers/twoFactorController';

const router = Router();

// Toutes les routes nécessitent d'être authentifié
router.get('/status', authenticate, get2FAStatus);
router.post('/setup', authenticate, setup2FA);
router.post('/enable', authenticate, enable2FA);
router.post('/disable', authenticate, disable2FA);
router.post('/backup-codes/regenerate', authenticate, regenerateBackupCodes);

export default router;
