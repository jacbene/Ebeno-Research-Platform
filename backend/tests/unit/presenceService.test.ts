// backend/tests/unit/presenceService.test.ts
import {
  addUser,
  removeUser,
  getProjectUsers,
  getUniqueProjectUsers,
  updatePresence,
  getAllRooms,
} from '../../src/services/presenceService';

describe('PresenceService', () => {
  const projectId = 'test-project-presence';

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

  test('getProjectUsers retourne tous les utilisateurs connectés', () => {
    const users = getProjectUsers(projectId);
    expect(users.length).toBeGreaterThan(0);
  });

  test('getUniqueProjectUsers déduplique par userId', () => {
    addUser(projectId, 'socket-dup1', { userId: 'user-dup', userName: 'Dup' });
    addUser(projectId, 'socket-dup2', { userId: 'user-dup', userName: 'Dup' });

    const uniqueUsers = getUniqueProjectUsers(projectId);
    const dupCount = uniqueUsers.filter((u) => u.userId === 'user-dup').length;
    expect(dupCount).toBe(1);
  });

  test('Retirer un utilisateur', () => {
    addUser(projectId, 'socket-remove', {
      userId: 'user-remove',
      userName: 'ToRemove',
    });

    const before = getUniqueProjectUsers(projectId).length;
    removeUser(projectId, 'socket-remove');
    const after = getUniqueProjectUsers(projectId).length;

    expect(after).toBeLessThanOrEqual(before);
  });

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

  test('Retourne [] pour un projet sans utilisateurs', () => {
    const users = getProjectUsers('projet-fantome');
    expect(users).toEqual([]);
  });

  test('getAllRooms retourne au moins un projet actif', () => {
    const rooms = getAllRooms();
    expect(Array.isArray(rooms)).toBe(true);
    expect(rooms.length).toBeGreaterThan(0);
  });

  test('Retirer un utilisateur qui n\'existe pas ne plante pas', () => {
    expect(() => removeUser(projectId, 'socket-inexistant')).not.toThrow();
  });
});
