import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/knex';

export const handlePaddleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signatureHeader = req.headers['paddle-signature'] as string;
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : '';

  if (!signatureHeader || !rawBody) {
    res.status(400).send('Signature ou body manquant');
    return;
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET!;

  // 1. Vérification manuelle de la signature
  const parts = signatureHeader.split(';');
  const ts = parts.find(p => p.startsWith('ts='))?.slice(3);
  const h1 = parts.find(p => p.startsWith('h1='))?.slice(3);

  if (!ts || !h1) {
    res.status(400).send('Format de signature invalide');
    return;
  }

  const signedPayload = `${ts}:${rawBody}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  if (expectedHmac !== h1) {
    console.error('❌ Webhook Paddle : Signature invalide');
    res.status(400).send('Signature invalide');
    return;
  }

  // 2. Parsing du JSON
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    res.status(400).send('JSON invalide');
    return;
  }

  const { event_id, event_type, data } = event;
  console.log(`✅ Webhook Paddle reçu et validé : ${event_type} (${event_id})`);

  try {
    // 3. Idempotence (on ne traite pas 2 fois le même événement)
    const existingEvent = await db('webhook_events').where({ paddle_event_id: event_id }).first();
    if (existingEvent) {
      console.log(`⏩ Événement ${event_id} déjà traité.`);
      res.status(200).send('Événement déjà traité');
      return;
    }

    // 4. Traitement des événements d'abonnement
    if (event_type === 'subscription.created' || event_type === 'subscription.updated') {
      const userId = data.custom_data?.userId;
      
      if (userId) {
        const existingSub = await db('subscriptions').where({ user_id: userId }).first();
        
        const subData = {
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          plan: 'pro',
          status: data.status,
          current_period_end: data.current_billing_period?.ends_at,
          updated_at: new Date()
        };

        if (existingSub) {
          await db('subscriptions').where({ id: existingSub.id }).update(subData);
          console.log(`🔄 Abonnement mis à jour pour l'utilisateur ${userId}`);
        } else {
          await db('subscriptions').insert({ ...subData, created_at: new Date() });
          console.log(`✨ Nouvel abonnement créé pour l'utilisateur ${userId}`);
        }
      }
    } 
    else if (event_type === 'subscription.canceled') {
      await db('subscriptions')
        .where({ paddle_subscription_id: data.id })
        .update({ status: 'canceled', updated_at: new Date() });
      console.log(`🚫 Abonnement annulé : ${data.id}`);
    }

    // 5. Enregistrement de l'événement pour l'idempotence
    await db('webhook_events').insert({
      paddle_event_id: event_id,
      event_type: event_type
    });

    res.status(200).send('Webhook traité avec succès');

  } catch (error: any) {
    console.error('❌ Erreur lors du traitement du webhook en base :', error);
    res.status(500).send('Erreur interne');
  }
};
