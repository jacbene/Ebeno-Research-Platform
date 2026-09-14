// backend/tests/setup.ts
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest-only';
process.env.CLOUDINARY_URL = '';
process.env.OPENAI_API_KEY = '';
process.env.DEEPGRAM_API_KEY = '';

jest.setTimeout(30000);

// ✅ Mock global de la base : tous les services utiliseront la base de test pg-mem
jest.mock('../src/db/knex', () => {
  const { getTestDb } = require('./helpers/db');
  const testDb = getTestDb();
  return { db: testDb, default: testDb };
});

// Réduire le bruit
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  // On garde console.log pour debug
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});
