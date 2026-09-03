import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Ajouter les colonnes manquantes à la table transcriptions
  await knex.schema.table('transcriptions', (table) => {
    // Vérifier si la colonne errorMessage existe
    table.text('errorMessage');          // pour stocker les erreurs
    table.string('type').defaultTo('audio');   // 'audio' ou 'text'
    table.string('fileName');             // nom original du fichier
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('transcriptions', (table) => {
    table.dropColumn('errorMessage');
    table.dropColumn('type');
    table.dropColumn('fileName');
  });
}
