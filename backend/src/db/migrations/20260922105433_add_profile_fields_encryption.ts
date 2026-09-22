import type { Knex } from 'knex';
import crypto from 'crypto';

const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY || '';
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

export async function up(knex: Knex): Promise<void> {
  // 1. Ajouter les colonnes
  const hasBio = await knex.schema.hasColumn('users', 'bioEncrypted');
  if (!hasBio) {
    await knex.schema.table('users', (table) => {
      table.text('bioEncrypted').nullable();
      table.text('institutionEncrypted').nullable();
    });
    console.log('✅ Colonnes bioEncrypted + institutionEncrypted ajoutées');
  }

  // 2. Vérifier la clé
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error('ENCRYPTION_KEY manquante ou invalide');
  }

  // 3. Backfill
  const users = await knex('users')
    .whereNotNull('bio')
    .orWhereNotNull('institution')
    .select('id', 'bio', 'institution');

  console.log(`🔐 Backfill de ${users.length} utilisateur(s)...`);

  let updated = 0;
  for (const user of users) {
    const updates: any = {};

    if (user.bio && user.bio.trim()) {
      updates.bioEncrypted = encrypt(user.bio.trim());
    }
    if (user.institution && user.institution.trim()) {
      updates.institutionEncrypted = encrypt(user.institution.trim());
    }

    if (Object.keys(updates).length > 0) {
      await knex('users').where({ id: user.id }).update(updates);
      updated++;
    }
  }

  console.log(`✅ ${updated} profil(s) chiffré(s)`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('users', (table) => {
    table.dropColumn('bioEncrypted');
    table.dropColumn('institutionEncrypted');
  });
}
