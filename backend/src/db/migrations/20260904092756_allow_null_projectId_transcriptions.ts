import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transcriptions', (table) => {
    table.string('projectId').nullable().alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('transcriptions', (table) => {
    table.string('projectId').notNullable().alter();
  });
}
