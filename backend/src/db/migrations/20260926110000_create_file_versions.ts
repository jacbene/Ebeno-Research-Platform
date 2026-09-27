import type { Knex } from 'knex';

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('file_versions');
  if (exists) {
    console.log('ℹ️  Table file_versions déjà présente');
    return;
  }

  await knex.schema.createTable('file_versions', (table) => {
    table.string('id', 64).primary();
    table.string('fileId', 255).notNullable();
    table.integer('version').notNullable();
    table.string('filePath', 1024).notNullable();
    table.string('cloudinaryPublicId', 255).nullable();
    table.string('fileName', 512).notNullable();
    table.bigInteger('fileSize').nullable();
    table.string('mimeType', 100).nullable();
    table.string('editedBy', 64).nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    table.index(['fileId', 'version'], 'idx_file_versions');
  });

  console.log('✅ Table file_versions créée');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('file_versions');
}
