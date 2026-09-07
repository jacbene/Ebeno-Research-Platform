// src/db/migrations/2026090715..._create_document_entities.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('document_entities');
  if (!exists) {
    await knex.schema.createTable('document_entities', (table) => {
      table.string('id').primary();
      table.string('documentId').notNullable();
      table.string('documentType').notNullable();
      table.string('entity').notNullable();
      table.string('type').notNullable();
      table.integer('count').defaultTo(1);
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());

      table.index(['documentId', 'documentType']);
      table.index('entity');
      table.index('type');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_entities');
}
