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
    // ⚠️ TODO(v2.6): réécrire ces tests. Raisons du skip :
    //
    // 1. Le service requiert un `project_members` pour autoriser l'accès
    //    (les tests d'origine n'en insèrent pas → throw systématique).
    //
    // 2. Le retour a évolué : plus d'`entities` / `totalEntities`
    //    (couvert par entityExtractor.test.ts). Le service retourne :
    //    { projectId, quota, totalWords, uniqueWords, topKeywords, wordCloud }
    //
    // 3. Le service throw si `allText.trim().length < 50` (projet "vide").
    //    Il faut adapter les scénarios à cette règle.
    //
    // 4. `checkAndIncrementAiQuota` est appelé → nécessite la table ai_usage
    //    dans pg-mem (schéma tests/setup.ts à aligner avec les migrations).
    //
    // Chantier dette #3 : aligner pg-mem + réécrire le test.
    test.skip('Retourne une structure valide pour un projet vide', async () => {
      // À réécrire : ce cas doit désormais attendre un throw,
      // pas un succès.
      const result = await getProjectAnalysis('projet-vide', 'user-1');
      expect(result).toBeDefined();
      expect(result.projectId).toBe('projet-vide');
    });

    test.skip('Compte correctement les entités du projet', async () => {
      // À réécrire : les entités sont gérées par entityExtractor,
      // pas par getProjectAnalysis. Tester les champs réels :
      // totalWords, uniqueWords, topKeywords, wordCloud, quota.
      const db = getTestDb();
      const now = new Date().toISOString();

      await db('memos').insert({
        id: 'memo-1',
        title: 'Memo 1',
        content: 'Contenu',
        userId: 'user-1',
        projectId: 'projet-entites',
        createdAt: now,
        updatedAt: now,
      });

      const result = await getProjectAnalysis('projet-entites', 'user-1');
      expect(result).toBeDefined();
    });

    test.skip('Ignore les entités hors du projet', async () => {
      // Scénario à réécrire complètement.
    });
  });
});
