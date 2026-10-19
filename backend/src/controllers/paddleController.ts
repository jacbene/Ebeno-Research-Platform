import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/knex';

export const handlePaddleWebhook = async (req: Request, res: Response): Promise<void> => {
  const signatureHeader = req.headers['paddle-signature'] as string;
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf-8') : '';

  console.log('--- TEST MANUEL SIGNATURE ---');
  console.log('Body length:', rawBody.length);
  console.log('Signature header:', signatureHeader);

  if (!signatureHeader || !rawBody) {
    console.log('❌ Signature ou body manquant');
    res.status(400).send('Signature ou body manquant');
    return;
  }

  const secret = process.env.PADDLE_WEBHOOK_SECRET!;
  console.log('Secret utilisé (début):', secret?.substring(0, 15) + '...');

  // Extraire le timestamp et le hash du header
  const parts = signatureHeader.split(';');
  const ts = parts.find(p => p.startsWith('ts='))?.slice(3);
  const h1 = parts.find(p => p.startsWith('h1='))?.slice(3);

  if (!ts || !h1) {
    console.log('❌ Format de signature invalide');
    res.status(400).send('Format de signature invalide');
    return;
  }

  // Calculer le HMAC manuellement
  const signedPayload = `${ts}:${rawBody}`;
  const expectedHmac = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  console.log('HMAC attendu (calculé):', expectedHmac);
  console.log('HMAC reçu (Paddle):', h1);
  console.log('Correspondance:', expectedHmac === h1);

  if (expectedHmac !== h1) {
    console.log('❌ SIGNATURE INVALIDE - Le secret est probablement incorrect ou le corps a été modifié.');
    res.status(400).send('Signature invalide');
    return;
  }

  console.log('✅ SIGNATURE VALIDE !');
  
  // Ici, tu peux parser le JSON et traiter l'événement
  try {
    const event = JSON.parse(rawBody);
    console.log('Type d\'événement:', event.eventType);
    // ... (suite du traitement : mise à jour de la DB, etc.)
    res.status(200).send('Webhook traité avec succès');
  } catch (err) {
    console.error('Erreur parsing JSON:', err);
    res.status(400).send('JSON invalide');
  }
};
