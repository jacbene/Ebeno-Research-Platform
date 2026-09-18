// backend/src/services/circuitBreaker.ts
import { logger } from '../utils/logger';

/**
 * Circuit Breaker : désactive temporairement un service après un échec
 * permanent (401, 403, 429 quota, etc.)
 *
 * Le service est automatiquement réessayé après un délai.
 */

interface BreakerState {
  disabledUntil: number | null;
  lastError: string;
  failureCount: number;
}

const breakers = new Map<string, BreakerState>();

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Codes/erreurs qui indiquent un problème **permanent** (clé invalide, quota épuisé)
 */
const PERMANENT_ERROR_PATTERNS = [
  '401',                    // Unauthorized
  '402',                    // ✅ Payment Required (nouveau)
  '403',                    // Forbidden
  'invalid_api_key',
  'invalid credentials',
  'invalid_auth',
  'insufficient_quota',
  'insufficient_balance',   // ✅ DeepSeek (nouveau)
  'credit_balance_exhausted',
  'no credits remaining',
  'quota',
  'expired',
  'revoked',
];

const isPermanentError = (errorMessage: string): boolean => {
  const lower = errorMessage.toLowerCase();
  return PERMANENT_ERROR_PATTERNS.some((pattern) => lower.includes(pattern.toLowerCase()));
};

/**
 * Vérifie si un service est disponible
 */
export const isServiceAvailable = (serviceName: string): boolean => {
  const state = breakers.get(serviceName);
  if (!state || !state.disabledUntil) return true;

  if (Date.now() >= state.disabledUntil) {
    // Réactiver le service
    logger.info(`🔄 [circuit-breaker] ${serviceName} réactivé après cooldown`);
    breakers.delete(serviceName);
    return true;
  }

  return false;
};

/**
 * Enregistre un échec. Si l'erreur est permanente, désactive le service.
 */
export const recordFailure = (
  serviceName: string,
  error: any,
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): void => {
  const errorMessage = error?.message || String(error);

  if (!isPermanentError(errorMessage)) {
    logger.warn(`⚠️ [circuit-breaker] ${serviceName} échec transitoire : ${errorMessage}`);
    return;
  }

  const previous = breakers.get(serviceName);
  const failureCount = (previous?.failureCount || 0) + 1;
  const disabledUntil = Date.now() + cooldownMs;

  breakers.set(serviceName, {
    disabledUntil,
    lastError: errorMessage.substring(0, 200),
    failureCount,
  });

  const minutes = Math.round(cooldownMs / 60000);
  logger.warn(
    `🚫 [circuit-breaker] ${serviceName} désactivé pendant ${minutes} min suite à : ${errorMessage.substring(0, 100)}`
  );
};

/**
 * Enregistre un succès (réinitialise le breaker)
 */
export const recordSuccess = (serviceName: string): void => {
  if (breakers.has(serviceName)) {
    logger.info(`✅ [circuit-breaker] ${serviceName} réinitialisé après succès`);
    breakers.delete(serviceName);
  }
};

/**
 * Retourne l'état de tous les breakers (pour monitoring)
 */
export const getBreakersStatus = (): Record<string, BreakerState> => {
  const status: Record<string, BreakerState> = {};
  breakers.forEach((state, service) => {
    status[service] = { ...state };
  });
  return status;
};
