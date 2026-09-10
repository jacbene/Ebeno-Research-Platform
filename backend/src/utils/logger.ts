// backend/src/utils/logger.ts
import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Créer le dossier logs s'il n'existe pas
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Format console (lisible)
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length > 1 ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${metaStr}`;
});

// Format fichier (JSON structuré)
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }),
  json()
);

// Créer le logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  defaultMeta: {
    service: 'ebeno-backend',
    env: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console
    new winston.transports.Console({
      format: combine(
        timestamp({ format: 'HH:mm:ss' }),
        colorize({ all: true }),
        errors({ stack: true }),
        consoleFormat
      ),
    }),

    // Fichier : toutes les erreurs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5 MB
      maxFiles: 5,
    }),

    // Fichier : tous les logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ],
});

// Helper pour les logs HTTP
export const logHttp = (method: string, url: string, status: number, durationMs: number, userId?: string) => {
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
  logger.log(level, `HTTP ${method} ${url}`, {
    method,
    url,
    status,
    durationMs,
    userId: userId || 'anonymous',
  });
};

// Helper pour les événements métier
export const logEvent = (event: string, data: any = {}) => {
  logger.info(`📌 ${event}`, { event, ...data });
};

// Helper pour les erreurs
export const logError = (message: string, error: any, context: any = {}) => {
  logger.error(message, {
    error: error?.message || error,
    stack: error?.stack,
    ...context,
  });
};
