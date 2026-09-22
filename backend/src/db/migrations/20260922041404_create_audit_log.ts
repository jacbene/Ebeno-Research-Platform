import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('audit_log');
  if (exists) {
    console.log('ℹ️ Table audit_log existe déjà');
    return;
  }

  await knex.schema.createTable('audit_log', (table) => {
    table.string('id').primary();

    // Qui
    table.string('userId').nullable();
    table.string('userEmail').nullable();

    // Quoi
    table.string('action').notNullable();       // login, logout, language_change...
    table.string('targetType').nullable();      // user, project, file...
    table.string('targetId').nullable();
    table.string('targetName').nullable();

    // Contexte
    table.string('ip').nullable();
    table.string('userAgent').nullable();
    table.text('metadata');                      // JSON stringifié

    // Résultat
    table.string('status').defaultTo('success'); // success | failure

    // Quand
    table.timestamp('createdAt').defaultTo(knex.fn.now());

    // Index pour les requêtes fréquentes
    table.index(['userId', 'createdAt'], 'idx_audit_user_date');
    table.index(['action', 'createdAt'], 'idx_audit_action_date');
    table.index(['createdAt'], 'idx_audit_date');
    table.index(['targetType', 'targetId'], 'idx_audit_target');
  });

  console.log('✅ Table audit_log créée');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('audit_log');
}
