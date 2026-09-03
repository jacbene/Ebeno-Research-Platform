import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('transcriptions', (table) => {
    // Colonne pour les messages d'erreur
    table.text('errorMessage');
    // Type de document (audio / text)
    table.string('type').defaultTo('audio');
    // Nom original du fichier
    table.string('fileName');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('transcriptions', (table) => {
    table.dropColumn('errorMessage');
    table.dropColumn('type');
    table.dropColumn('fileName');
  });
}
