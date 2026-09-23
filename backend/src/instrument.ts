// backend/src/instrument.ts
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN || '';
const ENV = process.env.NODE_ENV || 'development';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENV,
    release: process.env.SENTRY_RELEASE || 'ebeno-backend@1.0.0',

    // ✅ 10% des transactions en prod (quota gratuit)
    tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,

    // ✅ Ne pas envoyer les erreurs en dev
    enabled: ENV === 'production',

    // ✅ Nettoyer les données sensibles AVANT envoi à Sentry
    beforeSend(event) {
      // Retirer les headers sensibles
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['cookie'];
        delete event.request.headers['x-admin-token'];
      }

      // Retirer les données sensibles du body
      if (event.request?.data) {
        const data = event.request.data as any;
        if (data?.password) data.password = '[Filtered]';
        if (data?.newPassword) data.newPassword = '[Filtered]';
        if (data?.currentPassword) data.currentPassword = '[Filtered]';
        if (data?.token) data.token = '[Filtered]';
      }

      // Ignorer certaines erreurs bruyantes
      const msg = event.exception?.values?.[0]?.value || '';
      if (
        msg.includes('ECONNRESET') ||
        msg.includes('socket hang up') ||
        msg.includes('Client network socket disconnected')
      ) {
        return null;
      }

      return event;
    },

    // ✅ Ne pas envoyer les erreurs attendues (401, 403, 404)
    ignoreErrors: [
      'Non authentifié',
      'Token manquant',
      'Route non trouvée',
    ],
  });

  console.log(`✅ [Sentry] Backend initialisé (${ENV})`);
} else {
  console.log('ℹ️  [Sentry] DSN non configuré — monitoring désactivé');
}
