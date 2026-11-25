import request from 'supertest';
import app from '../../src/server';
import { CampayService } from '../../src/services/campayService';
import { setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db';
import { createTestUser } from '../helpers/auth';

describe('CamPay checkout availability', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('rejects new mobile-money checkouts without contacting CamPay', async () => {
    const user = await createTestUser();
    const initCollect = jest.spyOn(CampayService, 'initCollect');

    const response = await request(app)
      .post('/api/payments/checkout')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        planId: 'pro_monthly',
        method: 'MOBILE_MONEY',
        phone: '+237600000000',
      });

    expect(response.status).toBe(503);
    expect(response.body.error).toContain('temporairement indisponibles');
    expect(initCollect).not.toHaveBeenCalled();
  });
});
