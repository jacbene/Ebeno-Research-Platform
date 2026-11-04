import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('project_files', 'extractedText');
  
  if (!hasColumn) {
    await knex.schema.alterTable('project_files', (table) => {
      table.text('extractedText').nullable();
    });
    console.log('✅ Colonne extractedText ajoutée à project_files');
  } else {
    console.log('ℹ️ Colonne extractedText déjà présente, skip.');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('project_files', 'extractedText');
  
  if (hasColumn) {
    await knex.schema.alterTable('project_files', (table) => {
      table.dropColumn('extractedText');
    });
  }
}
