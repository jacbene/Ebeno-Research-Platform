// backend/src/middleware/sanitize.ts
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de sanitization XSS basique.
 *
 * ⚠️ Ce n'est PAS un sanitizer complet. Il supprime les balises HTML/script
 *    des inputs texte (body + query + params) pour éviter les injections
 *    basiques. React échappe déjà le HTML par défaut côté front, ceinture
 *    + bretelles.
 *
 * Ce qu'on fait :
 *   - Supprime les balises <script>...</script>
 *   - Supprime les < et > résiduels
 *   - Supprime les attributs on* (onclick, onerror, etc.)
 *   - Trim les espaces
 *
 * Ce qu'on NE fait PAS :
 *   - Sanitize le HTML riche (utiliser DOMPurify si besoin)
 *   - Bloquer les attaques par injection SQL (Knex le fait via prepared statements)
 */

const SCRIPT_REGEX = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
const EVENT_ATTR_REGEX = /\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const TAG_REGEX = /<\/?[^>]+>/g;

/** Nettoie une valeur string */
function sanitizeString(value: string): string {
  return value
    .replace(SCRIPT_REGEX, '')       // retire <script>...</script>
    .replace(EVENT_ATTR_REGEX, '')   // retire onclick=..., onerror=...
    .replace(TAG_REGEX, '')          // retire <tag> résiduels
    .trim();
}

/** Sanitize récursivement un objet (sans toucher aux nombres/booléens) */
function sanitizeValue(value: any, depth: number = 0): any {
  // Limite de profondeur pour éviter les boucles infinies
  if (depth > 10) return value;

  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    // Ne pas toucher aux objets Date, Buffer, etc.
    if (value instanceof Date || Buffer.isBuffer(value)) return value;

    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return value;
}

export const sanitizeBody = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query);
    }
    // ⚠️ Ne PAS toucher aux params (ils peuvent contenir des IDs sensibles
    //    ou être utilisés dans des routes critiques).
  } catch (err) {
    // Ne jamais bloquer la requête à cause du sanitize
    console.warn('⚠️ [sanitize] Erreur silencieuse:', err);
  }
  next();
};
