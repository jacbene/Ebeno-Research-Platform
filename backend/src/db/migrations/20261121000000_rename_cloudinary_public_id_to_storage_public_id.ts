import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ─── project_files ───
  if (await knex.schema.hasTable('project_files')) {
    const hasOld = await knex.schema.hasColumn('project_files', 'cloudinaryPublicId');
    const hasNew = await knex.schema.hasColumn('project_files', 'storagePublicId');
    if (hasOld && !hasNew) {
      await knex.schema.alterTable('project_files', (table) => {
        table.renameColumn('cloudinaryPublicId', 'storagePublicId');
      });
      console.log('✅ project_files.cloudinaryPublicId → storagePublicId');
    } else if (hasNew && !hasOld) {
      console.log('ℹ️ project_files.storagePublicId déjà présent — skip');
    } else {
      console.log('⚠️ project_files: situation ambiguë (les 2 ou aucune colonne) — skip');
    }
  }

  // ─── file_versions ───
  if (await knex.schema.hasTable('file_versions')) {
    const hasOld = await knex.schema.hasColumn('file_versions', 'cloudinaryPublicId');
    const hasNew = await knex.schema.hasColumn('file_versions', 'storagePublicId');
    if (hasOld && !hasNew) {
      await knex.schema.alterTable('file_versions', (table) => {
        table.renameColumn('cloudinaryPublicId', 'storagePublicId');
      });
      console.log('✅ file_versions.cloudinaryPublicId → storagePublicId');
    } else if (hasNew && !hasOld) {
      console.log('ℹ️ file_versions.storagePublicId déjà présent — skip');
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  if (await knex.schema.hasTable('project_files')) {
    const hasNew = await knex.schema.hasColumn('project_files', 'storagePublicId');
    if (hasNew) {
      await knex.schema.alterTable('project_files', (table) => {
        table.renameColumn('storagePublicId', 'cloudinaryPublicId');
      });
      console.log('✅ project_files.storagePublicId → cloudinaryPublicId (rollback)');
    }
  }

  if (await knex.schema.hasTable('file_versions')) {
    const hasNew = await knex.schema.hasColumn('file_versions', 'storagePublicId');
    if (hasNew) {
      await knex.schema.alterTable('file_versions', (table) => {
        table.renameColumn('storagePublicId', 'cloudinaryPublicId');
      });
      console.log('✅ file_versions.storagePublicId → cloudinaryPublicId (rollback)');
    }
  }
}
