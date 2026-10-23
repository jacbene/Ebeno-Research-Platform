import { Knex } from 'knex';
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('users', 'isSuspended'))) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('isSuspended').notNullable().defaultTo(false);
    });
  }
}
export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('users', 'isSuspended')) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('isSuspended');
    });
  }
}
