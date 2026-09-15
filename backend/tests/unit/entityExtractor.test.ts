// backend/tests/unit/entityExtractor.test.ts
import { extractEntitiesFromText, getDocumentEntities } from '../../src/services/entityExtractor';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';

describe('EntityExtractor', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe('extractEntitiesFromText', () => {
    test('Extrait les emails', () => {
      const text = 'Contactez-nous à contact@exemple.com ou support@test.fr';
      const entities = extractEntitiesFromText(text);
      expect(entities.Email.length).toBeGreaterThanOrEqual(2);
      expect(entities.Email).toContain('contact@exemple.com');
      expect(entities.Email).toContain('support@test.fr');
    });

    test('Extrait les URLs', () => {
      const text = 'Visitez https://ebeno.com et http://test.org';
      const entities = extractEntitiesFromText(text);
      expect(entities.Url.length).toBe(2);
    });

    test('Extrait les dates (format français)', () => {
      const text = 'La réunion a eu lieu le 15 janvier 2026.';
      const entities = extractEntitiesFromText(text);
      expect(entities.Date.length).toBeGreaterThanOrEqual(1);
    });

    test('Extrait les dates (format numérique)', () => {
      const text = 'Du 01/03/2026 au 15/03/2026.';
      const entities = extractEntitiesFromText(text);
      expect(entities.Date.length).toBeGreaterThanOrEqual(2);
    });

    test('Extrait les organisations (mots-clés)', () => {
      const text = "L'Université de Paris et la Fondation Recherche collaborent.";
      const entities = extractEntitiesFromText(text);
      expect(entities.Organization.length).toBeGreaterThanOrEqual(1);
    });

    test('Retourne des tableaux vides pour un texte vide', () => {
      const entities = extractEntitiesFromText('');
      expect(entities.Person).toEqual([]);
      expect(entities.Place).toEqual([]);
      expect(entities.Organization).toEqual([]);
      expect(entities.Date).toEqual([]);
      expect(entities.Email).toEqual([]);
      expect(entities.Url).toEqual([]);
    });

    test('Retourne un objet avec les 7 catégories', () => {
      const entities = extractEntitiesFromText('Test simple');
      expect(Object.keys(entities)).toEqual(
        expect.arrayContaining(['Person', 'Place', 'Organization', 'Date', 'Email', 'Phone', 'Url'])
      );
    });
  });

  describe('getDocumentEntities', () => {
    test('Retourne les entités groupées par type', async () => {
      const db = getTestDb();
      const now = new Date().toISOString();

      await db('document_entities').insert([
        {
          id: 'ent-1',
          documentId: 'doc-1',
          documentType: 'file',
          entityValue: 'contact@test.com',
          entityType: 'Email',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'ent-2',
          documentId: 'doc-1',
          documentType: 'file',
          entityValue: 'https://test.com',
          entityType: 'Url',
          occurrenceCount: 1,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const entities = await getDocumentEntities('doc-1', 'file');
      expect(entities.Email).toContain('contact@test.com');
      expect(entities.Url).toContain('https://test.com');
    });

    test('Retourne des tableaux vides si aucune entité', async () => {
      const entities = await getDocumentEntities('doc-inexistant', 'file');
      expect(entities.Person).toEqual([]);
      expect(entities.Email).toEqual([]);
    });
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });
});
