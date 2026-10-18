import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Table des abonnements (Paddle)
  if (!(await knex.schema.hasTable('subscriptions'))) {
    await knex.schema.createTable('subscriptions', (table) => {
      table.increments('id').primary();
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('paddle_subscription_id').unique().nullable();
      table.string('paddle_customer_id').nullable();
      table.string('plan').notNullable().defaultTo('free');
      table.string('status').notNullable().defaultTo('active');
      table.timestamp('current_period_end').nullable();
      table.timestamps(true, true);
    });
  }

  // 2. Table d'idempotence des webhooks
  if (!(await knex.schema.hasTable('webhook_events'))) {
    await knex.schema.createTable('webhook_events', (table) => {
      table.increments('id').primary();
      table.string('paddle_event_id').unique().notNullable();
      table.string('event_type').notNullable();
      table.timestamp('processed_at').defaultTo(knex.fn.now());
    });
  }

  // 3. Table de suivi de l'usage IA
  if (!(await knex.schema.hasTable('ai_usage'))) {
    await knex.schema.createTable('ai_usage', (table) => {
      table.increments('id').primary();
      table.string('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('month').notNullable();
      table.integer('messages_used').notNullable().defaultTo(0);
      table.unique(['user_id', 'month']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_usage');
  await knex.schema.dropTableIfExists('webhook_events');
  await knex.schema.dropTableIfExists('subscriptions');
}
