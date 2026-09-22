import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasToken = await knex.schema.hasColumn('users', 'emailVerificationToken');

  if (!hasToken) {
    await knex.schema.table('users', (table) => {
      table.text('emailVerificationToken').nullable();
      table.timestamp('emailVerificationExpiresAt').nullable();
      table.timestamp('emailVerifiedAt').nullable();
    });
    console.log('✅ Colonnes de vérification email ajoutées');
  }

  const result = await knex('users')
    .where({ isVerified: false })
    .orWhereNull('isVerified')
    .update({
      isVerified: true,
      emailVerifiedAt: new Date().toISOString(),
    });

  console.log(`✅ ${result} utilisateur(s) existant(s) marqué(s) comme vérifié(s)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('emailVerificationToken');
    table.dropColumn('emailVerificationExpiresAt');
    table.dropColumn('emailVerifiedAt');
  });
}
