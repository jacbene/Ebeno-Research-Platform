import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// 1. Précache des assets générés par Vite (injecté automatiquement)
precacheAndRoute(self.__WB_MANIFEST);

// 2. Stratégie pour les appels API (NetworkFirst : réseau d'abord, cache en secours)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3, // Si le réseau met > 3s, on prend le cache
    plugins: [
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }), // 1 jour
    ],
  })
);

// 3. Stratégie pour les images Cloudinary (CacheFirst : cache d'abord, puis réseau)
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }), // 30 jours
    ],
  })
);

// 4. Stratégie pour les polices (StaleWhileRevalidate : cache immédiat, mise à jour en fond)
registerRoute(
  ({ request }) => request.destination === 'font',
  new StaleWhileRevalidate({
    cacheName: 'fonts-cache',
  })
);

// 5. Fallback offline pour la navigation (si la page n'est pas en cache)
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
  }
});
