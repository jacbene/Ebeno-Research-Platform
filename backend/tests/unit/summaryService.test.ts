// backend/tests/unit/summaryService.test.ts
import { getDocumentSummary, getProjectSummaries } from '../../src/services/summaryService';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';

describe('SummaryService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('getDocumentSummary', () => {
    test('Retourne null si aucun résumé', async () => {
      const summary = await getDocumentSummary('doc-inexistant', 'file');
      expect(summary).toBeNull();
    });

    test('Retourne le résumé existant', async () => {
      const db = getTestDb();
      await db('document_summaries').insert({
        id: 'sum-1',
        documentId: 'doc-1',
        type: 'file',
        summary: 'Ceci est un résumé de test.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const summary = await getDocumentSummary('doc-1', 'file');
      expect(summary).toBe('Ceci est un résumé de test.');
    });
  });

  describe('getProjectSummaries', () => {
    test('Retourne un tableau vide si aucun document', async () => {
      const summaries = await getProjectSummaries('projet-vide', 'user-1');
      expect(Array.isArray(summaries)).toBe(true);
      expect(summaries.length).toBe(0);
    });

    test('Retourne les documents avec leurs résumés', async () => {
      const db = getTestDb();
      const now = new Date().toISOString();
      const projectId = 'projet-test-1';
      const userId = 'user-1';

      // Créer un memo
      await db('memos').insert({
        id: 'memo-1',
        title: 'Memo A',
        content: 'Contenu du memo A',
        userId,
        projectId,
        createdAt: now,
        updatedAt: now,
      });

      // Créer un fichier
      await db('project_files').insert({
        id: 'file-1',
        projectId,
        userId,
        fileName: 'test.txt',
        fileSize: 100,
        mimeType: 'text/plain',
        filePath: 'https://cloudinary.com/test.txt',
        uploadedAt: Date.now(),
      });

      // Ajouter un résumé pour le memo
      await db('document_summaries').insert({
        id: 'sum-1',
        documentId: 'memo-1',
        type: 'memo',
        summary: 'Résumé du memo A',
        createdAt: now,
        updatedAt: now,
      });

      const summaries = await getProjectSummaries(projectId, userId);
      expect(summaries.length).toBe(2);

      const memoSummary = summaries.find((s) => s.id === 'memo-1');
      expect(memoSummary?.hasSummary).toBe(true);
      expect(memoSummary?.summary).toBe('Résumé du memo A');

      const fileSummary = summaries.find((s) => s.id === 'file-1');
      expect(fileSummary?.hasSummary).toBe(false);
      expect(fileSummary?.summary).toBeNull();
    });
  });
});
