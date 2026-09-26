import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  saveSubscription,
  removeSubscription,
  getVapidPublicKey,
  isPushConfigured,
} from '../services/pushService';
import { logger } from '../utils/logger';

const router = Router();

// ✅ Public : clé VAPID publique (nécessaire pour subscribe)
router.get('/vapid-public-key', (_req, res) => {
  res.json({
    configured: isPushConfigured(),
    publicKey: getVapidPublicKey(),
  });
});

// ✅ Subscribe
router.post('/subscribe', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: 'Subscription invalide' });
    }

    await saveSubscription(userId, subscription, req.headers['user-agent']);

    res.json({ success: true, message: 'Subscription enregistrée' });
  } catch (err: any) {
    logger.error(`❌ [push] subscribe: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Unsubscribe
router.post('/unsubscribe', authenticate, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint requis' });

    await removeSubscription(endpoint);
    res.json({ success: true, message: 'Subscription supprimée' });
  } catch (err: any) {
    logger.error(`❌ [push] unsubscribe: ${err.message}`);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Status
router.get('/status', authenticate, async (req, res) => {
  const userId = (req as any).user?.id;
  const count = await require('../db/knex').db('push_subscriptions')
    .where({ userId })
    .count('id as count');
  res.json({
    configured: isPushConfigured(),
    subscriptions: Number(count[0]?.count || 0),
  });
});

export default router;
