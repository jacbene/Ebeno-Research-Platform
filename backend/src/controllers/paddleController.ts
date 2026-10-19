import { Request, Response } from 'express';
import { Paddle, Environment, EventName } from '@paddle/paddle-node-sdk';
import { db } from '../db/knex';

// On initialise le SDK avec ta clé API Sandbox
const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
  environment: process.env.PADDLE_ENVIRONMENT === 'sandbox' ? Environment.sandbox : Environment.production,
});

export const handlePaddleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['paddle-signature'] as string;
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : '';

  // 🕵️‍♂️ LOGS DE DEBUG
  console.log('--- NOUVEAU WEBHOOK PADDLE ---');
  console.log('🔍 Content-Type:', req.headers['content-type']);
  console.log('🔍 Body length:', rawBody.length);
  console.log('🔍 Signature présente ?', !!signature);
  console.log('🔍 Signature (début):', signature?.substring(0, 30));
  console.log('------------------------------');

  if (!signature || !rawBody) {
    res.status(400).send('Signature ou body manquant');
    return;
  }
  // ... suite du code (try/catch)
  try {
    // 1. Vérification de la signature (sécurité)
    const event = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    );

    // 2. Idempotence : on vérifie si on n'a pas déjà traité cet événement
    const existingEvent = await db('webhook_events').where({ paddle_event_id: event.eventId }).first();
    if (existingEvent) {
      res.status(200).send('Événement déjà traité');
      return;
    }

    // 3. Traitement des événements d'abonnement
    if (event.eventType === EventName.SubscriptionCreated || event.eventType === EventName.SubscriptionUpdated) {
      const subscription = event.data;
      const userId = subscription.customData?.userId; // On récupérera l'ID utilisateur depuis le checkout
      
      if (userId) {
        // On met à jour ou on crée l'abonnement dans Neon
        const existingSub = await db('subscriptions').where({ user_id: userId }).first();
        
        const subData = {
          user_id: userId,
          paddle_subscription_id: subscription.id,
          paddle_customer_id: subscription.customerId,
          plan: 'pro',
          status: subscription.status,
          current_period_end: subscription.currentBillingPeriod?.endsAt,
          updated_at: new Date()
        };

        if (existingSub) {
          await db('subscriptions').where({ id: existingSub.id }).update(subData);
        } else {
          await db('subscriptions').insert({ ...subData, created_at: new Date() });
        }
      }
    } 
    else if (event.eventType === EventName.SubscriptionCanceled) {
      const subscription = event.data;
      await db('subscriptions')
        .where({ paddle_subscription_id: subscription.id })
        .update({ status: 'canceled', updated_at: new Date() });
    }

    // 4. On enregistre l'événement pour ne pas le retraiter
    await db('webhook_events').insert({
      paddle_event_id: event.eventId,
      event_type: event.eventType
    });

    // 5. On répond à Paddle qu'on a bien reçu le message
    res.status(200).send('Webhook traité avec succès');

  } catch (error: any) {
    console.error('Erreur Webhook Paddle:', error);
    res.status(400).send(`Erreur Webhook: ${error.message}`);
  }
};
