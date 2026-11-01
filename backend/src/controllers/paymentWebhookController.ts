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
  const { reference, status, external_reference, amount, operator, signature } = req.body;

  // 1. Vérifier la signature JWT
  const webhookSecret = process.env.CAMPAY_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    try {
      jwt.verify(signature, webhookSecret);
    } catch (err) {
      console.error('❌ Signature webhook CamPay invalide:', err);
      return res.status(401).send('Invalid signature');
    }
  }

  // 2. Traiter le paiement si succès
  try {
    if (status === 'SUCCESSFUL' && external_reference) {
      // Format attendu: "userId:planId"
      const [userId, planId] = external_reference.split(':');

      if (userId && planId) {
        await db('subscriptions')
          .insert({
            user_id: userId,
            provider: 'campay',
            provider_subscription_id: reference,
            plan: planId,
            status: 'active',
            updated_at: new Date(),
          })
          .onConflict('user_id')
          .merge();

        console.log(`✅ Paiement CamPay validé pour user ${userId}, plan ${planId}`);
      }
    }

    // 3. Répondre 200 pour éviter les re-essais de CamPay
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ Erreur Webhook CamPay:', error);
    res.status(500).send('Internal Server Error');
  }
};

