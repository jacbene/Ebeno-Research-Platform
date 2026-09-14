import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasAvatar = await knex.schema.hasColumn('users', 'avatar');
  if (!hasAvatar) {
    await knex.schema.table('users', (table) => {
      table.string('avatar').nullable();
      table.string('bio').nullable();
      table.string('institution').nullable();
    });
    console.log('✅ Colonnes avatar, bio, institution ajoutées');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('avatar');
    table.dropColumn('bio');
    table.dropColumn('institution');
  });
}
