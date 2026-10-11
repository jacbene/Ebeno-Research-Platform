import type { Knex } from 'knex';

export const config = { transaction: false };

/**
 * Migration : tables pour le Chat IA multilingue
 * - chat_conversations : conversations par projet + utilisateur
 * - chat_messages      : messages (user / assistant / system)
 */

export async function up(knex: Knex): Promise<void> {
  // ═══════════════════════════════════════════════════════
  // 1. chat_conversations
  // ═══════════════════════════════════════════════════════
  const convExists = await knex.schema.hasTable('chat_conversations');
  if (!convExists) {
    await knex.schema.createTable('chat_conversations', (table) => {
      table.string('id', 64).primary();
      table.string('projectId', 64).notNullable();
      table.string('userId', 64).notNullable();
      table.string('title', 255).notNullable().defaultTo('Nouvelle conversation');
      table.string('language', 5).defaultTo('fr');

      table.integer('messageCount').defaultTo(0);
      table.integer('totalTokens').defaultTo(0);

      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.timestamp('updatedAt').defaultTo(knex.fn.now());
      table.timestamp('deletedAt').nullable();

      table.index(['projectId', 'deletedAt'], 'idx_chat_conv_project');
      table.index(['userId', 'deletedAt'], 'idx_chat_conv_user');
      table.index('updatedAt', 'idx_chat_conv_updated');
    });

    console.log('✅ Table chat_conversations créée');
  } else {
    console.log('ℹ️  Table chat_conversations déjà présente');
  }

  // ═══════════════════════════════════════════════════════
  // 2. chat_messages
  // ═══════════════════════════════════════════════════════
  const msgExists = await knex.schema.hasTable('chat_messages');
  if (!msgExists) {
    await knex.schema.createTable('chat_messages', (table) => {
      table.string('id', 64).primary();
      table.string('conversationId', 64).notNullable();
      table.string('role', 20).notNullable(); // 'user' | 'assistant' | 'system'
      table.text('content').notNullable();
      table.string('model', 50).nullable();        // 'deepseek-chat' | 'gpt-4o-mini'
      table.integer('tokens').nullable();
      table.string('finishReason', 50).nullable(); // 'stop' | 'length' | 'error'
      table.text('sources').nullable();            // JSON array stringifié
      table.timestamp('createdAt').defaultTo(knex.fn.now());

      table.index(['conversationId', 'createdAt'], 'idx_chat_msg_conv');
    });

    console.log('✅ Table chat_messages créée');
  } else {
    console.log('ℹ️  Table chat_messages déjà présente');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_messages');
  await knex.schema.dropTableIfExists('chat_conversations');
}
