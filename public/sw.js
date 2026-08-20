// =====================================================================================
// SERVICE WORKER - AC COACHING WEB PUSH & BACKGROUND NOTIFICATIONS
// =====================================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Ricezione Notifica Push da Server / Supabase Web Push
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

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click sulla Notifica Push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const rawUrl = event.notification.data?.action_url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se c'è già una finestra aperta del portale, portala in primo piano e naviga
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          if (client.navigate) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Altrimenti apri una nuova finestra del browser
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
