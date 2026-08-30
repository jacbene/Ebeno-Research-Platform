import type { Knex } from 'knex';

const config: Knex.Config = {
  client: 'sqlite3',
  connection: {
    filename: './dev.db'
  },
  useNullAsDefault: true,
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts'
  }
};

export default config;
