// backend/tests/helpers/auth.ts
import jwt from 'jsonwebtoken';
import { getTestDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest-only';

/**
 * Crée un utilisateur en base et retourne son token JWT
 */
export const createTestUser = async (overrides: any = {}) => {
  const db = getTestDb();
  const id = overrides.id || `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const email = overrides.email || `test-${Date.now()}@test.com`;

  const user = {
    id,
    email,
    name: overrides.name || 'Test User',
    password: overrides.password || '$2a$10$hashedpassword',
    role: overrides.role || 'RESEARCHER',
    isVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db('users').insert(user);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return { user, token };
};

/**
 * Crée un projet de test
 */
export const createTestProject = async (userId: string, overrides: any = {}) => {
  const db = getTestDb();
  const id = overrides.id || `project-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const project = {
    id,
    title: overrides.title || 'Test Project',
    description: overrides.description || 'Description de test',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db('projects').insert(project);

  // Ajouter comme membre OWNER
  await db('project_members').insert({
    id: `pm-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    projectId: id,
    userId,
    role: 'OWNER',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return project;
};

/**
 * Crée un fichier de test
 */
export const createTestFile = async (
  projectId: string,
  userId: string,
  overrides: any = {}
) => {
  const db = getTestDb();
  const id = overrides.id || `file-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const file = {
    id,
    projectId,
    userId,
    fileName: overrides.fileName || 'test.txt',
    fileSize: overrides.fileSize || 1024,
    mimeType: overrides.mimeType || 'text/plain',
    filePath: overrides.filePath || 'https://res.cloudinary.com/test/file.txt',
    fileHash: overrides.fileHash || `hash-${Date.now()}`,
    cloudinaryPublicId: overrides.cloudinaryPublicId || 'test-public-id',
    uploadedAt: Date.now(),
    deletedAt: null,
  };

  await db('project_files').insert(file);
  return file;
};
