// backend/src/db/knex.ts
import knex from 'knex';
import knexConfig from '../config/knexfile';

export const db = knex(knexConfig);

if (process.env.NODE_ENV !== 'test') {
  db.raw('SELECT 1')
    .then(() => console.log('✅ Base de données connectée'))
    .catch((err) => console.error('❌ Erreur de connexion:', err));
}

export default db;
