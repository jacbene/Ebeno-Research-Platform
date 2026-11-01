// frontend/src/components/PaymentMethodModal.tsx
const [method, setMethod] = useState<'MOBILE_MONEY' | 'CARD'>('CARD');
const [phone, setPhone] = useState('');

const handlePay = async () => {
  const res = await api.post('/payments/checkout', {
    planId: 'pro',
    method: method === 'CARD' ? 'CARD_LEMON' : 'MOBILE_MONEY',
    phone: method === 'MOBILE_MONEY' ? phone : undefined,
  });

  if (res.data.url) {
    window.location.href = res.data.url; // Redirection vers CamPay (USSD) ou Lemon Squeezy
  }
};
