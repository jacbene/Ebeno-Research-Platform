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

// Garde tes anciennes routes si tu en as besoin
router.get('/backup/cloudinary', backupCloudinary);
router.get('/backup/db-info', dbInfo);
router.get('/audit-log', getAuditLogs);
router.post('/audit-log/purge', purgeAuditLogs);

export default router;
