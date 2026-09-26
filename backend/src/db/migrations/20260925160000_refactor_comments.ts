import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasDocumentId = await knex.schema.hasColumn('comments', 'documentId');

  if (hasDocumentId) {
    console.log('ℹ️  Colonnes comments déjà présentes, skip');
    return;
  }

  await knex.schema.table('comments', (table) => {
    // ✅ Nouveau modèle : documentId + documentType
    table.string('documentId', 255).nullable();
    table.string('documentType', 20).nullable();

    // ✅ Réponses (fils de discussion)
    table.string('parentId', 64).nullable();

    // ✅ Soft delete
    table.timestamp('deletedAt').nullable();

    table.index(['documentId', 'documentType'], 'idx_comments_doc');
    table.index('parentId', 'idx_comments_parent');
  });

  // ✅ Migrer les commentaires existants (transcription_id → documentId)
  await knex.raw(`
    UPDATE comments
    SET "documentId" = transcription_id,
        "documentType" = 'transcription'
    WHERE transcription_id IS NOT NULL
      AND "documentId" IS NULL
  `);

  console.log('✅ Table comments refactorée (documentId + documentType + parentId)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('comments', (table) => {
    table.dropIndex('documentId', 'idx_comments_doc');
    table.dropIndex('parentId', 'idx_comments_parent');
    table.dropColumn('documentId');
    table.dropColumn('documentType');
    table.dropColumn('parentId');
    table.dropColumn('deletedAt');
  });
}
