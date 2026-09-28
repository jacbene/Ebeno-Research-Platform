import { Router } from 'express';
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

const router = Router();

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
