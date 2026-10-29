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

  const isInstitution = subscription?.plan === 'institution';
	const isPro = subscription?.plan === 'pro';
	const baseLimit = isInstitution ? 10000 : (isPro ? 2000 : 50);

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

/**
 * ✅ Rembourse 1 crédit IA à l'utilisateur (ou à son organisation).
 * Utilisé quand un service IA échoue APRÈS avoir décompté le quota.
 */
export const refundAiQuota = async (userId: string): Promise<void> => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  try {
    const membership = await db('organization_members').where({ user_id: userId }).first();

    if (membership) {
      await db('organization_usage')
        .where({ organization_id: membership.organization_id, month: currentMonth })
        .where('messages_used', '>', 0)
        .decrement('messages_used', 1);
      console.log(`💸 [quota] Remboursement 1 crédit IA à l'organisation ${membership.organization_id}`);
    } else {
      await db('ai_usage')
        .where({ user_id: userId, month: currentMonth })
        .where('messages_used', '>', 0)
        .decrement('messages_used', 1);
      console.log(`💸 [quota] Remboursement 1 crédit IA à l'utilisateur ${userId}`);
    }
  } catch (err: any) {
    console.error(`❌ [quota] Échec du remboursement pour ${userId}: ${err.message}`);
  }
};
