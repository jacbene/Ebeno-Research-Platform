// backend/src/routes/webhookRoutes.ts
import { Router } from 'express'; // ✅ 'express' retiré car inutilisé
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

import { handleCamPayWebhook } from '../controllers/paymentWebhookController';

const router = Router();

// ✅ Webhook CamPay
// Les données x-www-form-urlencoded sont déjà parsées par le middleware global dans server.ts
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
