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

  useEffect(() => {
    initializePaddle({
      environment: (import.meta.env.VITE_PADDLE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      token: import.meta.env.VITE_PADDLE_CLIENT_TOKEN,
    }).then((paddleInstance) => {
      if (paddleInstance) setPaddle(paddleInstance);
    });
  }, []);

  const openCheckout = () => {
    if (!paddle || !user) return;
    
    paddle.Checkout.open({
      items: [{ priceId: import.meta.env.VITE_PADDLE_PRICE_ID, quantity: 1 }],
      customData: {
        userId: user.id // <-- Très important : permet au backend de lier le paiement au bon utilisateur
      },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        locale: 'fr',
      },
    });
  };

  return (
    <button
      onClick={openCheckout}
      disabled={!paddle}
      className={className || "bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"}
    >
      {t('Pricing.upgradePro', 'Passer au plan Pro (12€/mois)')}
    </button>
  );
};
