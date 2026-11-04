// backend/check-db.js
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    console.log("✅ Connecté à la base de données.");

    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'project_files' AND column_name = 'extractedText';
    `);

    if (res.rows.length > 0) {
      console.log("✅ Colonne 'extractedText' trouvée :", res.rows[0]);
    } else {
      console.log("❌ Colonne 'extractedText' introuvable. La migration n'a peut-être pas encore été appliquée sur cette base.");
    }
  } catch (err) {
    console.error("❌ Erreur de connexion ou de requête :", err.message);
  } finally {
    await client.end();
  }
})();
