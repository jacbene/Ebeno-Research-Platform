import type { Knex } from 'knex';

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('push_subscriptions');
  if (exists) {
    console.log('ℹ️  Table push_subscriptions déjà présente');
    return;
  }

  await knex.schema.createTable('push_subscriptions', (table) => {
    table.string('id', 64).primary();
    table.string('userId', 64).notNullable();
    table.text('endpoint').notNullable().unique();
    table.text('p256dh').notNullable();
    table.text('auth').notNullable();
    table.text('userAgent').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('lastUsedAt').defaultTo(knex.fn.now());

    table.index('userId', 'idx_push_user');
  });

  console.log('✅ Table push_subscriptions créée');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('push_subscriptions');
}
