import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { exportMyData, getExportInfo } from '../controllers/gdprController';
mport { db } from '../db/knex';

const router = Router();

// ✅ Route pour récupérer le statut d'abonnement et l'usage IA actuel
router.get('/me/status', authenticate, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // 1. Récupérer l'abonnement
    const subscription = await db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    // 2. Récupérer l'usage IA du mois
    const usage = await db('ai_usage')
      .where({ user_id: userId, month: currentMonth })
      .first();

    res.json({
      subscription: subscription || null,
      usage: usage || { messages_used: 0 },
      month: currentMonth
    });
  } catch (error) {
    console.error("Erreur status abonnement:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
// ✅ Routes RGPD (authentifiées)
router.get('/me/export-info', authenticate, getExportInfo);
router.get('/me/export-data', authenticate, exportMyData);

export default router;
