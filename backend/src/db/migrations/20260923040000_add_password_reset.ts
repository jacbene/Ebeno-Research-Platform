// backend/src/db/migrations/20260923040000_add_password_reset.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasToken = await knex.schema.hasColumn('users', 'passwordResetToken');

  if (hasToken) {
    console.log('ℹ️  Colonnes password reset déjà présentes, skip');
    return;
  }

  await knex.schema.table('users', (table) => {
    table.text('passwordResetToken').nullable();
    table.timestamp('passwordResetExpiresAt').nullable();
  });

  console.log('✅ Colonnes de réinitialisation mot de passe ajoutées');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('passwordResetToken');
    table.dropColumn('passwordResetExpiresAt');
  });
}
