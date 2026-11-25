import { Server as SocketIOServer } from 'socket.io';
import { CollaborationSocketHandler } from '../../src/sockets/collaborationSocket';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  getTestDb,
} from '../helpers/db';
import { createTestUser, createTestProject } from '../helpers/auth';

describe('Collaboration socket authorization', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  test('refuses document edits by a user outside the document project', async () => {
    const attacker = await createTestUser();
    const attackerProject = await createTestProject(attacker.user.id);
    const owner = await createTestUser();
    const ownerProject = await createTestProject(owner.user.id);
    const db = getTestDb();
    await db('collaboration_documents').insert({
      id: 'private-document',
      title: 'Private document',
      content: 'original',
      projectId: ownerProject.id,
      createdBy: owner.user.id,
    });

    const handlers: Record<string, (payload?: any) => Promise<void> | void> = {};
    let onConnection: ((socket: any) => void) | undefined;
    const io = {
      on: jest.fn((event: string, callback: (socket: any) => void) => {
        if (event === 'connection') onConnection = callback;
      }),
      emit: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    } as unknown as SocketIOServer;
    const rooms = new Set<string>(['attacker-socket']);
    const socket = {
      id: 'attacker-socket',
      handshake: { auth: { token: attacker.token } },
      rooms,
      on: jest.fn((event: string, callback: (payload?: any) => Promise<void> | void) => {
        handlers[event] = callback;
      }),
      join: jest.fn((room: string) => rooms.add(room)),
      leave: jest.fn((room: string) => rooms.delete(room)),
      emit: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
    };

    new CollaborationSocketHandler(io);
    onConnection?.(socket);
    await handlers['join-project']({ projectId: attackerProject.id, userName: 'Attacker' });
    await handlers['edit-document']({
      documentId: 'private-document',
      content: 'overwritten',
    });

    expect(socket.emit).toHaveBeenCalledWith('error', 'Accès non autorisé à ce document');
    expect(socket.to).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 550));
    const document = await db('collaboration_documents')
      .where({ id: 'private-document' })
      .first();
    expect(document.content).toBe('original');
  });
});
