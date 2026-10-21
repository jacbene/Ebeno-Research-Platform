// backend/src/routes/adminRoutes.ts
import { Router } from 'express';
import { backupCloudinary, dbInfo, getAuditLogs, purgeAuditLogs } from '../controllers/adminController';
import { authenticate } from '../middleware/auth'; // Vérifie que le chemin est correct
import { db } from '../db/knex';

const router = Router();

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: "Accès refusé." });
  }
};

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const usersCount = await db('users').count('id as count').first();
    const proCount = await db('subscriptions').where({ plan: 'pro', status: 'active' }).count('id as count').first();
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const aiUsage = await db('ai_usage').where({ month: currentMonth }).sum('messages_used as total').first();

    // ✅ NOUVEAU : Compter les achats PAYG (paiements uniques)
    // On compte les événements 'transaction.completed' qui ne sont pas des abonnements
    const paygCount = await db('webhook_events')
      .where({ event_type: 'transaction.completed' })
      .count('id as count')
      .first();

    res.json({
      users: Number(usersCount?.count || 0),
      proUsers: Number(proCount?.count || 0),
      aiRequests: Number(aiUsage?.total || 0),
      paygPurchases: Number(paygCount?.count || 0), // ✅ Nouvelle statistique
    });
  } catch (error) {
    console.error("Erreur stats admin:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ✅ Liste des utilisateurs avec leur statut d'abonnement
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.role',
        'users.createdAt',
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

// ✅ Liste des abonnements
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

// ✅ Liste de l'usage IA pour le mois en cours
router.get('/usage', authenticate, requireAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const usage = await db('users')
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.role',
        'ai_usage.messages_used',
        'subscriptions.plan as subscription_plan'
      )
      .leftJoin('ai_usage', function() {
        this.on('users.id', '=', 'ai_usage.user_id')
            .andOn('ai_usage.month', '=', db.raw('?', [currentMonth]));
      })
      .leftJoin('subscriptions', function() {
        this.on('users.id', '=', 'subscriptions.user_id')
            .andOn('subscriptions.status', '=', db.raw('?', ['active']));
      })
      .orderBy('ai_usage.messages_used', 'desc');

    res.json({ usage, month: currentMonth });
  } catch (error) {
    console.error("Erreur usage IA:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// Garde tes anciennes routes si tu en as besoin
router.get('/backup/cloudinary', backupCloudinary);
router.get('/backup/db-info', dbInfo);
router.get('/audit-log', getAuditLogs);
router.post('/audit-log/purge', purgeAuditLogs);

// ✅ Récupérer les logs d'audit avec pagination basique
// ✅ Récupérer les logs d'audit avec pagination basique
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

export default router;
