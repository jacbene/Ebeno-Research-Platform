// backend/src/controllers/dodoController.ts
import { Request, Response } from 'express';
import { DodoService } from '../services/dodoService';
import { db } from '../db/knex';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export const createDodoCheckout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;
    const userName = (req as any).user?.name || 'Chercheur';
    const { planId } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const appUrl = process.env.FRONTEND_URL || 'https://ebeno-frontend.onrender.com';

    const { url } = await DodoService.createCheckoutSession({
      userId,
      userEmail,
      userName,
      planId,
      successUrl: `${appUrl}/payment/success`,
    });

    return res.json({ success: true, url });
  } catch (error: any) {
    logger.error('❌ Erreur création checkout Dodo:', error);
    return res.status(500).json({ error: error.message });
  }
};

// 2. Webhook pour valider le paiement
export const handleDodoWebhook = async (req: Request, res: Response) => {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_SECRET;
  const signature = req.headers['webhook-signature'] as string;
  
  if (!secret) {
    logger.error('❌ [Dodo] DODO_PAYMENTS_WEBHOOK_SECRET non configuré');
    return res.status(500).send('Configuration manquante');
  }
  if (!signature) {
    return res.status(401).send('Signature manquante');
  }

  // ✅ Puisque la route utilise express.raw(), req.body EST le Buffer brut
  const rawBody = req.body;
  if (!Buffer.isBuffer(rawBody)) {
    return res.status(500).send('Raw body non disponible');
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    logger.warn('⚠️ [Dodo] Tentative de webhook avec signature invalide');
    return res.status(401).send('Signature invalide');
  }

  try {
    // ✅ On parse le JSON SEULEMENT après avoir vérifié la signature
    const payload = JSON.parse(rawBody.toString());
    const eventType = payload.type;
    logger.info(`🔔 [Dodo Webhook] Événement validé : ${eventType}`);

    if (eventType === 'payment.succeeded' || eventType === 'subscription.active') {
      const metadata = payload.data?.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;

      if (userId && planId) {
        await db('subscriptions')
          .insert({
            user_id: userId,
            provider: 'dodo',
            provider_subscription_id: payload.data.subscription_id || payload.data.payment_id,
            plan: planId,
            status: 'active',
            updated_at: new Date(),
          })
          .onConflict('user_id')
          .merge();
          
        logger.info(`✅ Paiement Dodo validé pour user ${userId}, plan ${planId}`);
      }
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('❌ Erreur Webhook Dodo:', error);
    return res.status(500).send('Internal Server Error');
  }
};

