import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('email').unique().notNullable();
    table.string('name');
    table.string('password').notNullable();
    table.string('role').defaultTo('RESEARCHER');
    table.boolean('isVerified').defaultTo(false);
    table.string('verificationToken');
    table.string('resetToken');
    table.timestamp('resetTokenExpiry');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('projects', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.string('description');
    table.string('status').defaultTo('ACTIVE');
    table.string('visibility').defaultTo('PRIVATE');
    table.string('userId').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('transcriptions', (table) => {
    table.string('id').primary();
    table.string('title').notNullable();
    table.string('status').defaultTo('PENDING');
    table.string('audioUrl');
    table.text('transcriptText');
    table.string('projectId').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('transcriptions');
  await knex.schema.dropTable('projects');
  await knex.schema.dropTable('users');
}
