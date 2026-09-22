import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const has2FA = await knex.schema.hasColumn('users', 'twoFactorEnabled');

  if (!has2FA) {
    await knex.schema.table('users', (table) => {
      // ✅ Chiffré (AES-256-GCM via encryptionService)
      table.text('twoFactorSecretEncrypted').nullable();

      // État
      table.boolean('twoFactorEnabled').defaultTo(false);

      // Backup codes (JSON stringifié, chacun hashé bcrypt)
      table.text('twoFactorBackupCodes').nullable();

      // Timestamp de la dernière activation
      table.timestamp('twoFactorEnabledAt').nullable();
    });

    console.log('✅ Colonnes 2FA ajoutées à users');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('twoFactorSecretEncrypted');
    table.dropColumn('twoFactorEnabled');
    table.dropColumn('twoFactorBackupCodes');
    table.dropColumn('twoFactorEnabledAt');
  });
}
