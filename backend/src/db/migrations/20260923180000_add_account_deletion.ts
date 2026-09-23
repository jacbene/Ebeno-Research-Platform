import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'deletionRequestedAt');
  if (hasColumn) {
    console.log('ℹ️  Colonnes de suppression compte déjà présentes, skip');
    return;
  }

  await knex.schema.table('users', (table) => {
    table.timestamp('deletionRequestedAt').nullable();
    table.timestamp('deletionScheduledFor').nullable();
    table.text('deletionToken').nullable();
    table.text('deletionReason').nullable();
  });

  // Index pour la purge automatique
  await knex.schema.table('users', (table) => {
    table.index('deletionScheduledFor', 'idx_users_deletion_scheduled');
  });

  console.log('✅ Colonnes de suppression de compte ajoutées');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropIndex('deletionScheduledFor', 'idx_users_deletion_scheduled');
    table.dropColumn('deletionRequestedAt');
    table.dropColumn('deletionScheduledFor');
    table.dropColumn('deletionToken');
    table.dropColumn('deletionReason');
  });
}
