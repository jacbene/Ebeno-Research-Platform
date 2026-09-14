// backend/tests/unit/circuitBreaker.test.ts
import {
  isServiceAvailable,
  recordFailure,
  recordSuccess,
  getBreakersStatus,
} from '../../src/services/circuitBreaker';

describe('Circuit Breaker', () => {
  beforeEach(() => {
    // Réinitialiser tous les breakers
    const status = getBreakersStatus();
    Object.keys(status).forEach((service) => {
      recordSuccess(service);
    });
  });

  test('Un service est disponible par défaut', () => {
    expect(isServiceAvailable('test-service')).toBe(true);
  });

  test('Un échec transitoire ne désactive PAS le service', () => {
    recordFailure('test-transient', new Error('Timeout réseau'));
    expect(isServiceAvailable('test-transient')).toBe(true);
  });

  test('Un échec permanent (401) désactive le service', () => {
    recordFailure('test-401', new Error('401 Unauthorized'));
    expect(isServiceAvailable('test-401')).toBe(false);
  });

  test('Un échec permanent (quota) désactive le service', () => {
    recordFailure('test-quota', new Error('insufficient_quota'));
    expect(isServiceAvailable('test-quota')).toBe(false);
  });

  test('Un échec permanent (clé invalide) désactive le service', () => {
    recordFailure('test-invalid-key', new Error('invalid_api_key'));
    expect(isServiceAvailable('test-invalid-key')).toBe(false);
  });

  test('recordSuccess réactive le service', () => {
    recordFailure('test-reactivate', new Error('401 Unauthorized'));
    expect(isServiceAvailable('test-reactivate')).toBe(false);

    recordSuccess('test-reactivate');
    expect(isServiceAvailable('test-reactivate')).toBe(true);
  });

  test('getBreakersStatus retourne l\'état des services', () => {
    recordFailure('test-status', new Error('403 Forbidden'));
    const status = getBreakersStatus();

    expect(status['test-status']).toBeDefined();
    expect(status['test-status'].failureCount).toBe(1);
    expect(status['test-status'].lastError).toContain('403');
  });

  test('Le cooldown expire après la durée configurée', (done) => {
    // Cooldown très court (100ms)
    recordFailure('test-cooldown', new Error('401 Unauthorized'), 100);
    expect(isServiceAvailable('test-cooldown')).toBe(false);

    setTimeout(() => {
      expect(isServiceAvailable('test-cooldown')).toBe(true);
      done();
    }, 150);
  });
});
