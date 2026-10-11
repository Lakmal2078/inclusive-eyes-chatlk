const CACHE = 'chatlk-shell-v3';
const PRECACHE_ASSETS = [
  '/',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/offline.html',
  '/favicon-32x32.png',
  '/icon-192.png',
  '/icon-192.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // For HTML page navigation: network-first with cached /offline.html fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match(req).then(cached => cached || caches.match('/offline.html'))
      )
    );
    return;
  }

  // For static assets: cache-first with network fallback
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response && response.ok && req.url.startsWith(self.location.origin) && !req.url.includes('/api/') && !req.url.includes('/ws')) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, clone));
        }
        return response;
      });
    })
  );
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'ChatLK', {
      body: data.body || 'New message',
      icon: data.icon || '/icon-192.png',
      badge: '/favicon-32x32.png',
      data: data.data || {}
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.chatId ? '/?chat=' + event.notification.data.chatId : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
