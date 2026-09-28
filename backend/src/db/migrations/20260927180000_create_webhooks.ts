import type { Knex } from 'knex';

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  // ─── Table webhooks ─────────────────────────────────────
  const hasWebhooks = await knex.schema.hasTable('webhooks');
  if (!hasWebhooks) {
    await knex.schema.createTable('webhooks', (table) => {
      table.string('id', 64).primary();
      table.string('userId', 64).notNullable();
      table.string('projectId', 255).nullable();       // null = global
      table.string('name', 200).notNullable();
      table.string('url', 1024).notNullable();
      table.string('secret', 128).notNullable();        // HMAC secret
      table.text('events').notNullable();               // JSON array
      table.boolean('active').notNullable().defaultTo(true);

      // Stats
      table.integer('successCount').notNullable().defaultTo(0);
      table.integer('failureCount').notNullable().defaultTo(0);
      table.timestamp('lastTriggeredAt').nullable();
      table.timestamp('lastSuccessAt').nullable();
      table.timestamp('lastFailureAt').nullable();

      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());

      table.index('userId', 'idx_webhooks_user');
      table.index('projectId', 'idx_webhooks_project');
    });
    console.log('✅ Table webhooks créée');
  }

  // ─── Table webhook_deliveries ───────────────────────────
  const hasDeliveries = await knex.schema.hasTable('webhook_deliveries');
  if (!hasDeliveries) {
    await knex.schema.createTable('webhook_deliveries', (table) => {
      table.string('id', 64).primary();
      table.string('webhookId', 64).notNullable();
      table.string('event', 100).notNullable();
      table.integer('statusCode').nullable();
      table.boolean('success').notNullable().defaultTo(false);
      table.integer('attempt').notNullable().defaultTo(1);
      table.integer('durationMs').nullable();
      table.text('errorMessage').nullable();
      table.text('payload').nullable();                 // JSON payload envoyé (tronqué à 5KB)
      table.timestamp('createdAt').defaultTo(knex.fn.now());

      table.index(['webhookId', 'createdAt'], 'idx_deliveries_webhook');
    });
    console.log('✅ Table webhook_deliveries créée');
  }

  console.log('✅ Migrations webhooks terminées');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('webhook_deliveries');
  await knex.schema.dropTableIfExists('webhooks');
}
