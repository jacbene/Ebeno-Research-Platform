import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Table des organisations
  if (!(await knex.schema.hasTable('organizations'))) {
    await knex.schema.createTable('organizations', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('owner_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('paddle_subscription_id').nullable();
      table.string('paddle_customer_id').nullable();
      table.string('plan').notNullable().defaultTo('institution');
      table.integer('max_seats').notNullable().defaultTo(5);
      table.timestamps(true, true);
    });
  }

  // 2. Table des membres de l'organisation
  if (!(await knex.schema.hasTable('organization_members'))) {
    await knex.schema.createTable('organization_members', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').unsigned().references('id').inTable('organizations').onDelete('CASCADE');
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('role').notNullable().defaultTo('member'); // 'owner' ou 'member'
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      
      // Un utilisateur ne peut être que dans une seule organisation à la fois
      table.unique(['user_id']);
    });
  }

  // 3. Table des invitations
  if (!(await knex.schema.hasTable('organization_invitations'))) {
    await knex.schema.createTable('organization_invitations', (table) => {
      table.increments('id').primary();
      table.integer('organization_id').unsigned().references('id').inTable('organizations').onDelete('CASCADE');
      table.string('email').notNullable();
      table.string('token').notNullable().unique();
      table.string('status').notNullable().defaultTo('pending'); // pending, accepted, expired
      table.timestamp('expires_at').notNullable();
      table.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('organization_invitations');
  await knex.schema.dropTableIfExists('organization_members');
  await knex.schema.dropTableIfExists('organizations');
}
