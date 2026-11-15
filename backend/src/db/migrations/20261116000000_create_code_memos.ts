import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('code_memos');
  if (!hasTable) {
    await knex.schema.createTable('code_memos', (table) => {
      table.string('id').primary();
      table.string('project_id').notNullable();
      table.string('code_name').notNullable();
      table.string('user_id').notNullable();
      table.text('content').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('code_memos');
}
