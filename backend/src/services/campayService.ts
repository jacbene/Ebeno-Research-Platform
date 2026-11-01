// backend/src/services/campayService.ts
import { CamPayClient } from '@lino_sap/campay-plugin';

// Le client lit les variables d'env si aucun paramètre n'est passé
const campay = new CamPayClient({
  username: process.env.CAMPAY_USERNAME,
  password: process.env.CAMPAY_PASSWORD,
  environment: (process.env.CAMPAY_ENVIRONMENT as 'DEV' | 'PROD') || 'DEV',
});

export class CampayService {
  static async initCollect({ userId, planId, amount, phone }: {
    userId: string;
    planId: string;
    amount: number;
    phone: string;
  }) {
    // external_reference permet de retrouver l'user et le plan au webhook
    const externalReference = `${userId}:${planId}`;

    const result = await campay.initCollect({
      amount: amount.toString(),
      currency: 'XAF',
      from: phone, // Format: 2376XXXXXXXX
      description: `Abonnement Ebeno - ${planId}`,
      external_reference: externalReference,
    });

    // result contient { reference, ussd_code, operator }
    return {
      reference: result.reference,
      ussdCode: result.ussd_code,
      operator: result.operator,
    };
  }

  static async getStatus(reference: string) {
    return await campay.getStatus(reference);
  }

  // Pour les liens de paiement (optionnel, mais utile si l'user n'est pas sur mobile)
  static async createPaymentLink({ userId, planId, amount }: {
    userId: string;
    planId: string;
    amount: number;
  }) {
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
