export async function up(knex: any): Promise<void> {
  // On supprime l'ancienne table si elle existe
  await knex.schema.dropTableIfExists('document_entities');
  // On la recrée avec les colonnes attendues par le code
  await knex.schema.createTable('document_entities', (table: any) => {
    table.string('id').primary();
    table.string('documentId').notNullable();
    table.string('documentType').notNullable();
    table.string('entityValue').notNullable();
    table.string('entityType').notNullable();
    table.integer('occurrenceCount').defaultTo(1);
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
