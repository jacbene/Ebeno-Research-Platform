// backend/src/services/statsCache.ts
/**
 * Cache mémoire très simple pour les stats du dashboard.
 * - TTL configurable (défaut : 30s)
 * - Clé = `${userId}:${projectId || 'all'}`
 * - Invalidation manuelle possible (ex: après upload, création projet, etc.)
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const DEFAULT_TTL = 30_000; // 30 secondes
const cache = new Map<string, CacheEntry<any>>();

export const buildStatsKey = (userId: string, projectId?: string | null): string =>
  `${userId}:${projectId || 'all'}`;

export const getCachedStats = <T>(key: string): T | null => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
};

export const setCachedStats = <T>(key: string, data: T, ttl = DEFAULT_TTL): void => {
  cache.set(key, { data, expires: Date.now() + ttl });
};

/**
 * Invalide toutes les entrées d'un utilisateur (tous projets confondus).
 * À appeler après un upload, une suppression, une création de projet, etc.
 */
export const invalidateUserStats = (userId: string): void => {
  const prefix = `${userId}:`;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
};

/**
 * Invalide uniquement une clé (user + projet spécifique).
 */
export const invalidateStatsKey = (userId: string, projectId?: string | null): void => {
  cache.delete(buildStatsKey(userId, projectId));
};

/**
 * (Optionnel) Stats internes pour debug/monitoring.
 */
export const getCacheStats = () => ({
  size: cache.size,
  keys: Array.from(cache.keys()),
});
