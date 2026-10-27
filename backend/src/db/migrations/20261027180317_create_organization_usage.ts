import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('organization_usage'))) {
    await knex.schema.createTable('organization_usage', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').unsigned().references('id').inTable('organizations').onDelete('CASCADE');
      table.string('month').notNullable(); // YYYY-MM
      table.integer('messages_used').notNullable().defaultTo(0);
      table.integer('bonus_credits').notNullable().defaultTo(0);
      
      table.unique(['organization_id', 'month']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organization_usage');
}
