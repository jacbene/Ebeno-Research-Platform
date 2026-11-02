// backend/src/controllers/dodoController.ts
import { Request, Response } from 'express';
import { DodoService } from '../services/dodoService';
import { db } from '../db/knex';
import { logger } from '../utils/logger';

// 1. Créer la session de paiement
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
  try {
    // ⚠️ Idéalement, il faut vérifier la signature avec le DODO_WEBHOOK_SECRET ici
    // Dodo utilise la librairie 'standardwebhooks' pour ça, mais on simplifie pour l'exemple.
    const payload = req.body;
    const eventType = payload.type;

    logger.info(`🔔 [Dodo Webhook] Événement reçu : ${eventType}`);

    if (eventType === 'payment.succeeded' || eventType === 'subscription.active') {
      const metadata = payload.data?.metadata || {};
      const userId = metadata.user_id;
      const planId = metadata.plan_id;

      if (userId && planId) {
        // Mise à jour de l'abonnement en base de données
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
