// backend/src/controllers/paymentController.ts
import { Request, Response } from 'express';

// Définition des prix en XAF (à ajuster selon tes tarifs exacts)
const PLAN_PRICES_XAF: Record<string, number> = {
  pro_monthly: 8000,      // ~12€
  pro_yearly: 80000,      // ~120€
  institution_monthly: 32000, // ~49€
  institution_yearly: 320000, // ~490€
  payg: 3300,             // ~5€
};

export const createCheckout = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id; // Récupéré via ton middleware 'authenticate'
    const { planId, method } = req.body;

    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!planId || !method) return res.status(400).json({ error: 'Paramètres manquants' });

    const amount = PLAN_PRICES_XAF[planId];
    if (!amount) return res.status(400).json({ error: 'Plan invalide' });

    if (method === 'MOBILE_MONEY') {
      return res.status(503).json({
        error: 'Les paiements Mobile Money sont temporairement indisponibles.',
      });
    }

    if (method === 'CARD') {
      // Ici, on mettra l'appel Paddle plus tard
      return res.status(501).json({ error: 'Paiement par carte en cours de maintenance.' });
    }

    return res.status(400).json({ error: 'Méthode de paiement inconnue' });
  } catch (error: any) {
    console.error('❌ Erreur Checkout:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l\'initialisation du paiement' });
  }
};

