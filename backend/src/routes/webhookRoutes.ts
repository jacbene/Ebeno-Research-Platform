// backend/src/routes/webhookRoutes.ts
import express, { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhookHandler,
  listDeliveries,
  listEvents,
} from '../controllers/webhookController';

// ✅ NOUVEL IMPORT
import { handleCamPayWebhook } from '../controllers/paymentWebhookController';

const router = Router();

// ✅ Webhook CamPay (Reçoit du JSON standard)
// Pas besoin de express.raw ici car express.json() global l'aura déjà parsé
router.post('/payments/campay', handleCamPayWebhook);

// ============================================================================
// ROUTES EXISTANTES (WEBHOOKS UTILISATEURS)
// ============================================================================

// ✅ Public (pour le frontend)
router.get('/events', listEvents);

// ✅ Protégées
router.get('/', authenticate, listWebhooks);
router.post('/', authenticate, createWebhook);
router.put('/:id', authenticate, updateWebhook);
router.delete('/:id', authenticate, deleteWebhook);
router.post('/:id/test', authenticate, testWebhookHandler);
router.get('/:id/deliveries', authenticate, listDeliveries);

export default router;
