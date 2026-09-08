// backend/src/db/migrations/YYYYMMDDHHMMSS_add_cloudinary_public_id_to_project_files.ts
export async function up(knex: any): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('project_files', 'cloudinaryPublicId');
  if (!hasColumn) {
    await knex.schema.table('project_files', (table: any) => {
      table.string('cloudinaryPublicId');
    });
    console.log('✅ Colonne cloudinaryPublicId ajoutée à project_files');
  }
}

export async function down(knex: any): Promise<void> {
  await knex.schema.table('project_files', (table: any) => {
    table.dropColumn('cloudinaryPublicId');
  });
}
