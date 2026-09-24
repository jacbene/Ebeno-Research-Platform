import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('document_translations');
  if (exists) {
    console.log('ℹ️  Table document_translations déjà existante');
    return;
  }

  await knex.schema.createTable('document_translations', (table) => {
    table.string('id', 64).primary();
    table.string('documentId', 255).notNullable();
    table.enum('documentType', ['transcription', 'memo', 'text']).notNullable();
    table.string('targetLang', 10).notNullable();
    table.string('sourceLang', 10).nullable();
    table.text('translatedText').notNullable();
    table.string('provider', 32).nullable(); // 'deepseek' | 'openai'
    table.string('requestedBy', 64).nullable(); // userId
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    // ✅ Une seule traduction par (doc, type, langue)
    table.unique(['documentId', 'documentType', 'targetLang'], {
      indexName: 'uniq_doc_translation',
    });

    // Index pour récupérer toutes les traductions d'un document
    table.index(['documentId', 'documentType'], 'idx_doc_translations');
  });

  console.log('✅ Table document_translations créée');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('document_translations');
}
