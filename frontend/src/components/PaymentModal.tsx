// frontend/src/components/PaymentModal.tsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { useToast } from '../context/ToastContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  priceXAF: number;
  paddlePriceId: string; // Conservé pour compatibilité avec PricingPage
  paddleLabel: string;   // Conservé pour compatibilité avec PricingPage
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen, onClose, planId, planName, priceXAF
}) => {
  const toast = useToast();
  const [method, setMethod] = useState<'MOBILE_MONEY' | 'CARD'>('MOBILE_MONEY');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [ussdCode, setUssdCode] = useState<string | null>(null);

  if (!isOpen) return null;

  // ✅ 1. Paiement Mobile Money (CamPay)
  const handleMobileMoneyPay = async () => {
    if (!phone) {
      toast.addToast({ type: 'error', title: 'Veuillez entrer votre numéro' });
      return;
    }

    setLoading(true);
    setUssdCode(null);

    try {
      const res = await api.post('/payments/checkout', {
        planId,
        method: 'MOBILE_MONEY',
        phone,
      });

      if (res.data.success) {
        setUssdCode(res.data.ussdCode);
        toast.addToast({ 
          type: 'success', 
          title: 'Paiement initié', 
          message: 'Vérifiez votre téléphone pour valider.' 
        });
      }
    } catch (err: any) {
      toast.addToast({ 
        type: 'error', 
        title: 'Erreur', 
        message: err.response?.data?.error || 'Impossible d\'initier le paiement' 
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ 2. Paiement par Carte (Dodo Payments)
  const handleCardPay = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payments/checkout/dodo', {
        planId,
      });

      if (res.data.success && res.data.url) {
        // Redirection vers la page de paiement Dodo
        window.location.href = res.data.url;
      } else {
        throw new Error('URL de paiement invalide');
      }
    } catch (err: any) {
      toast.addToast({ 
        type: 'error', 
        title: 'Erreur', 
        message: err.response?.data?.error || 'Impossible d\'initier le paiement par carte' 
      });
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '420px', width: '100%' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>{planName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>×</button>
        </div>

        <p style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 24px 0', color: '#4A6CF7' }}>
          {priceXAF > 0 ? `${priceXAF.toLocaleString()} XAF` : 'Gratuit'}
        </p>

        {ussdCode ? (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>📱 Vérifiez votre téléphone</p>
            <p style={{ fontSize: '14px', color: '#166534', marginBottom: '16px' }}>
              Composez <strong>{ussdCode}</strong> sur votre téléphone ou validez la notification MTN/Orange.
            </p>
            <Button onClick={onClose} variant="outline" style={{ width: '100%' }}>Fermer</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setMethod('MOBILE_MONEY')}
                style={{ flex: 1, padding: '12px', border: `2px solid ${method === 'MOBILE_MONEY' ? '#4A6CF7' : '#ddd'}`, borderRadius: '8px', backgroundColor: method === 'MOBILE_MONEY' ? '#eef2ff' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📱 Mobile Money
              </button>
              <button
                onClick={() => setMethod('CARD')}
                style={{ flex: 1, padding: '12px', border: `2px solid ${method === 'CARD' ? '#4A6CF7' : '#ddd'}`, borderRadius: '8px', backgroundColor: method === 'CARD' ? '#eef2ff' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                💳 Carte (Intl)
              </button>
            </div>

            {method === 'MOBILE_MONEY' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>Numéro MTN / Orange</label>
                <input
                  type="tel"
                  placeholder="Ex: 237677777777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Format: 237 suivi de 9 chiffres</p>
                
                <Button onClick={handleMobileMoneyPay} disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
                  {loading ? 'Traitement...' : 'Payer par Mobile Money'}
                </Button>
              </div>
            )}

            {method === 'CARD' && (
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', textAlign: 'center' }}>
                  Paiement sécurisé via Dodo Payments (Visa, Mastercard)
                </p>
                
                {/* ✅ NOUVEAU BOUTON DODO */}
                <Button 
                  onClick={handleCardPay} 
                  disabled={loading} 
                  style={{ width: '100%', backgroundColor: '#4A6CF7', color: '#fff' }}
                >
                  {loading ? 'Redirection...' : 'Payer par Carte Bancaire'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
