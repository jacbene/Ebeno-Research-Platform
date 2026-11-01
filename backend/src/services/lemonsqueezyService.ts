// backend/src/services/lemonsqueezyService.ts
import { lemonSqueezySetup, createCheckout } from '@lemonsqueezy/lemonsqueezy.js';

// Configuration unique au chargement du module
lemonSqueezySetup({ 
  apiKey: process.env.LEMON_SQUEEZY_API_KEY || '' 
});

export class LemonSqueezyService {
  static async createCheckout({ userId, planId, amount }: { userId: string, planId: string, amount: number }) {
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID!;
    
    // Mapping de tes plans vers les Variant IDs Lemon Squeezy
    const variantMap: Record<string, string | undefined> = {
      'pro_monthly': process.env.LEMON_VARIANT_PRO_MONTHLY,
      'pro_yearly': process.env.LEMON_VARIANT_PRO_YEARLY,
      'institution_monthly': process.env.LEMON_VARIANT_INSTITUTION_MONTHLY,
      'institution_yearly': process.env.LEMON_VARIANT_INSTITUTION_YEARLY,
      'payg': process.env.LEMON_VARIANT_PAYG,
    };

    const variantId = variantMap[planId];
    if (!variantId) throw new Error(`Plan inconnu pour Lemon Squeezy : ${planId}`);

    const { data, error } = await createCheckout(storeId, variantId, {
      checkoutData: {
        custom: { 
          user_id: userId, 
          plan_id: planId 
        },
      },
      productOptions: {
        redirectUrl: `${process.env.FRONTEND_URL}/payment/success`,
      },
    });

    if (error) throw new Error(error.message);
    return { url: data.data.attributes.url };
  }
}
