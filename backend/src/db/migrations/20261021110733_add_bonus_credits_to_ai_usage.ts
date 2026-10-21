import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasColumn('ai_usage', 'bonus_credits'))) {
    await knex.schema.alterTable('ai_usage', (table) => {
      table.integer('bonus_credits').notNullable().defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasColumn('ai_usage', 'bonus_credits')) {
    await knex.schema.alterTable('ai_usage', (table) => {
      table.dropColumn('bonus_credits');
    });
  }
}
