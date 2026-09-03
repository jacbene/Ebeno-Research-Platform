import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Table codes
  const hasCodes = await knex.schema.hasTable('codes');
  if (!hasCodes) {
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
  }

  // Table document_codes
  const hasDocumentCodes = await knex.schema.hasTable('document_codes');
  if (!hasDocumentCodes) {
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
  }

  // Table collaboration_documents
  const hasCollabDocs = await knex.schema.hasTable('collaboration_documents');
  if (!hasCollabDocs) {
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
  }

  // Table document_summaries
  const hasDocSummaries = await knex.schema.hasTable('document_summaries');
  if (!hasDocSummaries) {
    await knex.schema.createTable('document_summaries', (table) => {
      table.string('id').primary();
      table.string('documentId').notNullable();
      table.string('type').notNullable();
      table.text('summary');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_summaries');
  await knex.schema.dropTableIfExists('collaboration_documents');
  await knex.schema.dropTableIfExists('document_codes');
  await knex.schema.dropTableIfExists('codes');
}
