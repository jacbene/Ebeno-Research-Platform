import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config: Knex.Config = {
  client: process.env.NODE_ENV === 'production' ? 'pg' : 'sqlite3',
  connection: process.env.NODE_ENV === 'production'
    ? process.env.DATABASE_URL
    : { filename: './dev.db' },
  useNullAsDefault: true,
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  pool: process.env.NODE_ENV === 'production' ? { min: 2, max: 10 } : undefined,
};

export default config;
