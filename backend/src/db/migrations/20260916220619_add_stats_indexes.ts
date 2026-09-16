import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ---------- project_files ----------
  await knex.schema.alterTable('project_files', (t) => {
    t.index(['projectId', 'deletedAt'], 'idx_project_files_project_deleted');
    t.index(['userId', 'deletedAt'], 'idx_project_files_user_deleted');
    t.index(['uploadedAt'], 'idx_project_files_uploaded');
  });

  // ---------- transcriptions ----------
  await knex.schema.alterTable('transcriptions', (t) => {
    t.index(['projectId', 'deletedAt', 'type'], 'idx_transcriptions_project_type');
    t.index(['userId', 'deletedAt', 'type'], 'idx_transcriptions_user_type');
    t.index(['status'], 'idx_transcriptions_status');
  });

  // ---------- memos ----------
  await knex.schema.alterTable('memos', (t) => {
    t.index(['projectId', 'deletedAt'], 'idx_memos_project_deleted');
    t.index(['userId', 'deletedAt'], 'idx_memos_user_deleted');
  });

  // ---------- document_entities ----------
  await knex.schema.alterTable('document_entities', (t) => {
    t.index(['entityType', 'entityValue'], 'idx_entities_type_value');
  });

  // ---------- project_activity ----------
  await knex.schema.alterTable('project_activity', (t) => {
    t.index(['userId', 'createdAt'], 'idx_activity_user_date');
  });

  console.log('✅ Index de performance ajoutés pour le dashboard stats');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('project_files', (t) => {
    t.dropIndex(['projectId', 'deletedAt'], 'idx_project_files_project_deleted');
    t.dropIndex(['userId', 'deletedAt'], 'idx_project_files_user_deleted');
    t.dropIndex(['uploadedAt'], 'idx_project_files_uploaded');
  });

  await knex.schema.alterTable('transcriptions', (t) => {
    t.dropIndex(['projectId', 'deletedAt', 'type'], 'idx_transcriptions_project_type');
    t.dropIndex(['userId', 'deletedAt', 'type'], 'idx_transcriptions_user_type');
    t.dropIndex(['status'], 'idx_transcriptions_status');
  });

  await knex.schema.alterTable('memos', (t) => {
    t.dropIndex(['projectId', 'deletedAt'], 'idx_memos_project_deleted');
    t.dropIndex(['userId', 'deletedAt'], 'idx_memos_user_deleted');
  });

  await knex.schema.alterTable('document_entities', (t) => {
    t.dropIndex(['entityType', 'entityValue'], 'idx_entities_type_value');
  });

  await knex.schema.alterTable('project_activity', (t) => {
    t.dropIndex(['userId', 'createdAt'], 'idx_activity_user_date');
  });
}
