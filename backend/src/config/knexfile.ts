// backend/src/config/knexfile.ts
import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

const migrations = {
  directory: path.join(__dirname, '../db/migrations'),
  extension: isProd ? 'js' : 'ts',
  loadExtensions: isProd ? ['.js'] : ['.ts'],
};

const config: Knex.Config = {
  client: isProd ? 'pg' : 'sqlite3',
  connection: isProd
    ? {
        connectionString: process.env.DATABASE_URL,
        // ✅ Render Postgres : SSL requis si connexion externe
        //    (inutile si Internal URL, mais on garde pour compat)
        ssl:
          process.env.DATABASE_SSL === 'true'
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : isTest
    ? { filename: ':memory:' } // ✅ Base éphémère en mémoire pour les tests
    : { filename: './dev.db' },
  useNullAsDefault: !isProd, // ✅ Uniquement pour SQLite
  migrations,
  pool: isProd ? { min: 2, max: 10 } : undefined,
};

export default config;
