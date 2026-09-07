// src/db/migrations/2026090715..._create_document_entities.ts

// On utilise any pour éviter les problèmes d'import de Knex
export async function up(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('document_entities');
  await knex.schema.createTable('document_entities', (table: any) => {
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

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('document_entities');
}
