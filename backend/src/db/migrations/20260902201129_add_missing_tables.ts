import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Table des mémos
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

  // Table des fichiers de projet
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

  // Table des membres de projet
  await knex.schema.createTable('project_members', (table) => {
    table.string('id').primary();
    table.string('projectId').notNullable();
    table.string('userId').notNullable();
    table.string('role').defaultTo('MEMBER');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    table.foreign('userId').references('users.id').onDelete('CASCADE');
  });

  // Table des tags
  await knex.schema.createTable('tags', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('color');
    table.string('category').defaultTo('user');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  // Table des tags de projet
  await knex.schema.createTable('project_tags', (table) => {
    table.string('projectId').notNullable();
    table.string('tagId').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.primary(['projectId', 'tagId']);
    table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    table.foreign('tagId').references('tags.id').onDelete('CASCADE');
  });

  // Table des codes
  await knex.schema.createTable('codes', (table) => {
    table.string('id').primary();
    table.string('name').notNullable();
    table.string('description');
    table.string('color');
    table.string('projectId').notNullable();
    table.string('userId').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    table.foreign('userId').references('users.id').onDelete('CASCADE');
  });

  // Table des associations codes-documents
  await knex.schema.createTable('document_codes', (table) => {
    table.string('id').primary();
    table.string('documentId').notNullable();
    table.string('codeId').notNullable();
    table.string('documentType').notNullable();
    table.integer('startPosition');
    table.integer('endPosition');
    table.string('comment');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.foreign('codeId').references('codes.id').onDelete('CASCADE');
  });

  // Table des documents collaboratifs
  await knex.schema.createTable('collaboration_documents', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.text('content');
    table.string('projectId').notNullable();
    table.string('createdBy').notNullable();
    table.integer('version').defaultTo(1);
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    table.foreign('createdBy').references('users.id').onDelete('CASCADE');
  });

  // Table des résumés de documents (si utilisée)
  await knex.schema.createTable('document_summaries', (table) => {
    table.string('id').primary();
    table.string('documentId').notNullable();
    table.string('type').notNullable();
    table.text('summary');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('document_summaries');
  await knex.schema.dropTable('collaboration_documents');
  await knex.schema.dropTable('document_codes');
  await knex.schema.dropTable('codes');
  await knex.schema.dropTable('project_tags');
  await knex.schema.dropTable('tags');
  await knex.schema.dropTable('project_members');
  await knex.schema.dropTable('project_files');
  await knex.schema.dropTable('memos');
}
