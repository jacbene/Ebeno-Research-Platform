// backend/src/services/campayService.ts

const CAMPAY_BASE_URL = process.env.CAMPAY_ENVIRONMENT === 'PROD' 
  ? 'https://www.campay.net/api' 
  : 'https://demo.campay.net/api';

// ✅ Typage des réponses pour éviter l'erreur 'unknown'
interface CamPayAuthResponse {
  token: string;
}

interface CamPayError {
  detail?: string;
  message?: string;
}

interface CamPayCollectResponse {
  reference: string;
  ussd_code: string;
  operator: string;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch(`${CAMPAY_BASE_URL}/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: process.env.CAMPAY_USERNAME,
      password: process.env.CAMPAY_PASSWORD,
    }),
  });

  if (!response.ok) {
    // ✅ On force le type pour TypeScript
    const errorData = (await response.json()) as CamPayError;
    throw new Error(`CamPay Auth Error: ${errorData.detail || 'Échec de l\'authentification'}`);
  }

  const data = (await response.json()) as CamPayAuthResponse;
  return data.token;
}

export class CampayService {
  static async initCollect({ userId, planId, amount, phone }: {
    userId: string;
    planId: string;
    amount: number;
    phone: string;
  }) {
    const token = await getAccessToken();
    const externalReference = `${userId}:${planId}`;

    const response = await fetch(`${CAMPAY_BASE_URL}/collect/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: 'XAF',
        from: phone,
        description: `Abonnement Ebeno - ${planId}`,
        external_reference: externalReference,
      }),
    });

    if (!response.ok) {
      // ✅ Typage explicite
      const errorData = (await response.json()) as CamPayError;
      throw new Error(`CamPay Collect Error: ${errorData.detail || errorData.message || 'Échec de l\'initialisation du paiement'}`);
    }

    // ✅ Typage explicite
    const data = (await response.json()) as CamPayCollectResponse;
    return {
      reference: data.reference,
      ussdCode: data.ussd_code,
      operator: data.operator,
    };
  }

  static async getStatus(reference: string) {
    const token = await getAccessToken();
    const response = await fetch(`${CAMPAY_BASE_URL}/transaction/${reference}/`, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Impossible de récupérer le statut de la transaction');
    }

    return (await response.json()) as any; // Ici on renvoie le statut brut
  }
}
