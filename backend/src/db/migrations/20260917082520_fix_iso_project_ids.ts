// backend/src/db/migrations/XXXXXXXXXXXXXX_fix_iso_project_ids.ts
import type { Knex } from 'knex';

/**
 * Migration : corrige les IDs de projet au format ISO (legacy bug)
 *
 * AVANT : id = "2026-09-14T13:04:22.271Z"
 * APRÈS : id = "project-1789601439054-hgs04o"
 *
 * ⚠️ Toutes les FK sont mises à jour manuellement car aucune n'a
 *    ON UPDATE CASCADE. On utilise la stratégie "insert-new / update-children / delete-old".
 */

const FK_TABLES = [
  'project_members',
  'project_tags',
  'memos',
  'project_files',
  'codes',
  'collaboration_documents',
  'suggested_codes',
  'project_activity',
  'transcriptions', // pas de FK, mais a un projectId
];

export async function up(knex: Knex): Promise<void> {
  // 1. Trouve tous les projets avec un ID legacy (format ISO)
  const legacyProjects = await knex('projects')
    .whereRaw("id ~ '^\\d{4}-\\d{2}-\\d{2}T'")
    .select('id', 'title');

  if (legacyProjects.length === 0) {
    console.log('ℹ️  Aucun projet avec ID ISO à corriger');
    return;
  }

  console.log(`🔧 ${legacyProjects.length} projet(s) à corriger`);

  for (const project of legacyProjects) {
    const oldId = project.id;
    const newId = `project-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    console.log(`  → "${project.title}" : ${oldId} → ${newId}`);

    // 2. Copie la ligne projet avec le nouvel ID
    const fullProject = await knex('projects').where({ id: oldId }).first();
    if (!fullProject) continue;

    await knex('projects').insert({ ...fullProject, id: newId });

    // 3. Met à jour toutes les FK
    for (const table of FK_TABLES) {
      const hasTable = await knex.schema.hasTable(table);
      if (!hasTable) continue;
      const hasColumn = await knex.schema.hasColumn(table, 'projectId');
      if (!hasColumn) continue;

      const affected = await knex(table).where({ projectId: oldId }).update({ projectId: newId });
      if (affected > 0) {
        console.log(`     ↳ ${table}: ${affected} ligne(s)`);
      }
    }

    // 4. Supprime l'ancien projet (plus aucun enfant)
    await knex('projects').where({ id: oldId }).delete();
  }

  console.log(`✅ ${legacyProjects.length} projet(s) migré(s) vers le format propre`);
}

export async function down(knex: Knex): Promise<void> {
  // ⚠️ Down impossible à déterminer (les anciens IDs ISO sont perdus).
  // En cas de rollback urgent, restaurer depuis un backup DB.
  console.log('⚠️  Rollback non supporté — restaurer depuis backup si nécessaire');
}
