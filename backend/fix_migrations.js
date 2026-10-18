const knex = require('knex');
const config = require('./src/config/knexfile.ts').default;

config.client = 'pg';
config.connection = {
  connectionString: 'postgresql://neondb_owner:npg_ekNfB43gvwqI@ep-steep-night-b20xm3jf-pooler.c-6.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

const db = knex(config);

async function fix() {
  try {
    console.log('Correction des extensions (.ts)...');
    await db.raw("UPDATE knex_migrations SET name = name || '.ts' WHERE name NOT LIKE '%.ts' AND name NOT LIKE '%.js'");
    console.log('✅ Extensions corrigées !');
    await db.destroy();
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await db.destroy();
  }
}

fix();
