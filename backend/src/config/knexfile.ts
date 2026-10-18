// backend/src/config/knexfile.ts
import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const usePg = process.env.USE_NEON === 'true' || isProd;

const migrations = {
  directory: path.join(__dirname, '../db/migrations'),
  extension: 'ts',
  loadExtensions: ['.js', '.ts'], // <-- On autorise les deux !
};

const config: Knex.Config = {
  client: usePg ? 'pg' : 'sqlite3',
  connection: usePg
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // On force le SSL pour Neon
      }
    : isTest
    ? { filename: ':memory:' } // ✅ Base éphémère en mémoire pour les tests
    : { filename: './dev.db' },
  useNullAsDefault: !usePg, // ✅ Uniquement pour SQLite
  migrations,
  pool: isProd ? { min: 2, max: 10 } : undefined,
};

export default config;
