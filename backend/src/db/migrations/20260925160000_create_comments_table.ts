import type { Knex } from 'knex';

// ✅ Pas de transaction — ALTER TABLE + CREATE TABLE peuvent échouer partiellement
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  const tableExists = await knex.schema.hasTable('comments');

  // ============================================================
  // CAS 1 : La table n'existe pas → on la crée avec le nouveau schéma
  // ============================================================
  if (!tableExists) {
    await knex.schema.createTable('comments', (table) => {
      table.string('id', 64).primary();
      table.string('documentId', 255).notNullable();
      table.string('documentType', 20).notNullable();
      table.string('userId', 64).notNullable();
      table.text('content').notNullable();
      table.string('parentId', 64).nullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      table.timestamp('deletedAt').nullable();

      table.index(['documentId', 'documentType'], 'idx_comments_doc');
      table.index('parentId', 'idx_comments_parent');
      table.index('userId', 'idx_comments_user');
    });

    console.log('✅ Table comments créée (nouveau schéma)');
    return;
  }

  // ============================================================
  // CAS 2 : La table existe → on migre vers le nouveau schéma
  // ============================================================
  console.log('ℹ️  Table comments existante, migration du schéma...');

  const hasDocumentId = await knex.schema.hasColumn('comments', 'documentId');
  const hasTranscriptionId = await knex.schema.hasColumn('comments', 'transcription_id');
  const hasParentId = await knex.schema.hasColumn('comments', 'parentId');
  const hasDeletedAt = await knex.schema.hasColumn('comments', 'deletedAt');

  await knex.schema.table('comments', (table) => {
    if (!hasDocumentId) {
      table.string('documentId', 255).nullable();
      table.string('documentType', 20).nullable();
    }
    if (!hasParentId) {
      table.string('parentId', 64).nullable();
    }
    if (!hasDeletedAt) {
      table.timestamp('deletedAt').nullable();
    }
  });

  if (hasTranscriptionId) {
    try {
      await knex.raw(`
        UPDATE comments
        SET "documentId" = transcription_id,
            "documentType" = 'transcription'
        WHERE transcription_id IS NOT NULL
          AND "documentId" IS NULL
      `);
      console.log('✅ Anciens commentaires migrés');
    } catch (err: any) {
      console.log(`⚠️ Migration données commentaires échouée (non bloquant): ${err.message}`);
    }
  }

  try {
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_comments_doc ON comments ("documentId", "documentType")`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments ("parentId")`);
    await knex.raw(`CREATE INDEX IF NOT EXISTS idx_comments_user ON comments ("userId")`);
  } catch (err: any) {
    console.log(`⚠️ Création index échouée (non bloquant): ${err.message}`);
  }

  console.log('✅ Table comments migrée vers le nouveau schéma');
}

export async function down(knex: Knex): Promise<void> {
  const hasDocumentId = await knex.schema.hasColumn('comments', 'documentId');
  if (hasDocumentId) {
    await knex.schema.table('comments', (table) => {
      table.dropColumn('documentId');
      table.dropColumn('documentType');
      table.dropColumn('parentId');
      table.dropColumn('deletedAt');
    });
  }
}
