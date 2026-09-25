import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  try {
    await knex.raw(`
      ALTER TYPE document_translations_documenttype_enum
      ADD VALUE IF NOT EXISTS 'collaboration';
    `);
    console.log('✅ Type "collaboration" ajouté à l\'enum documentType');
  } catch (err: any) {
    // Fallback : si l'enum n'existe pas (SQLite dev), on ignore
    console.log('ℹ️  Enum non modifiable (probablement SQLite dev) :', err.message);
  }
}

export async function down(): Promise<void> {
  // PostgreSQL ne supporte pas DROP VALUE sur un enum
  // Rollback impossible sans recréer l'enum → on ne fait rien
  console.log('⚠️  Rollback non supporté pour ALTER TYPE ADD VALUE');
}
