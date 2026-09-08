export async function up(knex: any): Promise<void> {
  // Vérifier si la colonne existe déjà
  const hasColumn = await knex.schema.hasColumn('project_files', 'fileHash');
  if (!hasColumn) {
    await knex.schema.table('project_files', (table: any) => {
      table.string('fileHash');
      table.index('fileHash');
    });
    console.log('✅ Colonne fileHash ajoutée à project_files');
  } else {
    console.log('ℹ️ Colonne fileHash existe déjà');
  }
}

export async function down(knex: any): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('project_files', 'fileHash');
  if (hasColumn) {
    await knex.schema.table('project_files', (table: any) => {
      table.dropIndex('fileHash');
      table.dropColumn('fileHash');
    });
    console.log('✅ Colonne fileHash supprimée');
  }
}
