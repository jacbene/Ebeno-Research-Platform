import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from 'react-i18next';

interface Props {
  className?: string;
}

export const PaddleCheckoutButton = ({ className }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializePaddle({
      environment: (import.meta.env.VITE_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    }).then((paddleInstance) => {
      console.log("✅ SDK Paddle prêt :", !!paddleInstance);
      if (paddleInstance) setPaddle(paddleInstance);
      setIsInitializing(false);
    }).catch(err => {
      console.error("❌ Erreur d'initialisation Paddle :", err);
      setIsInitializing(false);
    });
  }, []);

  const openCheckout = () => {
    console.log("🖱️ Clic sur le bouton de paiement");
    console.log("Statut Paddle :", paddle ? "Prêt" : "Non prêt");
    console.log("Objet User :", user);

    if (!paddle) {
      alert("Paddle n'est pas encore prêt. Attends 2 secondes et réessaie.");
      return;
    }
    if (!user) {
      alert("Tu dois être connecté pour t'abonner.");
      return;
    }

    try {
      console.log("🚀 Ouverture de la fenêtre Paddle...");
      paddle.Checkout.open({
        items: [{ priceId: import.meta.env.VITE_PADDLE_PRICE_ID, quantity: 1 }],
        customData: {
          userId: String(user.id || (user as any)._id || 'inconnu') // On force en string
        },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'fr',
        },
      });
    } catch (error) {
      console.error("❌ Erreur lors de l'ouverture du checkout Paddle:", error);
    }
  };

  return (
    <button
      onClick={openCheckout}
      disabled={isInitializing}
      className={className || "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"}
    >
      {isInitializing ? "Préparation du paiement..." : t('Pricing.upgradePro', 'Passer au plan Pro (12€/mois)')}
    </button>
  );
};
