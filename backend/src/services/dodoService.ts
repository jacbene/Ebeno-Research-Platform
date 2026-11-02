// backend/src/services/dodoService.ts
import { DodoPayments } from 'dodopayments';

const dodo = new DodoPayments({
  bearerToken: process.env.DODO_API_KEY || '',
  environment: process.env.NODE_ENV === 'production' ? 'live_mode' : 'test_mode',
});

// ⚠️ Remplace ces IDs par les vrais IDs de tes produits créés sur Dodo Payments
const PRODUCT_IDS: Record<string, string> = {
  pro_monthly: 'pdt_pro_monthly_id',
  pro_yearly: 'pdt_pro_yearly_id',
  institution_monthly: 'pdt_inst_monthly_id',
  institution_yearly: 'pdt_inst_yearly_id',
  payg: 'pdt_payg_id',
};

export class DodoService {
  static async createCheckoutSession({ 
    userId, 
    userEmail, 
    userName, 
    planId, 
    successUrl 
  }: { 
    userId: string, 
    userEmail: string, 
    userName: string, 
    planId: string, 
    successUrl: string 
  }) {
    const productId = PRODUCT_IDS[planId];
    if (!productId) throw new Error(`Plan inconnu pour Dodo : ${planId}`);

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: {
        email: userEmail,
        name: userName,
      },
      return_url: successUrl,
      metadata: {
        user_id: userId,
        plan_id: planId,
      },
    });

    return { url: session.checkout_url };
  }
}
