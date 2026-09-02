import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Table tags
  if (!(await knex.schema.hasTable('tags'))) {
    await knex.schema.createTable('tags', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('color');
      table.string('category').defaultTo('user');
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
    });
  }

  // Table project_tags
  if (!(await knex.schema.hasTable('project_tags'))) {
    await knex.schema.createTable('project_tags', (table) => {
      table.string('projectId').notNullable();
      table.string('tagId').notNullable();
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.primary(['projectId', 'tagId']);
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
      table.foreign('tagId').references('tags.id').onDelete('CASCADE');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_tags');
  await knex.schema.dropTableIfExists('tags');
}

