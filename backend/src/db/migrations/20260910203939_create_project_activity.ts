// backend/src/db/migrations/YYYYMMDDHHMMSS_create_project_activity.ts
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('project_activity');
  if (!exists) {
    await knex.schema.createTable('project_activity', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('userId').notNullable();
      table.string('userName');
      table.string('action').notNullable(); // 'file-uploaded', 'file-trashed', etc.
      table.string('targetType'); // 'file', 'transcription', 'memo'
      table.string('targetId');
      table.string('targetName');
      table.text('metadata'); // JSON stringifié
      table.timestamp('createdAt').defaultTo(knex.fn.now());
      table.index(['projectId', 'createdAt']);
      table.foreign('projectId').references('projects.id').onDelete('CASCADE');
      table.foreign('userId').references('users.id').onDelete('CASCADE');
    });
    console.log('✅ Table project_activity créée');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_activity');
}
