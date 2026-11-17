/**
 * backend/scripts/migrate-cloudinary-to-minio.ts
 *
 * Migration des fichiers stockés sur Cloudinary vers MinIO (self-hosted).
 * Complète la dette v2.x : « script migration Cloudinary → MinIO ».
 *
 * ─── Usage ────────────────────────────────────────────────────────────────
 *   # 1. Inventaire (aucune écriture) : colonnes qui contiennent des URL Cloudinary
 *   npx ts-node scripts/migrate-cloudinary-to-minio.ts --scan
 *
 *   # 2. Simulation (dry-run, par défaut)
 *   npx ts-node scripts/migrate-cloudinary-to-minio.ts --limit 20
 *
 *   # 3. Exécution réelle
 *   npx ts-node scripts/migrate-cloudinary-to-minio.ts --apply --limit 500
 *
 *   # 4. Exécution + suppression de l'asset d'origine sur Cloudinary
 *   npx ts-node scripts/migrate-cloudinary-to-minio.ts --apply --delete-source
 *
 * ─── Prérequis (.env) ─────────────────────────────────────────────────────
 *   DATABASE_URL, MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET
 *   (CLOUDINARY_* uniquement pour --delete-source, ou pour les assets privés)
 *
 * ─── Garanties ────────────────────────────────────────────────────────────
 *   • Par défaut, AUCUNE écriture : le script affiche ce qu'il ferait.
 *   • Idempotent : une URL déjà sur MinIO (contient /<bucket>/) est ignorée.
 *   • Une ligne en échec n'interrompt pas la migration (comptée et listée).
 *   • Chaque ligne est mise à jour indépendamment (pas de transaction globale).
 *   • Code de sortie 1 si au moins un échec.
 */

import 'dotenv/config';
import path from 'path';
import { db } from '../src/db/knex';
import { uploadToMinio } from '../src/services/minioService';
import { deleteFromCloudinary } from '../src/services/cloudinaryService';

// ═══════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════

interface Options {
  apply: boolean;
  scan: boolean;
  deleteSource: boolean;
  limit: number;
  only: string[];
  verbose: boolean;
}

function parseArgs(argv: string[]): Options {
  const o: Options = {
    apply: false,
    scan: false,
    deleteSource: false,
    limit: 100,
    only: ['project_files', 'users'],
    verbose: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--scan') o.scan = true;
    else if (a === '--delete-source') o.deleteSource = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--limit') o.limit = Math.max(1, Number(argv[++i]) || 100);
    else if (a === '--only') o.only = String(argv[++i] || '').split(',').filter(Boolean);
    else if (a === '--help' || a === '-h') {
      console.log(`
Migration Cloudinary → MinIO

  --scan            inventaire des colonnes contenant des URL Cloudinary, puis sortie
  --apply           écrit réellement en base (sinon dry-run)
  --limit N         nombre max de lignes par table (défaut 100)
  --only t1,t2      tables à traiter (défaut project_files,users)
  --delete-source   supprime l'asset Cloudinary après migration réussie
  --verbose         détail par ligne
`);
      process.exit(0);
    }
  }
  return o;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

const BUCKET = process.env.MINIO_BUCKET || 'ebeno-files';
const MINIO_MARKER = `/${BUCKET}/`;
const CLOUDINARY_MARKER = 'res.cloudinary.com';

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  zip: 'application/zip',
};

function mimeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || '';
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function isCloudinaryUrl(v: unknown): v is string {
  return typeof v === 'string' && v.includes(CLOUDINARY_MARKER);
}

function isAlreadyMinio(v: unknown): boolean {
  return typeof v === 'string' && v.includes(MINIO_MARKER);
}

/**
 * Dossier de destination sur MinIO.
 * On conserve l'arborescence Cloudinary (publicId) quand elle existe,
 * sinon on retombe sur le dossier du projet.
 */
function targetFolder(row: { publicId?: string | null; projectId?: string | null; fallback: string }): string {
  if (row.publicId && row.publicId.includes('/')) {
    return path.posix.dirname(row.publicId);
  }
  return row.projectId ? `projects/${row.projectId}` : row.fallback;
}

