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
        // ✅ Détecter si c'est un plan Institution
        const instMonthlyPriceId = process.env.PADDLE_PRICE_ID_INST_MONTHLY;
        const instYearlyPriceId = process.env.PADDLE_PRICE_ID_INST_YEARLY;
        const isInstitution = data.items?.some((item: any) => 
          item.price?.id === instMonthlyPriceId || item.price?.id === instYearlyPriceId
        );

        const planName = isInstitution ? 'institution' : 'pro';

        const existingSub = await db('subscriptions').where({ user_id: userId }).first();
        
        const subData = {
          user_id: userId,
          paddle_subscription_id: data.id,
          paddle_customer_id: data.customer_id,
          plan: planName,
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

        // ✅ Si Institution, créer l'organisation
        if (isInstitution) {
          const existingOrg = await db('organizations').where({ owner_id: userId }).first();
          
          if (!existingOrg) {
            // ✅ Correction du destructuring Knex
            const [{ id: orgId }] = await db('organizations').insert({
              name: `Organisation de ${userId}`,
              owner_id: userId,
              paddle_subscription_id: data.id,
              paddle_customer_id: data.customer_id,
              plan: 'institution',
              max_seats: 5,
              created_at: new Date(),
              updated_at: new Date()
            }).returning('id');

            // Ajouter le créateur comme membre 'owner'
            await db('organization_members').insert({
              organization_id: orgId,
              user_id: userId,
              role: 'owner',
              joined_at: new Date()
            });

            console.log(`🏢 Organisation créée pour l'utilisateur ${userId} (5 sièges)`);
          }
        }

        // ✅ Envoi de l'e-mail de confirmation
        try {
          const user = await db('users').where({ id: userId }).first();
          if (user) {
            await sendSubscriptionConfirmationEmail({
              to: user.email,
              name: user.name || 'chercheur',
              plan: planName,
              nextDate: data.current_billing_period?.ends_at,
              lang: user.language || 'fr',
            });
          }
        } catch (emailErr: any) {
          console.error('❌ Erreur envoi email abonnement:', emailErr.message);
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
      
      // ✅ On vérifie si c'est bien un achat PAYG via l'ID de prix (variable backend)
      const paygPriceId = process.env.PADDLE_PRICE_ID_PAYG;
      const isPayg = data.items?.some((item: any) => item.price?.id === paygPriceId);

      if (isPayg && userId) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        
        // ✅ On ajoute 1000 crédits bonus (sans écraser le compteur existant)
        const usage = await db('ai_usage').where({ user_id: userId, month: currentMonth }).first();
        
        if (usage) {
          await db('ai_usage')
            .where({ id: usage.id })
            .increment('bonus_credits', 1000);
        } else {
          await db('ai_usage').insert({
            user_id: userId,
            month: currentMonth,
            messages_used: 0,
            bonus_credits: 1000
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
