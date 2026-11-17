import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasAvatarKey = await knex.schema.hasColumn('users', 'avatarKey');
  if (!hasAvatarKey) {
    await knex.schema.alterTable('users', (table) => {
      table.string('avatarKey').nullable();
    });
    console.log('✅ Colonne users.avatarKey ajoutée');
  } else {
    console.log('ℹ️ Colonne users.avatarKey déjà présente — skip');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasAvatarKey = await knex.schema.hasColumn('users', 'avatarKey');
  if (hasAvatarKey) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('avatarKey');
    });
    console.log('✅ Colonne users.avatarKey supprimée');
  }
}
