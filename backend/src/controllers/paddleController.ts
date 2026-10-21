import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/knex';
import { sendSubscriptionConfirmationEmail } from '../services/emailService';

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

  const expectedHmac = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');

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

  try {
    // 3. Idempotence (on ne traite pas 2 fois le même événement)
    const existingEvent = await db('webhook_events').where({ paddle_event_id: event_id }).first();
    if (existingEvent) {
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

          // ✅ ENVOI DE L'EMAIL DE CONFIRMATION (uniquement à la création)
          try {
            const user = await db('users').where({ id: userId }).first();
            if (user) {
              await sendSubscriptionConfirmationEmail({
                to: user.email,
                name: user.name || 'chercheur',
                plan: 'pro',
                nextDate: data.current_billing_period?.ends_at,
                lang: user.language || 'fr',
              });
            }
          } catch (emailErr: any) {
            console.error('❌ Erreur envoi email abonnement:', emailErr.message);
          }
        }
      }
    } 
    else if (event_type === 'subscription.canceled') {
      await db('subscriptions')
        .where({ paddle_subscription_id: data.id })
        .update({ status: 'canceled', updated_at: new Date() });
      console.log(`🚫 Abonnement annulé : ${data.id}`);
    }
    else if (event_type === 'transaction.completed') {
  const userId = data.custom_data?.userId;
  
  // On vérifie si c'est bien un achat PAYG (pas un abonnement)
  const isPayg = data.items?.some((item: any) => item.price?.id === process.env.VITE_PADDLE_PRICE_PAYG);

  if (isPayg && userId) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // On ajoute 1000 messages de crédit en réduisant le compteur (ou on modifie la logique de limite)
    // La façon la plus simple : on retire 1000 messages de la consommation actuelle
    const usage = await db('ai_usage').where({ user_id: userId, month: currentMonth }).first();
    
    if (usage) {
      await db('ai_usage')
        .where({ id: usage.id })
        .update({ messages_used: Math.max(0, usage.messages_used - 1000) }); // Retire 1000 du compteur
    } else {
      // S'il n'a pas encore de ligne d'usage, on lui en crée une avec un solde négatif pour simuler le crédit
      await db('ai_usage').insert({
        user_id: userId,
        month: currentMonth,
        messages_used: -1000 
      });
    }
    console.log(`⚡ [Paddle] 1000 crédits PAYG ajoutés pour l'utilisateur ${userId}`);
  }
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
