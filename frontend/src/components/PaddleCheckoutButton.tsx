import { useEffect, useState } from 'react';
import { initializePaddle, Paddle } from '@paddle/paddle-js';

interface Props {
  priceId: string;
  label: string;
  className?: string;
  onSuccess?: () => void;
}

export const PaddleCheckoutButton = ({ priceId, label, className, onSuccess }: Props) => {
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializePaddle({
      environment: (import.meta.env.VITE_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    }).then((paddleInstance) => {
      if (paddleInstance) setPaddle(paddleInstance);
      setIsInitializing(false);
    }).catch(err => {
      console.error("❌ Erreur d'initialisation Paddle :", err);
      setIsInitializing(false);
    });
  }, []);

  const openCheckout = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!paddle) {
      alert("Paddle n'est pas encore prêt. Attends 2 secondes et réessaie.");
      return;
    }
    if (!currentUser) {
      alert("Tu dois être connecté pour t'abonner.");
      return;
    }

    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { userId: String(currentUser.id) },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'fr',
          successUrl: `${window.location.origin}/settings`, // Redirige vers les paramètres après paiement
        },
      });
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("❌ Erreur Paddle:", error);
    }
  };

  return (
    <button
      onClick={openCheckout}
      disabled={isInitializing}
      className={className || "bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 w-full"}
    >
      {isInitializing ? "Préparation..." : label}
    </button>
  );
};
