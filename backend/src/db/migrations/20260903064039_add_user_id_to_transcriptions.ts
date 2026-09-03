import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasUserId = await knex.schema.hasColumn('transcriptions', 'userId');
  if (!hasUserId) {
    await knex.schema.table('transcriptions', (table) => {
      table.string('userId').notNullable();
      table.foreign('userId').references('users.id').onDelete('CASCADE');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('transcriptions', (table) => {
    table.dropColumn('userId');
  });
}
