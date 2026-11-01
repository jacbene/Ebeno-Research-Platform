// backend/src/jobs/subscriptionDunning.ts
import cron from 'node-cron';
import { db } from '../db/knex'; // ✅ CORRECTION DU CHEMIN

// ... le reste de ton code
cron.schedule('0 8 * * *', async () => { // Tous les jours à 8h
  const expiringSoon = await db('subscriptions')
    .where('status', 'active')
    .andWhere('expires_at', '<=', db.raw("NOW() + INTERVAL '7 days'"));

  for (const sub of expiringSoon) {
    // Envoyer email Brevo avec lien de renouvellement Mobile Money
  }
});
