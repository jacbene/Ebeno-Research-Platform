// backend/src/config/knexfile.ts
import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProd = process.env.NODE_ENV === 'production';

const config: Knex.Config = {
  client: isProd ? 'pg' : 'sqlite3',
  connection: isProd ? process.env.DATABASE_URL : { filename: './dev.db' },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../db/migrations'),
    extension: isProd ? 'js' : 'ts',
    loadExtensions: isProd ? ['.js'] : ['.ts'],
    // ✅ Ignore la vérification de cohérence DB ↔ dossier
    // (nécessaire quand les migrations ont été renommées .ts → .js)
    disableMigrationsListValidation: true,
  },
  pool: isProd ? { min: 2, max: 10 } : undefined,
};

export default config;
