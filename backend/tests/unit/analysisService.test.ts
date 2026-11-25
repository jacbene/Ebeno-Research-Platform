// backend/tests/unit/analysisService.test.ts
import { getProjectAnalysis } from '../../src/services/analysisService';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';

const USER_ID = 'user-1';
const PROJECT_ID = 'project-1';
const ANALYSIS_TEXT =
  'recherche sociale recherche sociale analyse terrain données recherche sociale';

describe('AnalysisService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
    const db = getTestDb();
    await db('users').insert({
      id: USER_ID,
      email: 'user-1@example.test',
      password: 'test-password',
    });
  });

  describe('getProjectAnalysis', () => {
    const addProjectMember = async (projectId = PROJECT_ID) => {
      await getTestDb()('project_members').insert({
        id: `membership-${projectId}`,
        projectId,
        userId: USER_ID,
      });
    };

    test('refuse l’analyse d’un projet dont le contenu est trop court', async () => {
      await addProjectMember();

      await expect(getProjectAnalysis(PROJECT_ID, USER_ID)).rejects.toThrow(
        'Pas assez de contenu pour analyser ce projet.'
      );
      const usageCount = await getTestDb()('ai_usage').count('* as count').first();
      expect(Number(usageCount?.count)).toBe(0);
    });

    test('retourne les statistiques de mots-clés et le quota du projet', async () => {
      const db = getTestDb();
      await addProjectMember();
      await db('memos').insert({
        id: 'memo-1',
        title: 'Memo analysis',
        content: ANALYSIS_TEXT,
        userId: USER_ID,
        projectId: PROJECT_ID,
      });

      await expect(getProjectAnalysis(PROJECT_ID, USER_ID)).resolves.toMatchObject({
        projectId: PROJECT_ID,
        totalWords: 9,
        uniqueWords: 5,
        topKeywords: [
          { word: 'recherche', count: 3 },
          { word: 'sociale', count: 3 },
          { word: 'analyse', count: 1 },
          { word: 'terrain', count: 1 },
          { word: 'données', count: 1 },
        ],
        quota: { used: 1, limit: 50 },
      });

      const usage = await db('ai_usage').where({ user_id: USER_ID }).first();
      expect(usage.messages_used).toBe(1);
    });

    test('n’inclut pas le contenu des autres projets', async () => {
      const db = getTestDb();
      await addProjectMember();
      await db('memos').insert([
        {
          id: 'memo-in-project',
          title: 'Memo in project',
          content: ANALYSIS_TEXT,
          userId: USER_ID,
          projectId: PROJECT_ID,
        },
        {
          id: 'memo-outside-project',
          title: 'Memo outside project',
          content: 'astronomieextraordinaire '.repeat(8),
          userId: USER_ID,
          projectId: 'another-project',
        },
      ]);

      const result = await getProjectAnalysis(PROJECT_ID, USER_ID);

      expect(result.topKeywords).not.toContainEqual(
        expect.objectContaining({ word: 'astronomieextraordinaire' })
      );
      expect(result.totalWords).toBe(9);
    });

    test('refuse l’analyse à un utilisateur qui n’est pas membre du projet', async () => {
      await expect(getProjectAnalysis(PROJECT_ID, USER_ID)).rejects.toThrow(
        "Vous n'avez pas accès à ce projet."
      );
    });
  });
});