/**
 * fetch global (Node 18+). Typé en any volontairement : le tsconfig du backend
 * cible `lib: ES2020`, où `fetch` n'existe pas ; la déclaration globale dépend
 * de la version de @types/node installée. On évite ainsi un « Cannot find name
 * 'fetch' » à la compilation comme à l'exécution.
 */
const httpFetch = (globalThis as any).fetch as
  | ((input: string) => Promise<{
      ok: boolean;
      status: number;
      headers: { get(name: string): string | null };
      arrayBuffer(): Promise<ArrayBuffer>;
    }>)
  | undefined;

async function download(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (!httpFetch) {
    throw new Error('fetch indisponible : Node 18+ est requis pour télécharger les assets');
  }
  const res = await httpFetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} en téléchargeant ${url.slice(0, 90)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || mimeFromUrl(url);
  return { buffer: buf, contentType: contentType.split(';')[0].trim() };
}

interface Stats {
  ok: number;
  skipped: number;
  failed: number;
  bytes: number;
  errors: string[];
}

const stats: Stats = { ok: 0, skipped: 0, failed: 0, bytes: 0, errors: [] };

// ═══════════════════════════════════════════════════════════
// Mode --scan : où sont les URL Cloudinary ?
// ═══════════════════════════════════════════════════════════

