import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('coded_segments');
  if (!hasTable) {
    await knex.schema.createTable('coded_segments', (table) => {
      table.string('id').primary();
      table.string('document_id').notNullable();
      table.string('document_type').notNullable(); // 'transcription', 'memo', 'file'
      table.string('user_id').notNullable();
      table.string('code_name').notNullable(); // ex: "Motivation", "Frustration"
      table.string('color').notNullable().defaultTo('#4A6CF7');
      table.integer('start_offset').notNullable();
      table.integer('end_offset').notNullable();
      table.text('selected_text').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('coded_segments');
}
