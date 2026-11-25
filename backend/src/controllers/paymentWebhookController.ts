// backend/src/controllers/paymentWebhookController.ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken'; // ✅ AJOUT
import { db } from '../db/knex'; // ✅ CORRECTION DU CHEMIN (au lieu de ../config/database)

// ==========================================
// LEMON SQUEEZY
// ==========================================
export const handleLemonSqueezyWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['x-signature'] as string;
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET!;

  if (!signature || !secret) {
    return res.status(400).send('Missing signature or secret');
  }

  // req.body est un Buffer ici grâce à express.raw()
  const hmac = crypto.createHmac('sha256', secret);
  const digest = Buffer.from(hmac.update(req.body).digest('hex'), 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (digest.length !== signatureBuffer.length || !crypto.timingSafeEqual(digest, signatureBuffer)) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;

  try {
    if (eventName === 'subscription_created' || eventName === 'subscription_resumed') {
      await db('subscriptions')
        .insert({
          user_id: customData.user_id,
          provider: 'lemonsqueezy',
          provider_subscription_id: payload.data.id,
          plan: customData.plan_id,
          status: 'active',
          updated_at: new Date(),
        })
        .onConflict('user_id')
        .merge();
    } 
    else if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      await db('subscriptions')
        .where({ user_id: customData.user_id })
        .update({ status: 'expired', updated_at: new Date() });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Erreur Webhook Lemon Squeezy:', error);
    res.status(500).send('Internal Server Error');
  }
};

// ==========================================
// CAMPAY (Mobile Money)
// ==========================================
export const handleCamPayWebhook = async (req: Request, res: Response) => {
  const { reference, status, external_reference, signature } = req.body;
  const webhookSecret = process.env.CAMPAY_WEBHOOK_SECRET;

  // 1. Échouer de manière fermée (Fail-Closed) si pas de secret configuré
  if (!webhookSecret) {
    console.error('❌ [CamPay] CAMPAY_WEBHOOK_SECRET non configuré');
    return res.status(500).send('Configuration serveur incomplète');
  }

  // 2. Refuser si aucune signature n'est fournie
  if (!signature) {
    return res.status(401).send('Signature manquante');
  }

  // 3. Vérifier obligatoirement la signature
  try {
    jwt.verify(signature, webhookSecret);
  } catch (err) {
    console.error('❌ Signature webhook CamPay invalide:', err);
    return res.status(401).send('Signature invalide');
  }

  // 4. Traiter le paiement (le code existant est bon)
  try {
    if (status === 'SUCCESSFUL' && external_reference) {
       // ... (garde ton code d'activation d'abonnement)
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erreur Webhook CamPay:', error);
    res.status(500).send('Internal Server Error');
  }
};
