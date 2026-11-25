import request from 'supertest';
import app from '../../src/server';
import { getTestDb, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from '../helpers/db';
import { createTestProject, createTestUser } from '../helpers/auth';

describe('Memo project authorization', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  test('allows a project member to create a memo', async () => {
    const owner = await createTestUser();
    const project = await createTestProject(owner.user.id);

    const response = await request(app)
      .post('/api/memos')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        title: 'Authorized memo',
        content: 'Contenu de test autorisé',
        projectId: project.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.memo.projectId).toBe(project.id);
  });

  test('rejects a non-member without creating a memo or activity', async () => {
    const owner = await createTestUser();
    const outsider = await createTestUser();
    const project = await createTestProject(owner.user.id);

    const response = await request(app)
      .post('/api/memos')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({
        title: 'Unauthorized memo',
        content: 'Contenu interdit',
        projectId: project.id,
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Vous n'êtes pas membre de ce projet");

    const db = getTestDb();
    const memos = await db('memos').where({ projectId: project.id });
    const activities = await db('project_activity').where({ projectId: project.id });
    expect(memos).toHaveLength(0);
    expect(activities).toHaveLength(0);
  });
});
