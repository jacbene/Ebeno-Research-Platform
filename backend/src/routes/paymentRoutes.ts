// backend/src/routes/paymentRoutes.ts
import { Router } from 'express';
import { createCheckout } from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Route protégée : l'utilisateur doit être connecté
router.post('/checkout', authenticate, createCheckout);

export default router;

