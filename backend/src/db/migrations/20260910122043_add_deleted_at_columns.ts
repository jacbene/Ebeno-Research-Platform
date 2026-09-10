// backend/src/db/migrations/YYYYMMDDHHMMSS_add_deleted_at_columns.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // project_files
  const hasFileDeletedAt = await knex.schema.hasColumn('project_files', 'deletedAt');
  if (!hasFileDeletedAt) {
    await knex.schema.table('project_files', (table) => {
      table.bigint('deletedAt').nullable();
      table.index('deletedAt');
    });
  }

  // transcriptions
  const hasTransDeletedAt = await knex.schema.hasColumn('transcriptions', 'deletedAt');
  if (!hasTransDeletedAt) {
    await knex.schema.table('transcriptions', (table) => {
      table.timestamp('deletedAt').nullable();
      table.index('deletedAt');
    });
  }

  // memos
  const hasMemoDeletedAt = await knex.schema.hasColumn('memos', 'deletedAt');
  if (!hasMemoDeletedAt) {
    await knex.schema.table('memos', (table) => {
      table.timestamp('deletedAt').nullable();
      table.index('deletedAt');
    });
  }

  console.log('✅ Colonnes deletedAt ajoutées');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('project_files', (table) => table.dropColumn('deletedAt'));
  await knex.schema.table('transcriptions', (table) => table.dropColumn('deletedAt'));
  await knex.schema.table('memos', (table) => table.dropColumn('deletedAt'));
}
