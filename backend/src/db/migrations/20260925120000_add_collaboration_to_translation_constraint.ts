import type { Knex } from 'knex';

// ✅ Désactiver la transaction — essentiel car DROP/ADD CONSTRAINT
//    avorte la transaction PG en cas d'erreur (le try/catch ne suffit pas)
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // 1. Chercher la contrainte CHECK existante sur documentType
  const result = await knex.raw(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'document_translations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%documentType%';
  `);

  const constraints = result.rows || [];

  if (constraints.length === 0) {
    console.log('ℹ️  Aucune contrainte CHECK trouvée sur documentType — rien à faire');
    return;
  }

  for (const c of constraints) {
    console.log(`🔍 Contrainte trouvée : ${c.conname} → ${c.def}`);

    if (c.def.includes('collaboration')) {
      console.log(`ℹ️  Contrainte ${c.conname} déjà à jour, skip`);
      continue;
    }

    // 2. Drop l'ancienne contrainte
    await knex.raw(`ALTER TABLE document_translations DROP CONSTRAINT "${c.conname}";`);
    console.log(`✅ Contrainte ${c.conname} supprimée`);

    // 3. Recréer avec les 4 valeurs
    await knex.raw(`
      ALTER TABLE document_translations
      ADD CONSTRAINT "${c.conname}"
      CHECK ("documentType" IN ('transcription', 'memo', 'text', 'collaboration'));
    `);
    console.log(`✅ Contrainte ${c.conname} recréée avec 'collaboration'`);
  }

  console.log('✅ Support "collaboration" ajouté à document_translations');
}

export async function down(knex: Knex): Promise<void> {
  const result = await knex.raw(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'document_translations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%documentType%';
  `);

  for (const c of (result.rows || [])) {
    if (c.def.includes('collaboration')) {
      await knex.raw(`ALTER TABLE document_translations DROP CONSTRAINT "${c.conname}";`);
      await knex.raw(`
        ALTER TABLE document_translations
        ADD CONSTRAINT "${c.conname}"
        CHECK ("documentType" IN ('transcription', 'memo', 'text'));
      `);
    }
  }
}
