import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_members', (table) => {
    table.string('id').primary();
    table.string('projectId').notNullable();
    table.string('userId').notNullable();
    table.string('role').defaultTo('MEMBER');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());

    table.foreign('projectId').references('projects.id').onDelete('CASCADE');
    table.foreign('userId').references('users.id').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('project_members');
}
