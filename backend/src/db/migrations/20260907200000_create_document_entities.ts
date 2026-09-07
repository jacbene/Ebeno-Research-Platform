export async function up(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('document_entities');
  await knex.schema.createTable('document_entities', (table: any) => {
    table.string('id').primary();
    table.string('documentId').notNullable();
    table.string('documentType').notNullable();
    table.string('entityValue').notNullable();     // ✅ colonne attendue par le code
    table.string('entityType').notNullable();      // ✅ colonne attendue par le code
    table.integer('occurrenceCount').defaultTo(1); // ✅ colonne attendue par le code
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.index(['documentId', 'documentType']);
    table.index('entityValue');
    table.index('entityType');
  });
}

export async function down(knex: any): Promise<void> {
  await knex.schema.dropTableIfExists('document_entities');
}
