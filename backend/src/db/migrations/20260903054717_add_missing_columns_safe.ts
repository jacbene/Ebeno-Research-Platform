import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Vérifier et ajouter errorMessage si elle n'existe pas
  const hasErrorMessage = await knex.schema.hasColumn('transcriptions', 'errorMessage');
  if (!hasErrorMessage) {
    await knex.schema.table('transcriptions', (table) => {
      table.text('errorMessage');
    });
  }

  // Vérifier et ajouter type si elle n'existe pas
  const hasType = await knex.schema.hasColumn('transcriptions', 'type');
  if (!hasType) {
    await knex.schema.table('transcriptions', (table) => {
      table.string('type').defaultTo('audio');
    });
  }

  // Vérifier et ajouter fileName si elle n'existe pas
  const hasFileName = await knex.schema.hasColumn('transcriptions', 'fileName');
  if (!hasFileName) {
    await knex.schema.table('transcriptions', (table) => {
      table.string('fileName');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Ne pas supprimer les colonnes pour éviter la perte de données
  // Si vous souhaitez les supprimer, vous pouvez le faire, mais avec précaution
}
