//backend/src/db/migrations/20260918131348_add_language_to_users.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasLanguage = await knex.schema.hasColumn('users', 'language');

  if (!hasLanguage) {
    await knex.schema.table('users', (table) => {
      table.string('language', 5).notNullable().defaultTo('fr');
      table.index('language');
    });
    console.log('✅ Colonne language ajoutée à users');
  } else {
    console.log('ℹ️ Colonne language existe déjà');
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasLanguage = await knex.schema.hasColumn('users', 'language');
  if (hasLanguage) {
    await knex.schema.table('users', (table) => {
      table.dropIndex('language');
      table.dropColumn('language');
    });
  }
}
