import { HelmetOptions } from 'helmet';

/**
 * CSP backend — API uniquement.
 * Le frontend (Render static) a sa propre CSP via frontend/public/_headers.
 *
 * Domaines : Sentry, Cloudinary, Brevo, Socket.IO (wss), previews Render.
 */

const SELF = "'self'";

const SENTRY_INGEST = [
  'https://*.ingest.sentry.io',
  'https://*.ingest.us.sentry.io',
  'https://*.ingest.de.sentry.io',
];

const CLOUDINARY = [
  'https://res.cloudinary.com',
  'https://api.cloudinary.com',
];

const BREVO = ['https://api.brevo.com'];

// Couvre ebeno-backend.onrender.com + previews + fichiers /uploads servis par le backend
const RENDER = ['https://*.onrender.com'];

export const cspOptions: HelmetOptions = {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: [SELF],

      // ⚠️ 'unsafe-inline' requis tant qu'on est sur CRA (react-scripts).
      // À retirer après migration Vite + nonces (chantier C).
      scriptSrc: [SELF, "'unsafe-inline'", ...SENTRY_INGEST],

      // Chart.js + styles inline React
      styleSrc: [SELF, "'unsafe-inline'"],

      // Images : Cloudinary + /uploads backend + data URIs + blob
      imgSrc: [SELF, 'data:', 'blob:', ...CLOUDINARY, ...RENDER],

      fontSrc: [SELF, 'data:'],

      // XHR/fetch/WebSocket : API self + Cloudinary + Brevo + Sentry + previews + Socket.IO
      connectSrc: [
        SELF,
        ...CLOUDINARY,
        ...BREVO,
        ...SENTRY_INGEST,
        ...RENDER,
        'wss:',
        'ws:',
      ],

      // Audio preview (Whisper/Deepgram) + /uploads
      mediaSrc: [SELF, 'blob:', ...CLOUDINARY, ...RENDER],

      // Service worker (PWA push) + blob workers
      workerSrc: [SELF, 'blob:'],

      // Manifest PWA
      manifestSrc: [SELF],

      // Aucune iframe (anti-clickjacking)
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],

      // Aucun plugin (Flash/PDF embeds)
      objectSrc: ["'none'"],

      baseUri: [SELF],
      formAction: [SELF],

      upgradeInsecureRequests: [],
    },

    // ⚠️ Passe à `true` 24h pour tester sans bloquer, puis `false`
    reportOnly: false,
  },

  crossOriginEmbedderPolicy: false,       // casse Cloudinary preview
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Cloudinary
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  hidePoweredBy: true,
  frameguard: { action: 'deny' },
};

/**
 * En dev : CSP désactivée pour ne pas bloquer localhost:3000/5173.
 * Les autres protections Helmet (HSTS, X-Frame-Options, noSniff) restent actives.
 */
export const cspOptionsDev: HelmetOptions = {
  ...cspOptions,
  contentSecurityPolicy: false,
};
