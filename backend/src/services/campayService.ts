// backend/src/services/campayService.ts

// Cache pour ne charger le module qu'une seule fois
let CampayClient: any = null;

async function getCampayClient() {
  if (!CampayClient) {
    // ✅ Import dynamique : fonctionne avec les modules ESM depuis du CommonJS
    const module = await import('@lino_sap/campay-plugin');
    CampayClient = module.CamPayClient;
  }
  
  return new CampayClient({
    username: process.env.CAMPAY_USERNAME,
    password: process.env.CAMPAY_PASSWORD,
    environment: (process.env.CAMPAY_ENVIRONMENT as 'DEV' | 'PROD') || 'DEV',
  });
}

export class CampayService {
  static async initCollect({ userId, planId, amount, phone }: {
    userId: string;
    planId: string;
    amount: number;
    phone: string;
  }) {
    const campay = await getCampayClient();
    const externalReference = `${userId}:${planId}`;

    const result = await campay.initCollect({
      amount: amount.toString(),
      currency: 'XAF',
      from: phone,
      description: `Abonnement Ebeno - ${planId}`,
      external_reference: externalReference,
    });

    return {
      reference: result.reference,
      ussdCode: result.ussd_code,
      operator: result.operator,
    };
  }

  static async getStatus(reference: string) {
    const campay = await getCampayClient();
    return await campay.getStatus(reference);
  }

  static async createPaymentLink({ userId, planId, amount }: {
    userId: string;
    planId: string;
    amount: number;
  }) {
    const campay = await getCampayClient();
    const link = await campay.createPaymentLink({
      amount: amount.toString(),
      currency: 'XAF',
      description: `Abonnement Ebeno - ${planId}`,
      external_reference: `${userId}:${planId}`,
      redirect_url: `${process.env.FRONTEND_URL}/payment/success`,
      failure_redirect_url: `${process.env.FRONTEND_URL}/payment/failure`,
    });

    return { url: link.link, reference: link.reference };
  }
}
