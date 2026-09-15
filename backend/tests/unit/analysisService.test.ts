// backend/tests/unit/analysisService.test.ts
import { getProjectAnalysis } from '../../src/services/analysisService';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';

describe('AnalysisService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('getProjectAnalysis', () => {
    test('Retourne une structure valide pour un projet vide', async () => {
      const result = await getProjectAnalysis('projet-vide', 'user-1');

      expect(result).toBeDefined();
      expect(result.projectId).toBe('projet-vide');
      expect(typeof result.totalEntities).toBe('number');
      expect(result.entities).toBeDefined();
    });

    test('Compte correctement les entités du projet', async () => {
      const db = getTestDb();
      const now = new Date().toISOString();
      const projectId = 'projet-entites';
      const userId = 'user-1';

      await db('memos').insert({
        id: 'memo-1',
        title: 'Memo 1',
        content: 'Contenu',
        userId,
        projectId,
        createdAt: now,
        updatedAt: now,
      });

      await db('document_entities').insert([
        {
          id: 'e-1',
          documentId: 'memo-1',
          documentType: 'memo',
          entityValue: 'Paris',
          entityType: 'Place',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'e-2',
          documentId: 'memo-1',
          documentType: 'memo',
          entityValue: 'contact@test.fr',
          entityType: 'Email',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await getProjectAnalysis(projectId, userId);

      expect(result.totalEntities).toBe(2);
      expect(result.entities.Place).toContain('Paris');
      expect(result.entities.Email).toContain('contact@test.fr');
    });

    test('Ignore les entités hors du projet', async () => {
      const db = getTestDb();
      const now = new Date().toISOString();

      await db('memos').insert({
        id: 'memo-target',
        title: 'Target',
        content: 'Contenu',
        userId: 'user-1',
        projectId: 'projet-cible',
        createdAt: now,
        updatedAt: now,
      });

      await db('memos').insert({
        id: 'memo-other',
        title: 'Other',
        content: 'Contenu',
        userId: 'user-1',
        projectId: 'autre-projet',
        createdAt: now,
        updatedAt: now,
      });

      await db('document_entities').insert([
        {
          id: 'e-1',
          documentId: 'memo-target',
          documentType: 'memo',
          entityValue: 'Paris',
          entityType: 'Place',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'e-2',
          documentId: 'memo-other',
          documentType: 'memo',
          entityValue: 'Lyon',
          entityType: 'Place',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await getProjectAnalysis('projet-cible', 'user-1');

      expect(result.entities.Place).toContain('Paris');
      expect(result.entities.Place).not.toContain('Lyon');
    });
  });
});
