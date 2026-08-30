import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';

// Table des utilisateurs
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password').notNull(),
  role: text('role').default('RESEARCHER'),
  isVerified: integer('is_verified', { mode: 'boolean' }).default(false),
  verificationToken: text('verification_token'),
  resetToken: text('reset_token'),
  resetTokenExpiry: integer('reset_token_expiry', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
});

// Table des projets
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').default('ACTIVE'),
  visibility: text('visibility').default('PRIVATE'),
  userId: text('user_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
});

// Table des transcriptions
export const transcriptions = sqliteTable('transcriptions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  status: text('status').default('PENDING'),
  audioUrl: text('audio_url'),
  transcriptText: text('transcript_text'),
  projectId: text('project_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).defaultNow(),
});
