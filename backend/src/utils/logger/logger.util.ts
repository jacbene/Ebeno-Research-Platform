import Logger from './index';
// Helper functions pour un usage simplifié
export const log = {
  // Log d'information générale
  info: (message: string, meta?: any) => {
    Logger.info(message, meta);
  },

 // Log d'erreur
  error: (message: string, error?: any) => {
    if (error) {
      Logger.error(`${message}: ${error.message || error}`, { stack: error.stack });
    } else {
      Logger.error(message);
    }
  },

  // Log d'avertissement
  warn: (message: string, meta?: any) => {
    Logger.warn(message, meta);
  },

  // Log HTTP (requêtes API)
  http: (message: string, meta?: any) => {
    Logger.http(message, meta);
  },
  
  // Log de débogage
  debug: (message: string, meta?: any) => {
    Logger.debug(message, meta);
  },
  
  // Log avec métadonnées structurées
  structured: (level: string, message: string, context: any) => {
    Logger.log(level, message, { context });
  }
};

// Middleware pour Express
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  
  next();
};

export default Logger;
