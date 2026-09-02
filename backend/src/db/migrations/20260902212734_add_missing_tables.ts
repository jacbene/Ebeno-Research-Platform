import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Table tags
  const hasTags = await knex.schema.hasTable('tags');
  if (!hasTags) {
    await knex.schema.createTable('tags', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('color');
      table.string('category').defaultTo('user');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
  }

  // Table project_tags
  const hasProjectTags = await knex.schema.hasTable('project_tags');
  if (!hasProjectTags) {
    await knex.schema.createTable('project_tags', (table) => {
      table.string('projectId').notNullable();
      table.string('tagId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.primary(['projectId', 'tagId']);
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
      table.foreign('tagId').references('tags.id').onDelete('CASCADE');
    });
  }

  // Table memos
  const hasMemos = await knex.schema.hasTable('memos');
  if (!hasMemos) {
    await knex.schema.createTable('memos', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.string('userId').notNullable();
      table.string('projectId');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      table.foreign('userId').references('users.id').onDelete('CASCADE');
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    });
  }

  // Table project_files
  const hasProjectFiles = await knex.schema.hasTable('project_files');
  if (!hasProjectFiles) {
    await knex.schema.createTable('project_files', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('userId').notNullable();
      table.string('fileName').notNullable();
      table.integer('fileSize');
      table.string('mimeType');
      table.string('filePath');
      table.bigint('uploadedAt');
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_tags');
  await knex.schema.dropTableIfExists('tags');
  await knex.schema.dropTableIfExists('memos');
  await knex.schema.dropTableIfExists('project_files');
}
