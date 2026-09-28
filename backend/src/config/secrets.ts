// backend/src/config/secrets.ts
// ✅ Validation centralisée des secrets critiques
//    Bloque le démarrage en production si un secret manque ou est faible

const FORBIDDEN_VALUES = new Set([
  'secret123',
  'default-secret',
  'your-secret-key-change-in-production',
  'changeme',
  'secret',
  'password',
  '',
]);

interface SecretSpec {
  name: string;
  minLength: number;
  description: string;
}

const CRITICAL_SECRETS: SecretSpec[] = [
  { name: 'JWT_SECRET',        minLength: 32,  description: 'Clé de signature JWT' },
  { name: 'ENCRYPTION_KEY',    minLength: 64,  description: 'Clé AES-256-GCM (hex 64 chars)' },
  { name: 'EMAIL_HASH_PEPPER', minLength: 32,  description: 'Pepper HMAC emails' },
  { name: 'ADMIN_TOKEN',       minLength: 32,  description: 'Token routes admin' },
];

/**
 * Récupère un secret OBLIGATOIRE.
 * En production : crash si manquant/invalide.
 * En dev : retourne la valeur par défaut si fournie (pour faciliter le dev).
 */
export const requireSecret = (name: string): string => {
  const value = process.env[name];
  const isProd = process.env.NODE_ENV === 'production';

  if (!value || FORBIDDEN_VALUES.has(value)) {
    if (isProd) {
      console.error(`🚨 [SECRETS] Secret critique manquant ou faible: ${name}`);
      console.error(`   → Configurez-le dans Render → Environment`);
      process.exit(1);
    }
    console.warn(`⚠️  [SECRETS] ${name} non configuré (dev mode)`);
    return `dev-${name.toLowerCase()}-do-not-use-in-prod`;
  }

  const spec = CRITICAL_SECRETS.find((s) => s.name === name);
  if (spec && value.length < spec.minLength) {
    if (isProd) {
      console.error(
        `🚨 [SECRETS] ${name} trop court (${value.length} < ${spec.minLength})`
      );
      process.exit(1);
    }
    console.warn(
      `⚠️  [SECRETS] ${name} trop court (${value.length} < ${spec.minLength})`
    );
  }

  return value;
};

/**
 * Vérifie TOUS les secrets critiques au démarrage.
 * À appeler en tout premier dans server.ts.
 */
export const validateAllSecrets = (): void => {
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];

  CRITICAL_SECRETS.forEach((spec) => {
    const value = process.env[spec.name];
    if (!value) {
      errors.push(`❌ ${spec.name} manquant (${spec.description})`);
    } else if (FORBIDDEN_VALUES.has(value)) {
      errors.push(`❌ ${spec.name} utilise une valeur par défaut interdite`);
    } else if (value.length < spec.minLength) {
      errors.push(
        `❌ ${spec.name} trop court: ${value.length} < ${spec.minLength} (${spec.description})`
      );
    }
  });

  if (errors.length > 0) {
    console.error('\n🚨 [SECRETS] Configuration invalide:');
    errors.forEach((e) => console.error('   ' + e));
    console.error('\n💡 Configurez ces variables dans Render → Environment.\n');
    if (isProd) process.exit(1);
  } else {
    console.log('✅ [SECRETS] Tous les secrets critiques sont valides');
  }
};

export default { requireSecret, validateAllSecrets };
