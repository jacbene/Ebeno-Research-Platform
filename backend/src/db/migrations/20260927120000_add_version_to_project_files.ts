import type { Knex } from 'knex';

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  const hasVersion = await knex.schema.hasColumn('project_files', 'version');

  if (hasVersion) {
    console.log('ℹ️  Colonne version déjà présente dans project_files');
    return;
  }

  await knex.schema.table('project_files', (table) => {
    table.integer('version').notNullable().defaultTo(1);
  });

  console.log('✅ Colonne version ajoutée à project_files');
}

export async function down(knex: Knex): Promise<void> {
  const hasVersion = await knex.schema.hasColumn('project_files', 'version');
  if (hasVersion) {
    await knex.schema.table('project_files', (table) => {
      table.dropColumn('version');
    });
  }
}
