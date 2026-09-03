import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Migration déjà exécutée – conservée pour l'historique Knex
}

export async function down(knex: Knex): Promise<void> {
  // Ne rien faire
}
