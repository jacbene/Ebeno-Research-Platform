// backend/tests/integration/files.test.ts
import request from 'supertest';
import app from '../../src/server';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../helpers/db';
import { createTestUser, createTestProject, createTestFile } from '../helpers/auth';

describe('Files API', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('GET /api/projects/:projectId/files', () => {
    test('Retourne 401 sans token', async () => {
      const response = await request(app).get('/api/projects/xxx/files');
      expect(response.status).toBe(401);
    });

    test('Retourne les fichiers du projet', async () => {
      const { user, token } = await createTestUser();
      const project = await createTestProject(user.id);

      await createTestFile(project.id, user.id, { fileName: 'doc1.txt' });
      await createTestFile(project.id, user.id, { fileName: 'doc2.pdf' });

      const response = await request(app)
        .get(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.files).toBeDefined();
      expect(response.body.files.length).toBe(2);
    });

    test('Ne retourne pas les fichiers en corbeille', async () => {
      const { user, token } = await createTestUser();
      const project = await createTestProject(user.id);

      const file1 = await createTestFile(project.id, user.id, { fileName: 'active.txt' });
      const file2 = await createTestFile(project.id, user.id, { fileName: 'trashed.txt' });

      // Mettre file2 à la corbeille
      const { getTestDb } = await import('../helpers/db');
      const db = getTestDb();
      await db('project_files').where({ id: file2.id }).update({ deletedAt: Date.now() });

      const response = await request(app)
        .get(`/api/projects/${project.id}/files`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.files.length).toBe(1);
      expect(response.body.files[0].fileName).toBe('active.txt');
    });
  });

  describe('DELETE /api/projects/:projectId/files/:fileId', () => {
    test('Effectue un soft delete (met à la corbeille)', async () => {
      const { user, token } = await createTestUser();
      const project = await createTestProject(user.id);
      const file = await createTestFile(project.id, user.id);

      const response = await request(app)
        .delete(`/api/projects/${project.id}/files/${file.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Vérifier en base
      const { getTestDb } = await import('../helpers/db');
      const db = getTestDb();
      const updated = await db('project_files').where({ id: file.id }).first();
      expect(updated.deletedAt).not.toBeNull();
    });

    test('Retourne 404 si fichier inexistant', async () => {
      const { user, token } = await createTestUser();
      const project = await createTestProject(user.id);

      const response = await request(app)
        .delete(`/api/projects/${project.id}/files/inexistant`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});
