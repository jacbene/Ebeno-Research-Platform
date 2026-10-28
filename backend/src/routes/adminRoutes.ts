// backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { backupCloudinary, dbInfo, getAuditLogs, purgeAuditLogs } from '../controllers/adminController';
import { authenticate } from '../middleware/auth';
import { db } from '../db/knex';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: "Accès refusé." });
  }
};

// ────────────────────────────────────────────────────────────
// 1. Statistiques globales
// ────────────────────────────────────────────────────────────
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const usersCount = await db('users').count('id as count').first();
    const proCount = await db('subscriptions').where({ plan: 'pro', status: 'active' }).count('id as count').first();
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const aiUsage = await db('ai_usage').where({ month: currentMonth }).sum('messages_used as total').first();

    const paygCount = await db('webhook_events')
      .where({ event_type: 'transaction.completed' })
      .count('id as count')
      .first();

    res.json({
      users: Number(usersCount?.count || 0),
      proUsers: Number(proCount?.count || 0),
      aiRequests: Number(aiUsage?.total || 0),
      paygPurchases: Number(paygCount?.count || 0),
    });
  } catch (error) {
    console.error("Erreur stats admin:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 2. Liste des utilisateurs
// ────────────────────────────────────────────────────────────
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.role',
        'users.createdAt',
        'users.isSuspended', // ✅ AJOUTÉ
        'subscriptions.plan as subscription_plan',
        'subscriptions.status as subscription_status'
      )
      .leftJoin('subscriptions', 'users.id', 'subscriptions.user_id')
      .orderBy('users.createdAt', 'desc');

    res.json({ users });
  } catch (error) {
    console.error("Erreur liste users:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 3. Changer le rôle d'un utilisateur (MANQUANT)
// ────────────────────────────────────────────────────────────
router.patch('/users/:id/role', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['ADMIN', 'RESEARCHER'].includes(role)) {
      return res.status(400).json({ error: "Rôle invalide." });
    }

    // Empêcher l'admin de se retirer ses propres droits
    if ((req as any).user.id === id) {
      return res.status(400).json({ error: "Vous ne pouvez pas modifier votre propre rôle." });
    }

    await db('users').where({ id }).update({ role, updatedAt: new Date() });
    res.json({ success: true, newRole: role });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 4. Suspendre / réactiver un utilisateur
// ────────────────────────────────────────────────────────────
router.patch('/users/:id/suspend', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;

    if ((req as any).user.id === id) {
      return res.status(400).json({ error: "Vous ne pouvez pas suspendre votre propre compte." });
    }

    await db('users').where({ id }).update({ 
      isSuspended: suspended,
      updatedAt: new Date()
    });
    
    res.json({ success: true, isSuspended: suspended });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 5. Ajouter des crédits IA manuellement
// ────────────────────────────────────────────────────────────
router.post('/users/:id/credits', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || isNaN(amount)) {
      return res.status(400).json({ error: "Montant invalide." });
    }

    const currentMonth = new Date().toISOString().slice(0, 7);
    const usage = await db('ai_usage').where({ user_id: id, month: currentMonth }).first();

    if (usage) {
      await db('ai_usage').where({ id: usage.id }).increment('bonus_credits', amount);
    } else {
      await db('ai_usage').insert({
        user_id: id,
        month: currentMonth,
        messages_used: 0,
        bonus_credits: amount
      });
    }

    res.json({ success: true, message: `${amount} crédits ajoutés.` });
  } catch (error) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 6. Liste des abonnements
// ────────────────────────────────────────────────────────────
router.get('/subscriptions', authenticate, requireAdmin, async (req, res) => {
  try {
    const subscriptions = await db('subscriptions')
      .join('users', 'subscriptions.user_id', 'users.id')
      .select(
        'subscriptions.id',
        'subscriptions.paddle_subscription_id',
        'subscriptions.paddle_customer_id',
        'subscriptions.plan',
        'subscriptions.status',
        'subscriptions.current_period_end',
        'subscriptions.created_at',
        'users.email as user_email',
        'users.name as user_name'
      )
      .orderBy('subscriptions.created_at', 'desc');

    res.json({ subscriptions });
  } catch (error) {
    console.error("Erreur liste abonnements:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 7. Usage IA (avec bonus)
// ────────────────────────────────────────────────────────────
router.get('/usage', authenticate, requireAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usage = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.role',
        'ai_usage.messages_used',
        'ai_usage.bonus_credits',
        'subscriptions.plan as subscription_plan',
        'organization_members.organization_id as org_id',
        'organization_usage.messages_used as org_messages_used',
        'organization_usage.bonus_credits as org_bonus_credits'
      )
      .leftJoin('ai_usage', function() {
        this.on('users.id', '=', 'ai_usage.user_id')
            .andOn('ai_usage.month', '=', db.raw('?', [currentMonth]));
      })
      .leftJoin('subscriptions', function() {
        this.on('users.id', '=', 'subscriptions.user_id')
            .andOn('subscriptions.status', '=', db.raw('?', ['active']));
      })
      .leftJoin('organization_members', 'users.id', '=', 'organization_members.user_id')
      .leftJoin('organization_usage', function() {
        this.on('organization_members.organization_id', '=', 'organization_usage.organization_id')
            .andOn('organization_usage.month', '=', db.raw('?', [currentMonth]));
      })
      .orderBy('ai_usage.messages_used', 'desc');

    res.json({ usage, month: currentMonth });
  } catch (error) {
    console.error("Erreur usage IA:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 8. Modération (Audit log)
// ────────────────────────────────────────────────────────────
router.get('/moderation', authenticate, requireAdmin, async (req, res) => {
  try {
    const logs = await db('audit_log')
      .leftJoin('users', 'audit_log.userId', 'users.id')
      .select(
        'audit_log.id',
        'audit_log.action',
        'audit_log.status',
        'audit_log.ip',
        'audit_log.createdAt',
        'audit_log.userEmail as user_email',
        'users.name as user_name'
      )
      .orderBy('audit_log.createdAt', 'desc')
      .limit(100);

    res.json({ logs });
  } catch (error) {
    console.error("Erreur chargement audit logs:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ────────────────────────────────────────────────────────────
// 9. Anciennes routes (backup / audit)
// ────────────────────────────────────────────────────────────
router.get('/backup/cloudinary', backupCloudinary);
router.get('/backup/db-info', dbInfo);
router.get('/audit-log', getAuditLogs);
router.post('/audit-log/purge', purgeAuditLogs);

export default router;
