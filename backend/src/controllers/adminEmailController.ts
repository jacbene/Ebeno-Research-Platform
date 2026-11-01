// backend/src/controllers/adminEmailController.ts
import { Request, Response } from 'express';
import { db } from '../db/knex';
import { sendBroadcastEmail } from '../services/emailService';

export const sendBroadcast = async (req: Request, res: Response) => {
  try {
    const { targetType, targetValue, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Le sujet et le message sont requis.' });
    }

    // 1. Construire la requête Knex selon la cible
    let query = db('users').select('email', 'name', 'language');

    if (targetType === 'plan' && targetValue) {
      // Si tu as une colonne 'role' ou 'plan' dans ta table users
      query = query.where({ role: targetValue }); 
    } else if (targetType === 'specific' && targetValue) {
      query = query.where({ email: targetValue });
    }

    const users = await query;

    if (users.length === 0) {
      return res.status(404).json({ error: 'Aucun utilisateur trouvé pour cette cible.' });
    }

    // 2. Envoi des emails
    let successCount = 0;
    let failCount = 0;

    // ⚠️ Pour de grands volumes, il faudrait un système de queue (BullMQ).
    // Ici, on utilise une boucle avec Promise.allSettled pour ne pas bloquer si un email échoue.
    await Promise.allSettled(
      users.map(async (user: any) => {
        const success = await sendBroadcastEmail({
          to: user.email,
          name: user.name,
          subject: subject,
          message: message,
          lang: user.language || 'fr',
        });
        
        if (success) successCount++;
        else failCount++;
      })
    );

    res.json({
      success: true,
      message: `Emails envoyés : ${successCount} succès, ${failCount} échecs.`,
    });
  } catch (error: any) {
    console.error('❌ Erreur envoi broadcast:', error);
    res.status(500).json({ error: 'Erreur interne lors de l\'envoi des emails.' });
  }
};
