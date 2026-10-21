import { db } from '../db/knex';

export const checkAndIncrementAiQuota = async (userId: string): Promise<{ allowed: boolean; limit: number; used: number; message?: string }> => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // 1. Récupérer l'abonnement
  const subscription = await db('subscriptions')
    .where({ user_id: userId, status: 'active' })
    .first();

  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'institution';
  const baseLimit = subscription?.plan === 'institution' ? 10000 : (isPro ? 2000 : 50);

  // 2. Récupérer l'usage actuel (messages utilisés + crédits bonus)
  const usage = await db('ai_usage')
    .where({ user_id: userId, month: currentMonth })
    .first();

  const messagesUsed = usage?.messages_used || 0;
  const bonusCredits = usage?.bonus_credits || 0;
  const totalLimit = baseLimit + bonusCredits;

  // 3. Vérifier si la limite est dépassée
  if (messagesUsed >= totalLimit) {
    return {
      allowed: false,
      limit: totalLimit,
      used: messagesUsed,
      message: `Vous avez atteint votre limite de ${totalLimit} messages IA pour ce mois-ci. Passez au plan Pro ou rechargez vos crédits.`
    };
  }

  // 4. Incrémenter l'usage (si autorisé)
  if (usage) {
    await db('ai_usage')
      .where({ user_id: userId, month: currentMonth })
      .increment('messages_used', 1);
  } else {
    await db('ai_usage').insert({
      user_id: userId,
      month: currentMonth,
      messages_used: 1,
      bonus_credits: 0
    });
  }

  return { allowed: true, limit: totalLimit, used: messagesUsed + 1 };
};
