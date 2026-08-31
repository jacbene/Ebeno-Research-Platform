import knex from 'knex';
import config from '../config/knexfile';

export const db = knex(config);

db.raw('SELECT 1').then(() => {
  console.log('✅ Base de données connectée');
}).catch((err) => {
  console.error('❌ Erreur de connexion:', err);
});
