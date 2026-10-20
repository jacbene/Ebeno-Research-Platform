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

    res.json({
      users: Number(usersCount?.count || 0),
      proUsers: Number(proCount?.count || 0),
      aiRequests: Number(aiUsage?.total || 0),
    });
  } catch (error) {
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

// Garde tes anciennes routes si tu en as besoin
router.get('/backup/cloudinary', backupCloudinary);
router.get('/backup/db-info', dbInfo);
router.get('/audit-log', getAuditLogs);
router.post('/audit-log/purge', purgeAuditLogs);

export default router;
