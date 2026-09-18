// backend/src/db/migrations/XXXXXXXXXXXXXX_add_language_to_documents.ts
import type { Knex } from 'knex';

/**
 * Ajoute une colonne `language` (ISO 639-1) aux documents.
 *
 * - NULL = langue non encore détectée
 * - 'fr' / 'en' / 'es' / ... = langue détectée automatiquement
 *
 * ⚠️ On ne met PAS de NOT NULL car :
 *  - Certains textes peuvent être trop courts pour être détectés
 *  - Le backfill se fait progressivement lors des prochains accès
 */
export async function up(knex: Knex): Promise<void> {
  // transcriptions (audio + textes importés)
  const hasTransLang = await knex.schema.hasColumn('transcriptions', 'language');
  if (!hasTransLang) {
    await knex.schema.table('transcriptions', (table) => {
      table.string('language', 5).nullable();
      table.index('language');
    });
    console.log('✅ Colonne language ajoutée à transcriptions');
  }

  // memos
  const hasMemosLang = await knex.schema.hasColumn('memos', 'language');
  if (!hasMemosLang) {
    await knex.schema.table('memos', (table) => {
      table.string('language', 5).nullable();
      table.index('language');
    });
    console.log('✅ Colonne language ajoutée à memos');
  }

  // project_files (documents uploadés)
  const hasFilesLang = await knex.schema.hasColumn('project_files', 'language');
  if (!hasFilesLang) {
    await knex.schema.table('project_files', (table) => {
      table.string('language', 5).nullable();
      table.index('language');
    });
    console.log('✅ Colonne language ajoutée à project_files');
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = ['transcriptions', 'memos', 'project_files'];
  for (const table of tables) {
    const hasColumn = await knex.schema.hasColumn(table, 'language');
    if (hasColumn) {
      await knex.schema.table(table, (t) => {
        t.dropIndex('language');
        t.dropColumn('language');
      });
    }
  }
}
