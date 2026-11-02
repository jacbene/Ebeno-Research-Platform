// backend/src/routes/paymentRoutes.ts
import { Router } from 'express';
import { createCheckout } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { createDodoCheckout } from '../controllers/dodoController';

const router = Router();

// Route protégée : l'utilisateur doit être connecté
router.post('/checkout', authenticate, createCheckout);
router.post('/checkout/dodo', authenticate, createDodoCheckout);

export default router;

