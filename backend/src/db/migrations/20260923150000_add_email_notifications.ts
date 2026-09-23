import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('users', 'notifyProjectMemberAdded');
  if (hasColumn) {
    console.log('ℹ️  Colonnes de notifications déjà présentes, skip');
    return;
  }

  await knex.schema.table('users', (table) => {
    table.boolean('notifyProjectMemberAdded').notNullable().defaultTo(true);
    table.boolean('notifyTranscriptionComplete').notNullable().defaultTo(true);
    table.boolean('notifySummaryReady').notNullable().defaultTo(true);
  });

  console.log('✅ Colonnes de préférences email ajoutées (3 notifications)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('notifyProjectMemberAdded');
    table.dropColumn('notifyTranscriptionComplete');
    table.dropColumn('notifySummaryReady');
  });
}
