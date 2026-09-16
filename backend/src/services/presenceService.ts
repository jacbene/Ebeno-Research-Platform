// backend/src/services/presenceService.ts
import { logger } from '../utils/logger';

interface UserInfo {
  userId: string;
  userName: string;
  userEmail?: string;
  color: string;
  joinedAt: Date;
  lastSeen: Date;
}

// ✅ TTL : un user sans ping depuis 2 min = fantôme
const USER_TTL_MS = 2 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

const presenceMap = new Map<string, Map<string, UserInfo>>();

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2',
  '#E76F51', '#F4A261', '#2A9D8F', '#9B5DE5', '#F15BB5',
  '#0077B6', '#D62828', '#F77F00', '#06A77D', '#8338EC',
];

let colorIndex = 0;
const getNextColor = (): string => {
  const color = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  return color;
};

export const addUser = (
  projectId: string,
  socketId: string,
  user: Omit<UserInfo, 'color' | 'joinedAt' | 'lastSeen'>
): UserInfo => {
  if (!presenceMap.has(projectId)) {
    presenceMap.set(projectId, new Map());
  }
  const room = presenceMap.get(projectId)!;

  // Réutiliser la couleur si l'user est déjà présent via un autre socket
  let color: string | null = null;
  for (const [, info] of room) {
    if (info.userId === user.userId) {
      color = info.color;
      break;
    }
  }

  const userInfo: UserInfo = {
    ...user,
    color: color || getNextColor(),
    joinedAt: new Date(),
    lastSeen: new Date(),
  };

  room.set(socketId, userInfo);

  logger.info(`👤 [presence] ${user.userName} a rejoint ${projectId}`, {
    socketId,
    projectId,
    totalUsers: room.size,
  });

  return userInfo;
};

export const removeUser = (projectId: string, socketId: string): void => {
  const room = presenceMap.get(projectId);
  if (!room) return;

  const user = room.get(socketId);
  room.delete(socketId);

  if (user) {
    logger.info(`👋 [presence] ${user.userName} a quitté ${projectId}`, {
      socketId,
      projectId,
      remainingUsers: room.size,
    });
  }

  if (room.size === 0) {
    presenceMap.delete(projectId);
  }
};

export const updatePresence = (projectId: string, socketId: string): void => {
  const room = presenceMap.get(projectId);
  if (!room) return;
  const user = room.get(socketId);
  if (user) user.lastSeen = new Date();
};

export const getProjectUsers = (projectId: string): UserInfo[] => {
  const room = presenceMap.get(projectId);
  if (!room) return [];
  return Array.from(room.values());
};

export const getUniqueProjectUsers = (projectId: string): UserInfo[] => {
  const users = getProjectUsers(projectId);
  const seen = new Set<string>();
  return users.filter((u) => {
    if (seen.has(u.userId)) return false;
    seen.add(u.userId);
    return true;
  });
};

export const getAllRooms = (): string[] => {
  return Array.from(presenceMap.keys());
};

// ============================================================
// ✅ TTL & CLEANUP AUTOMATIQUE
// ============================================================

/**
 * Supprime tous les users inactifs depuis plus de USER_TTL_MS.
 * Retourne la liste des projectIds impactés (pour rebroadcast la présence).
 */
export const cleanupStaleUsers = (): string[] => {
  const now = Date.now();
  const affectedProjects: string[] = [];

  for (const [projectId, room] of presenceMap.entries()) {
    let hasChanges = false;

    for (const [socketId, user] of room.entries()) {
      if (now - user.lastSeen.getTime() > USER_TTL_MS) {
        logger.warn(
          `🧹 [presence] User expiré (${Math.round(
            (now - user.lastSeen.getTime()) / 1000
          )}s sans ping) : ${user.userName}`
        );
        room.delete(socketId);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      affectedProjects.push(projectId);
      if (room.size === 0) {
        presenceMap.delete(projectId);
      }
    }
  }

  return affectedProjects;
};

let cleanupInterval: NodeJS.Timeout | null = null;

/**
 * Démarre le cleanup périodique.
 * @param onCleanup callback appelé pour chaque projectId affecté (pour rebroadcast)
 */
export const startPresenceCleanup = (
  onCleanup?: (projectId: string) => void
): void => {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const affected = cleanupStaleUsers();
    if (affected.length > 0 && onCleanup) {
      affected.forEach((projectId) => onCleanup(projectId));
    }
  }, CLEANUP_INTERVAL_MS);

  // ✅ Empêche Jest de rester bloqué
  if (typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
  }

  logger.info(
    `✅ [presence] Cleanup activé (TTL=${USER_TTL_MS / 1000}s, intervalle=${
      CLEANUP_INTERVAL_MS / 1000
    }s)`
  );
};

export const stopPresenceCleanup = (): void => {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('🛑 [presence] Cleanup arrêté');
  }
};

/**
 * Pour les tests uniquement : reset complet.
 */
export const __resetForTests = (): void => {
  presenceMap.clear();
  colorIndex = 0;
  stopPresenceCleanup();
};
