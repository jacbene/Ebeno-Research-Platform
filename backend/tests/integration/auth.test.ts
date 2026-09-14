// backend/tests/integration/auth.test.ts
import request from 'supertest';
import app from '../../src/server';
import { getTestDb, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db';
import bcrypt from 'bcryptjs';

describe('Auth API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('POST /api/auth/login', () => {
    test('Retourne 400 si email manquant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test123' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('Retourne 401 si email inexistant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'inexistant@test.com', password: 'test123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('incorrect');
    });

    test('Retourne un token si credentials valides', async () => {
      const db = getTestDb();
      const password = 'test123456';
      const hashedPassword = await bcrypt.hash(password, 10);

      await db('users').insert({
        id: 'test-user-1',
        email: 'valid@test.com',
        name: 'Valid User',
        password: hashedPassword,
        role: 'RESEARCHER',
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'valid@test.com', password });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('valid@test.com');
    });
  });

  describe('GET /api/auth/me', () => {
    test('Retourne 401 sans token', async () => {
      const response = await request(app).get('/api/auth/me');
      expect(response.status).toBe(401);
    });
  });
});
