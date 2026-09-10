// backend/src/services/presenceService.ts
import { logger } from '../utils/logger';

/**
 * Gestion en mémoire des utilisateurs connectés par projet
 * Structure : { [projectId]: Map<socketId, UserInfo> }
 */
interface UserInfo {
  userId: string;
  userName: string;
  userEmail?: string;
  color: string;         // Couleur unique pour le curseur/avatar
  joinedAt: Date;
  lastSeen: Date;
}

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

  // Si l'utilisateur est déjà présent avec un autre socket, réutiliser sa couleur
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

/**
 * Récupère les utilisateurs uniques (par userId)
 */
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
