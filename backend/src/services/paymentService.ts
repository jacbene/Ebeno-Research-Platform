// backend/src/services/paymentService.ts
import { CampayService } from './providers/campay.service';
import { LemonSqueezyService } from './providers/lemonsqueezy.service';
import { PaddleService } from './providers/paddle.service'; // Ton service actuel

export class PaymentService {
  static async createCheckout(userId: string, planId: string, method: 'MOBILE_MONEY' | 'CARD_LEMON' | 'CARD_PADDLE', amount: number, phone?: string) {
    switch (method) {
      case 'MOBILE_MONEY':
        return CampayService.initCollect({ userId, planId, amount, phone });
      case 'CARD_LEMON':
        return LemonSqueezyService.createCheckout({ userId, planId, amount });
      case 'CARD_PADDLE':
        return PaddleService.createCheckout({ userId, planId, amount });
      default:
        throw new Error('Méthode de paiement non supportée');
    }
  }
}
