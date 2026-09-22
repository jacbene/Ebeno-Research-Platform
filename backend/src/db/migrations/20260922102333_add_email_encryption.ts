import type { Knex } from 'knex';
import crypto from 'crypto';

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '';
const EMAIL_PEPPER = process.env.EMAIL_HASH_PEPPER || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY_HEX, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

const hashEmail = (email: string): string => {
  return crypto
    .createHmac('sha256', EMAIL_PEPPER)
    .update(email.toLowerCase().trim())
    .digest('hex');
};

export async function up(knex: Knex): Promise<void> {
  // 1. Ajouter les colonnes
  const hasEncrypted = await knex.schema.hasColumn('users', 'emailEncrypted');
  if (!hasEncrypted) {
    await knex.schema.table('users', (table) => {
      table.text('emailEncrypted').nullable();
      table.string('emailHash', 64).nullable();
      table.index('emailHash', 'idx_users_email_hash');
    });
    console.log('✅ Colonnes emailEncrypted + emailHash ajoutées');
  }

  // 2. Vérifier les clés
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error('ENCRYPTION_KEY manquante ou invalide');
  }
  if (!EMAIL_PEPPER || EMAIL_PEPPER.length < 32) {
    throw new Error('EMAIL_HASH_PEPPER manquant');
  }

  // 3. Backfill : chiffrer tous les emails existants
  const users = await knex('users').select('id', 'email');
  console.log(`🔐 Backfill de ${users.length} utilisateur(s)...`);

  let updated = 0;
  for (const user of users) {
    if (!user.email) continue;

    const emailLower = user.email.toLowerCase().trim();
    const emailEncrypted = encrypt(emailLower);
    const emailHash = hashEmail(emailLower);

    await knex('users')
      .where({ id: user.id })
      .update({ emailEncrypted, emailHash });

    updated++;
  }

  console.log(`✅ ${updated} email(s) chiffré(s)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropIndex('emailHash', 'idx_users_email_hash');
    table.dropColumn('emailEncrypted');
    table.dropColumn('emailHash');
  });
}

