import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('suggested_codes');
  if (!hasTable) {
    await knex.schema.createTable('suggested_codes', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('code').notNullable();
      table.integer('frequency').defaultTo(1);
      table.string('status').defaultTo('pending');
      table.bigint('createdAt').notNullable();
      table.bigint('updatedAt').notNullable();
      table.index(['projectId', 'code', 'status']);
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    });
    console.log('✅ Table suggested_codes créée');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('suggested_codes');
}
