/* global self, clients */
// frontend/public/sw.js
// ✅ Service Worker pour les Push Notifications Ebeno Research Platform

const APP_URL = self.location.origin;

// ============================================================
// Installation
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation');
  self.skipWaiting();
});

// ============================================================
// Activation
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation');
  event.waitUntil(self.clients.claim());
});

// ============================================================
// ✅ Réception d'une Push Notification
// ============================================================
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (err) {
    payload = { title: 'Ebeno Research Platform', body: event.data.text() };
  }

  const title = payload.title || 'Ebeno Research Platform';
  const body = payload.body || '';
  const url = payload.url || '/';
  const tag = payload.tag || 'ebeno-notification';

  const options = {
    body,
    icon: `${APP_URL}/logo192.png`,
    badge: `${APP_URL}/logo192.png`,
    tag,
    renotify: true,
    data: { url, timestamp: payload.timestamp },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ============================================================
// ✅ Clic sur la notification → ouvrir/focus l'app
// ============================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';
  const fullUrl = url.startsWith('http') ? url : `${APP_URL}${url}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si un onglet est déjà ouvert sur le domaine → focus + navigate
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.focus();
          client.navigate(fullUrl);
          return;
        }
      }
      // Sinon, ouvrir un nouvel onglet
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    })
  );
});

// ============================================================
// Cleanup
// ============================================================
self.addEventListener('notificationclose', () => {
  // Rien à faire
});
