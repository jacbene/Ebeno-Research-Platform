// backend/tests/unit/presenceService.test.ts
import {
  addUser,
  removeUser,
  getProjectUsers,
  getUniqueProjectUsers,
  updatePresence,
  getAllRooms,
  cleanupStaleUsers,
  startPresenceCleanup,
  stopPresenceCleanup,
  __resetForTests,
} from '../../src/services/presenceService';

describe('PresenceService', () => {
  const projectId = 'test-project-presence';

  // ✅ Reset complet entre chaque test → isolation garantie
  beforeEach(() => {
    __resetForTests();
  });

  afterAll(() => {
    __resetForTests();
  });

  // ============================================================
  // addUser
  // ============================================================

  test('Ajoute un utilisateur à un projet', () => {
    const user = addUser(projectId, 'socket-1', {
      userId: 'user-1',
      userName: 'Alice',
      userEmail: 'alice@test.com',
    });

    expect(user.userId).toBe('user-1');
    expect(user.userName).toBe('Alice');
    expect(user.color).toBeDefined();
    expect(user.color).toMatch(/^#/);
    expect(user.joinedAt).toBeInstanceOf(Date);
    expect(user.lastSeen).toBeInstanceOf(Date);
  });

  test('Deux utilisateurs ont des couleurs différentes', () => {
    const user1 = addUser(projectId, 'socket-a', {
      userId: 'user-a',
      userName: 'A',
    });
    const user2 = addUser(projectId, 'socket-b', {
      userId: 'user-b',
      userName: 'B',
    });

    expect(user1.color).not.toBe(user2.color);
  });

  test('Le même utilisateur garde sa couleur sur plusieurs sockets', () => {
    const user1 = addUser(projectId, 'socket-x1', {
      userId: 'user-x',
      userName: 'X',
    });
    const user2 = addUser(projectId, 'socket-x2', {
      userId: 'user-x',
      userName: 'X',
    });

    expect(user1.color).toBe(user2.color);
  });

  // ============================================================
  // getProjectUsers / getUniqueProjectUsers
  // ============================================================

  test('getProjectUsers retourne tous les utilisateurs connectés', () => {
    addUser(projectId, 'socket-1', { userId: 'u1', userName: 'Alice' });
    addUser(projectId, 'socket-2', { userId: 'u2', userName: 'Bob' });

    const users = getProjectUsers(projectId);
    expect(users).toHaveLength(2);
  });

  test('getUniqueProjectUsers déduplique par userId', () => {
    addUser(projectId, 'socket-dup1', { userId: 'user-dup', userName: 'Dup' });
    addUser(projectId, 'socket-dup2', { userId: 'user-dup', userName: 'Dup' });

    const uniqueUsers = getUniqueProjectUsers(projectId);
    const dupCount = uniqueUsers.filter((u) => u.userId === 'user-dup').length;
    expect(dupCount).toBe(1);
    expect(uniqueUsers).toHaveLength(1);
  });

  // ============================================================
  // removeUser
  // ============================================================

  test('Retirer un utilisateur', () => {
    addUser(projectId, 'socket-remove', {
      userId: 'user-remove',
      userName: 'ToRemove',
    });

    expect(getUniqueProjectUsers(projectId)).toHaveLength(1);

    removeUser(projectId, 'socket-remove');

    expect(getUniqueProjectUsers(projectId)).toHaveLength(0);
  });

  test('Retirer un utilisateur qui n\'existe pas ne plante pas', () => {
    expect(() => removeUser(projectId, 'socket-inexistant')).not.toThrow();
    expect(() => removeUser('projet-inexistant', 'socket-x')).not.toThrow();
  });

  // ============================================================
  // updatePresence
  // ============================================================

  test('updatePresence met à jour la date lastSeen', (done) => {
    const user = addUser(projectId, 'socket-update', {
      userId: 'user-update',
      userName: 'Update',
    });
    const initialLastSeen = user.lastSeen.getTime();

    setTimeout(() => {
      updatePresence(projectId, 'socket-update');
      const users = getProjectUsers(projectId);
      const updated = users.find((u) => u.userId === 'user-update');
      expect(updated!.lastSeen.getTime()).toBeGreaterThanOrEqual(initialLastSeen);
      done();
    }, 10);
  });

  // ============================================================
  // Cas limites
  // ============================================================

  test('Retourne [] pour un projet sans utilisateurs', () => {
    expect(getProjectUsers('projet-fantome')).toEqual([]);
    expect(getUniqueProjectUsers('projet-fantome')).toEqual([]);
  });

  test('getAllRooms retourne un tableau', () => {
    const rooms = getAllRooms();
    expect(Array.isArray(rooms)).toBe(true);
  });

  test('getAllRooms retourne les projets actifs', () => {
    addUser('proj-1', 'socket-1', { userId: 'u1', userName: 'A' });
    addUser('proj-2', 'socket-2', { userId: 'u2', userName: 'B' });

    const rooms = getAllRooms();
    expect(rooms).toContain('proj-1');
    expect(rooms).toContain('proj-2');
  });

  // ============================================================
  // ✅ NOUVEAU : cleanupStaleUsers
  // ============================================================

  test('cleanupStaleUsers supprime les users trop vieux', () => {
    const user = addUser(projectId, 'socket-1', {
      userId: 'u1',
      userName: 'Alice',
    });

    // Simule un user stale (> 2 min sans ping)
    user.lastSeen = new Date(Date.now() - 3 * 60 * 1000);

    const affected = cleanupStaleUsers();

    expect(affected).toContain(projectId);
    expect(getProjectUsers(projectId)).toHaveLength(0);
  });

  test('cleanupStaleUsers ne touche pas les users actifs', () => {
    addUser(projectId, 'socket-1', { userId: 'u1', userName: 'Alice' });
    addUser('proj-2', 'socket-2', { userId: 'u2', userName: 'Bob' });

    const affected = cleanupStaleUsers();

    expect(affected).toHaveLength(0);
    expect(getProjectUsers(projectId)).toHaveLength(1);
    expect(getProjectUsers('proj-2')).toHaveLength(1);
  });

  test('cleanupStaleUsers garde les users actifs quand certains expirent', () => {
    addUser(projectId, 'socket-alive', { userId: 'alive', userName: 'Alice' });
    const stale = addUser(projectId, 'socket-stale', {
      userId: 'stale',
      userName: 'Bob',
    });

    // Bob est stale, Alice est active
    stale.lastSeen = new Date(Date.now() - 3 * 60 * 1000);

    const affected = cleanupStaleUsers();

    expect(affected).toContain(projectId);
    const remaining = getProjectUsers(projectId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].userId).toBe('alive');
  });

  // ============================================================
  // ✅ NOUVEAU : startPresenceCleanup / stopPresenceCleanup
  // ============================================================

  test('startPresenceCleanup démarre sans planter', () => {
    expect(() => startPresenceCleanup()).not.toThrow();
    stopPresenceCleanup();
  });

  test('startPresenceCleanup est idempotent (2 appels = 1 interval)', () => {
    startPresenceCleanup();
    expect(() => startPresenceCleanup()).not.toThrow();
    stopPresenceCleanup();
  });

  test('stopPresenceCleanup ne plante pas s\'il n\'y a rien à arrêter', () => {
    expect(() => stopPresenceCleanup()).not.toThrow();
  });
});
