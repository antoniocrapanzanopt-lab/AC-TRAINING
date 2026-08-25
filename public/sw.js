// =====================================================================================
// SERVICE WORKER - AC COACHING & ATHLETE MANAGER (PWA ENGINE)
// Build Version: __BUILD_VERSION__
// =====================================================================================

const CACHE_NAME = 'ac-coach-cache-__BUILD_VERSION__';

// ─── 1. INSTALL LIFECYCLE ─────────────────────────────────────────────────────────────
// IMPORTANTE: NON chiamare skipWaiting() automaticamente qui.
// Il nuovo Service Worker resta nello stato 'waiting' finché il client non invia il segnale.
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed new version:', '__BUILD_VERSION__');
  // Non forziamo skipWaiting() per non interrompere sessioni attive o compilazione form
});

// ─── 2. CLIENT MESSAGE HANDLER ────────────────────────────────────────────────────────
// Ascolta il comando 'SKIP_WAITING' inviato dal client quando l'utente clicca "Aggiorna ora"
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[ServiceWorker] Received SKIP_WAITING signal from client. Activating now...');
    self.skipWaiting();
  }
});

// ─── 3. ACTIVATE LIFECYCLE ────────────────────────────────────────────────────────────
// Pulisce tutte le vecchie cache eccetto l'attuale CACHE_NAME e reclama i client attivi
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated version:', '__BUILD_VERSION__');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Deleting obsolete cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─── 4. WEB PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'AC COACHING',
    body: 'Hai una nuova notifica dal portale coach.',
    action_url: '/',
    priority: 'normal',
    tag: 'ac-notification',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (_) {
      try {
        data.body = event.data.text() || data.body;
      } catch (__) {}
    }
  }

  const isUrgent = data.priority === 'high' || data.priority === 'critical';

  const options = {
    body: data.body,
    icon: '/ac-logo-transparent.png',
    badge: '/ac-logo-transparent.png',
    tag: data.tag || `ac-notification-${Date.now()}`,
    data: {
      action_url: data.action_url || '/',
      priority: data.priority,
      timestamp: Date.now(),
    },
    requireInteraction: isUrgent,
    vibrate: isUrgent ? [200, 100, 200, 100, 200] : [100, 50, 100],
    actions: [
      { action: 'open', title: 'Apri Portale' },
      { action: 'close', title: 'Chiudi' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── 5. PUSH NOTIFICATION CLICK ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const rawUrl = event.notification.data?.action_url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