async function scan(): Promise<void> {
  console.log('🔍 Inventaire des colonnes texte contenant des URL Cloudinary\n');

  const cols = await db.raw(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND data_type IN ('text', 'character varying')
    ORDER BY table_name, column_name
  `);

  const rows: Array<{ table_name: string; column_name: string }> =
    cols.rows ?? cols[0] ?? [];

  let total = 0;
  for (const { table_name, column_name } of rows) {
    try {
      const r = await db.raw(
        'SELECT count(*)::int AS n FROM ?? WHERE ?? LIKE ?',
        [table_name, column_name, `%${CLOUDINARY_MARKER}%`],
      );
      const n = Number((r.rows ?? r)[0]?.n ?? 0);
      if (n > 0) {
        console.log(`  ${table_name}.${column_name} : ${n} ligne(s)`);
        total += n;
      }
    } catch {
      // Colonne non interrogeable (vue, permission…) : ignorée
    }
  }

  console.log(`\n${total} valeur(s) Cloudinary au total.`);
  console.log('Ajoutez les tables pertinentes via --only t1,t2 après avoir complété le script.');
}

// ═══════════════════════════════════════════════════════════
// Migration d'une ligne
// ═══════════════════════════════════════════════════════════

interface MigrateRowArgs {
  table: string;
  id: string;
  url: string;
  publicId?: string | null;
  projectId?: string | null;
  mimeType?: string | null;
  opts: Options;
}

async function migrateRow(args: MigrateRowArgs): Promise<void> {
  const { table, id, url, opts } = args;

  if (isAlreadyMinio(url)) {
    stats.skipped++;
    if (opts.verbose) console.log(`  ⏭️  ${table}#${id} déjà sur MinIO`);
    return;
  }
  if (!isCloudinaryUrl(url)) {
    stats.skipped++;
    return;
  }

  const folder = targetFolder({
    publicId: args.publicId,
    projectId: args.projectId,
    fallback: table === 'users' ? 'avatars' : 'misc',
  });

  if (!opts.apply) {
    console.log(`  🔎 ${table}#${id} → ${folder}/ (dry-run, non écrit)`);
    stats.ok++;
    return;
  }

  const { buffer, contentType } = await download(url);
  const mimeType = args.mimeType || contentType || mimeFromUrl(url);

  const uploaded = await uploadToMinio(buffer, folder, mimeType);
  stats.bytes += buffer.length;

  // Mise à jour de la ligne (colonnes selon la table)
  if (table === 'project_files') {
    await db('project_files')
      .where({ id })
      .update({
        filePath: uploaded.secureUrl,
        cloudinaryPublicId: uploaded.publicId,
      });
  } else if (table === 'users') {
    await db('users').where({ id }).update({ avatar: uploaded.secureUrl });
  } else {
    throw new Error(`Table non gérée : ${table}`);
  }

  stats.ok++;
  console.log(`  ✅ ${table}#${id} → ${uploaded.publicId} (${(buffer.length / 1024).toFixed(0)} Ko)`);

  // Suppression de la source (optionnelle, après succès de la copie)
  if (opts.deleteSource && args.publicId) {
    try {
      await deleteFromCloudinary(args.publicId);
      console.log(`     🗑️  source Cloudinary supprimée : ${args.publicId}`);
    } catch (e: any) {
      stats.errors.push(`delete-source ${args.publicId}: ${e.message}`);
      console.warn(`     ⚠️  suppression source impossible : ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Tables supportées
// ═══════════════════════════════════════════════════════════

async function migrateProjectFiles(opts: Options): Promise<void> {
  console.log(`\n📁 project_files (limite ${opts.limit})`);
  const rows = await db('project_files')
    .whereNotNull('filePath')
    .andWhere('filePath', 'like', `%${CLOUDINARY_MARKER}%`)
    .limit(opts.limit)
    .select('id', 'projectId', 'filePath', 'cloudinaryPublicId', 'mimeType');

  if (!rows.length) {
    console.log('  (rien à migrer)');
    return;
  }

  for (const row of rows) {
    try {
      await migrateRow({
        table: 'project_files',
        id: String(row.id),
        url: row.filePath,
        publicId: row.cloudinaryPublicId,
        projectId: row.projectId,
        mimeType: row.mimeType,
        opts,
      });
    } catch (e: any) {
      stats.failed++;
      stats.errors.push(`project_files#${row.id}: ${e.message}`);
      console.error(`  ❌ project_files#${row.id} : ${e.message}`);
    }
  }
}

async function migrateUsers(opts: Options): Promise<void> {
  console.log(`\n👤 users.avatar (limite ${opts.limit})`);
  const rows = await db('users')
    .whereNotNull('avatar')
    .andWhere('avatar', 'like', `%${CLOUDINARY_MARKER}%`)
    .limit(opts.limit)
    .select('id', 'avatar');

  if (!rows.length) {
    console.log('  (rien à migrer)');
    return;
  }

  for (const row of rows) {
    try {
      await migrateRow({
        table: 'users',
        id: String(row.id),
        url: row.avatar,
        publicId: null,
        projectId: null,
        opts,
      });
    } catch (e: any) {
      stats.failed++;
      stats.errors.push(`users#${row.id}: ${e.message}`);
      console.error(`  ❌ users#${row.id} : ${e.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  console.log('══════════════════════════════════════════════════');
  console.log(' Migration Cloudinary → MinIO');
  console.log(` Mode : ${opts.apply ? 'APPLY (écriture)' : 'DRY-RUN (aucune écriture)'}`);
  console.log(` Bucket cible : ${BUCKET}`);
  console.log('══════════════════════════════════════════════════');

  if (opts.scan) {
    await scan();
    return;
  }

  if (!process.env.MINIO_ACCESS_KEY || !process.env.MINIO_SECRET_KEY) {
    throw new Error('MINIO_ACCESS_KEY / MINIO_SECRET_KEY manquants dans l\'environnement');
  }

  if (opts.only.includes('project_files')) await migrateProjectFiles(opts);
  if (opts.only.includes('users')) await migrateUsers(opts);

  console.log('\n─── Résumé ───────────────────────────────────────');
  console.log(`  migrés  : ${stats.ok}`);
  console.log(`  ignorés : ${stats.skipped}`);
  console.log(`  échecs  : ${stats.failed}`);
  console.log(`  volume  : ${(stats.bytes / 1024 / 1024).toFixed(2)} Mo`);
  if (stats.errors.length) {
    console.log('\n  Détail des erreurs :');
    stats.errors.slice(0, 20).forEach((e) => console.log(`   - ${e}`));
    if (stats.errors.length > 20) console.log(`   … et ${stats.errors.length - 20} autre(s)`);
  }
  if (!opts.apply) {
    console.log('\n  ℹ️  Dry-run : rien n\'a été écrit. Relancer avec --apply pour exécuter.');
  }

  if (stats.failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('❌ Échec fatal :', e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await db.destroy(); } catch { /* ignore */ }
  });
