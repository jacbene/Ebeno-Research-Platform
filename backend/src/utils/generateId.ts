// backend/src/utils/generateId.ts

/**
 * Génère un ID unique et lisible.
 * Format : `{prefix}-{timestamp}-{random}`
 * Exemple : `project-1789601439054-hgs04o`
 */
export const generateId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Détecte si un ID est au format ISO timestamp (ancien format bogué)
 * Exemple : `2026-09-14T13:04:22.271Z`
 */
export const isLegacyIsoId = (id: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(id);
};
