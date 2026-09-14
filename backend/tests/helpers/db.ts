// backend/tests/helpers/db.ts
import knex, { Knex } from 'knex';
import { newDb } from 'pg-mem';

let testDb: Knex | null = null;

/**
 * Crée une base PostgreSQL en mémoire (pg-mem) pour les tests
 */
export const getTestDb = (): Knex => {
  if (!testDb) {
    const mem = newDb();
    const pgAdapter = mem.adapters.createKnex();
    testDb = pgAdapter as any;
  }
  return testDb;
};

/**
 * Initialise les tables nécessaires pour les tests
 */
export const setupTestDatabase = async (): Promise<Knex> => {
  const db = getTestDb();
  await createTables(db);
  return db;
};

export const teardownTestDatabase = async (): Promise<void> => {
  if (testDb) {
    await testDb.destroy();
    testDb = null;
  }
};

export const clearTestDatabase = async (): Promise<void> => {
  if (!testDb) return;

  const tables = [
    'project_activity',
    'document_summaries',
    'document_entities',
    'project_files',
    'transcriptions',
    'memos',
    'project_members',
    'collaboration_documents',
    'projects',
    'users',
  ];

  for (const table of tables) {
    try {
      await testDb(table).delete();
    } catch (e) {
      // Table n'existe pas, ignorer
    }
  }
};

async function createTables(db: Knex): Promise<void> {
  // users
  if (!(await db.schema.hasTable('users'))) {
    await db.schema.createTable('users', (table) => {
      table.string('id').primary();
      table.string('email').unique().notNullable();
      table.string('name');
      table.string('password').notNullable();
      table.string('role').defaultTo('RESEARCHER');
      table.boolean('isVerified').defaultTo(false);
      table.string('verificationToken');
      table.string('resetToken');
      table.timestamp('resetTokenExpiry');
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // projects
  if (!(await db.schema.hasTable('projects'))) {
    await db.schema.createTable('projects', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.string('description');
      table.string('status').defaultTo('ACTIVE');
      table.string('visibility').defaultTo('PRIVATE');
      table.string('userId').notNullable();
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // project_members
  if (!(await db.schema.hasTable('project_members'))) {
    await db.schema.createTable('project_members', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('userId').notNullable();
      table.string('role').defaultTo('MEMBER');
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // memos
  if (!(await db.schema.hasTable('memos'))) {
    await db.schema.createTable('memos', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.string('userId').notNullable();
      table.string('projectId');
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
      table.timestamp('deletedAt').nullable();
    });
  }

  // project_files
  if (!(await db.schema.hasTable('project_files'))) {
    await db.schema.createTable('project_files', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('userId').notNullable();
      table.string('fileName').notNullable();
      table.integer('fileSize');
      table.string('mimeType');
      table.string('filePath');
      table.string('fileHash');
      table.string('cloudinaryPublicId');
      table.bigint('uploadedAt');
      table.bigint('deletedAt').nullable();
    });
  }

  // transcriptions
  if (!(await db.schema.hasTable('transcriptions'))) {
    await db.schema.createTable('transcriptions', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.string('status').defaultTo('PENDING');
      table.string('audioUrl');
      table.text('transcriptText');
      table.string('projectId');
      table.string('userId');
      table.text('errorMessage');
      table.string('type').defaultTo('audio');
      table.string('fileName');
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
      table.timestamp('deletedAt').nullable();
    });
  }

  // document_summaries
  if (!(await db.schema.hasTable('document_summaries'))) {
    await db.schema.createTable('document_summaries', (table) => {
      table.string('id').primary();
      table.string('documentId').notNullable();
      table.string('type').notNullable();
      table.text('summary');
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // document_entities
  if (!(await db.schema.hasTable('document_entities'))) {
    await db.schema.createTable('document_entities', (table) => {
      table.string('id').primary();
      table.string('documentId').notNullable();
      table.string('documentType').notNullable();
      table.string('entityValue').notNullable();
      table.string('entityType').notNullable();
      table.integer('occurrenceCount').defaultTo(1);
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // project_activity
  if (!(await db.schema.hasTable('project_activity'))) {
    await db.schema.createTable('project_activity', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('userId').notNullable();
      table.string('userName');
      table.string('action').notNullable();
      table.string('targetType');
      table.string('targetId');
      table.string('targetName');
      table.text('metadata');
      table.timestamp('createdAt').defaultTo(db.fn.now());
    });
  }

  // collaboration_documents
  if (!(await db.schema.hasTable('collaboration_documents'))) {
    await db.schema.createTable('collaboration_documents', (table) => {
      table.string('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.string('projectId').notNullable();
      table.string('createdBy').notNullable();
      table.integer('version').defaultTo(1);
      table.timestamp('createdAt').defaultTo(db.fn.now());
      table.timestamp('updatedAt').defaultTo(db.fn.now());
    });
  }

  // suggested_codes
  if (!(await db.schema.hasTable('suggested_codes'))) {
    await db.schema.createTable('suggested_codes', (table) => {
      table.string('id').primary();
      table.string('projectId').notNullable();
      table.string('code').notNullable();
      table.integer('frequency').defaultTo(1);
      table.string('status').defaultTo('pending');
      table.bigint('createdAt');
      table.bigint('updatedAt');
    });
  }
}
