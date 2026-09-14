// backend/tests/unit/codeSuggestionService.test.ts
import { getSuggestedCodes } from '../../src/services/codeSuggestionService';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';

describe('CodeSuggestionService', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  test('getSuggestedCodes retourne un tableau vide si aucun code', async () => {
    const codes = await getSuggestedCodes('project-inexistant');
    expect(Array.isArray(codes)).toBe(true);
    expect(codes.length).toBe(0);
  });

  test('getSuggestedCodes retourne les codes triés par fréquence', async () => {
    const db = getTestDb();

    await db('suggested_codes').insert([
      {
        id: 'code-1',
        projectId: 'project-1',
        code: 'coopérative',
        frequency: 5,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'code-2',
        projectId: 'project-1',
        code: 'agriculture',
        frequency: 10,
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]);

    const codes = await getSuggestedCodes('project-1');
    expect(codes.length).toBe(2);
    expect(codes[0].code).toBe('agriculture'); // Plus fréquent en premier
    expect(codes[1].code).toBe('coopérative');
  });
});
