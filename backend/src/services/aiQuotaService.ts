import { db } from '../db/knex';

export const checkAndIncrementAiQuota = async (userId: string): Promise<{ 
  allowed: boolean; 
  limit: number; 
  used: number; 
  message?: string;
  scope?: 'organization' | 'personal';
}> => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // ═══════════════════════════════════════════════════════════
  // 1. Vérifier si l'utilisateur appartient à une organisation
  // ═══════════════════════════════════════════════════════════
  const membership = await db('organization_members')
    .where({ user_id: userId })
    .first();

  if (membership) {
    const orgId = membership.organization_id;

    // Récupérer l'organisation pour connaître son plan
    const org = await db('organizations').where({ id: orgId }).first();
    
    // Limite Institution : 10 000 messages par mois (pool partagé)
    const baseLimit = org?.plan === 'institution' ? 10000 : 2000;

    // Récupérer l'usage de l'organisation
    const orgUsage = await db('organization_usage')
      .where({ organization_id: orgId, month: currentMonth })
      .first();

    const used = orgUsage?.messages_used || 0;
    const bonus = orgUsage?.bonus_credits || 0;
    const totalLimit = baseLimit + bonus;

    if (used >= totalLimit) {
      return {
        allowed: false,
        limit: totalLimit,
        used,
        scope: 'organization',
        message: `Le quota IA de votre organisation (${used}/${totalLimit} messages) est atteint pour ce mois. Contactez votre administrateur ou passez à un plan supérieur.`,
      };
    }

    // Incrémenter l'usage de l'organisation
    if (orgUsage) {
      await db('organization_usage')
        .where({ id: orgUsage.id })
        .increment('messages_used', 1);
    } else {
      await db('organization_usage').insert({
        organization_id: orgId,
        month: currentMonth,
        messages_used: 1,
        bonus_credits: 0,
      });
    }

    return { allowed: true, limit: totalLimit, used: used + 1, scope: 'organization' };
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Logique personnelle (Free / Pro / PAYG)
  // ═══════════════════════════════════════════════════════════
  const subscription = await db('subscriptions')
    .where({ user_id: userId, status: 'active' })
    .first();

  const isPro = subscription?.plan === 'pro' || subscription?.plan === 'institution';
  const baseLimit = isPro ? 2000 : 50;

  const usage = await db('ai_usage')
    .where({ user_id: userId, month: currentMonth })
    .first();

  const messagesUsed = usage?.messages_used || 0;
  const bonusCredits = usage?.bonus_credits || 0;
  const totalLimit = baseLimit + bonusCredits;

  if (messagesUsed >= totalLimit) {
    return {
      allowed: false,
      limit: totalLimit,
      used: messagesUsed,
      scope: 'personal',
      message: `Vous avez atteint votre limite de ${totalLimit} messages IA pour ce mois-ci. Passez au plan Pro ou rechargez vos crédits.`,
    };
  }

  if (usage) {
    await db('ai_usage')
      .where({ user_id: userId, month: currentMonth })
      .increment('messages_used', 1);
  } else {
    await db('ai_usage').insert({
      user_id: userId,
      month: currentMonth,
      messages_used: 1,
      bonus_credits: 0,
    });
  }

  return { allowed: true, limit: totalLimit, used: messagesUsed + 1, scope: 'personal' };
};
