// Service Worker for Push Notifications

// Cache name for the app
const CACHE_NAME = 'scope-stats-v1';

// Files to cache
const urlsToCache = [
  '/',
  '/index.html',
  '/codestats.png',
  '/favicon.ico'
];

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'New Notification',
        body: event.data.text(),
        icon: '/codestats.png'
      };
    }
  }
  
  const title = data.title || 'SCOPE Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/codestats.png',
    badge: data.badge || '/codestats.png',
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  // If the notification has a URL, open it
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
    return;
  }
  
  // Handle click action if defined
  if (event.action === 'open' && event.notification.data && event.notification.data.notificationId) {
    // Open the notifications UI
    event.waitUntil(
      clients.openWindow('/dashboard?openNotifications=true')
    );
    return;
  }
  
  // Default action - open the app or focus if already open
  event.waitUntil(
    clients.matchAll({
      type: 'window'
    })
    .then((clientList) => {
      // If we have an open window, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/dashboard');
      }
    })
  );
}); 