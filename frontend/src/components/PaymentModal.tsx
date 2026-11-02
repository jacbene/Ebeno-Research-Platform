// frontend/src/components/PaymentModal.tsx
import React, { useState } from 'react';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { useToast } from '../context/ToastContext';
import { useTranslation } from 'react-i18next'; // ✅ AJOUT

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  priceXAF: number;
  paddlePriceId: string;
  paddleLabel: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen, onClose, planId, planName, priceXAF
}) => {
  const toast = useToast();
  const { t } = useTranslation(); // ✅ AJOUT
  const [method, setMethod] = useState<'MOBILE_MONEY' | 'CARD'>('MOBILE_MONEY');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [ussdCode, setUssdCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleMobileMoneyPay = async () => {
    if (!phone) {
      toast.addToast({ type: 'error', title: t('payment.phoneLabel') });
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
          title: t('payment.success'), 
          message: t('payment.successMsg') 
        });
      }
    } catch (err: any) {
      toast.addToast({ 
        type: 'error', 
        title: t('common.error'), 
        message: err.response?.data?.error || t('payment.error') 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPay = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payments/checkout/dodo', { planId });
      if (res.data.success && res.data.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error('URL invalide');
      }
    } catch (err: any) {
      toast.addToast({ 
        type: 'error', 
        title: t('common.error'), 
        message: err.response?.data?.error || t('payment.errorMsg') 
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
          {priceXAF > 0 ? `${priceXAF.toLocaleString()} XAF` : t('Pricing.free.name')}
        </p>

        {ussdCode ? (
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#166534' }}>{t('payment.ussdTitle')}</p>
            <p style={{ fontSize: '14px', color: '#166534', marginBottom: '16px' }}>
              {t('payment.ussdDesc')} <strong>{ussdCode}</strong>
            </p>
            <Button onClick={onClose} variant="outline" style={{ width: '100%' }}>{t('payment.close')}</Button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <button
                onClick={() => setMethod('MOBILE_MONEY')}
                style={{ flex: 1, padding: '12px', border: `2px solid ${method === 'MOBILE_MONEY' ? '#4A6CF7' : '#ddd'}`, borderRadius: '8px', backgroundColor: method === 'MOBILE_MONEY' ? '#eef2ff' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                📱 {t('payment.mobileMoney')}
              </button>
              <button
                onClick={() => setMethod('CARD')}
                style={{ flex: 1, padding: '12px', border: `2px solid ${method === 'CARD' ? '#4A6CF7' : '#ddd'}`, borderRadius: '8px', backgroundColor: method === 'CARD' ? '#eef2ff' : '#fff', cursor: 'pointer', fontWeight: 'bold' }}
              >
                💳 {t('payment.card')}
              </button>
            </div>

            {method === 'MOBILE_MONEY' && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 'bold' }}>{t('payment.phoneLabel')}</label>
                <input
                  type="tel"
                  placeholder={t('payment.phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>{t('payment.phoneHelp')}</p>
                
                <Button onClick={handleMobileMoneyPay} disabled={loading} style={{ width: '100%', marginTop: '16px' }}>
                  {loading ? t('payment.processing') : t('payment.payMobile')}
                </Button>
              </div>
            )}

            {method === 'CARD' && (
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', textAlign: 'center' }}>
                  {t('payment.secureVia')} Dodo Payments
                </p>
                <Button onClick={handleCardPay} disabled={loading} style={{ width: '100%', backgroundColor: '#4A6CF7', color: '#fff' }}>
                  {loading ? t('payment.redirecting') : t('payment.payCard')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
