import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('webhook_deliveries', 'next_retry_at'))) {
    await knex.schema.alterTable('webhook_deliveries', (table) => {
      table.timestamp('next_retry_at').nullable();
      table.boolean('is_dead').notNullable().defaultTo(false); // true si abandon définitif
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('webhook_deliveries', 'next_retry_at')) {
    await knex.schema.alterTable('webhook_deliveries', (table) => {
      table.dropColumn('next_retry_at');
      table.dropColumn('is_dead');
    });
  }
}
