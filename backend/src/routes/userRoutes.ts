import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { exportMyData, getExportInfo } from '../controllers/gdprController';
import { db } from '../db/knex'; // ✅ "import" corrigé
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

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
router.post('/me/billing-portal', authenticate, async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const subscription = await db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    if (!subscription || !subscription.paddle_customer_id) {
      return res.status(404).json({ 
        error: "Aucun abonnement actif ou ID client Paddle manquant.",
        code: 'NO_SUBSCRIPTION'
      });
    }

    const paddle = new Paddle(process.env.PADDLE_API_KEY!, {
      environment: process.env.PADDLE_ENVIRONMENT === 'sandbox' 
        ? Environment.sandbox 
        : Environment.production,
    });

    const session = await paddle.customerPortalSessions.create(
      subscription.paddle_customer_id,
      [subscription.paddle_subscription_id]
    );

    res.json({ success: true, url: session.urls.general.overview });

  } catch (error: any) {
    console.error('❌ Erreur création portail Paddle:', error);
    
    // ✅ Gestion spécifique du conflit d'environnement
    if (error.code === 'not_found' && error.detail?.includes('customer')) {
      return res.status(400).json({ 
        error: "Ce client n'existe pas dans l'environnement Paddle actuel (Sandbox vs Live). Veuillez contacter le support.",
        code: 'CUSTOMER_NOT_FOUND_IN_ENV',
        details: error.detail
      });
    }

    res.status(500).json({ 
      error: "Impossible de générer le lien du portail client.",
      details: error.message 
    });
  }
});

export default router;
