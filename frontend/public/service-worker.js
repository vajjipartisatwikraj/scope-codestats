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

    data: data.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received:', event);
  
  event.notification.close();
  
  // Always direct to notifications page when a notification is clicked
  event.waitUntil(
    clients.openWindow('http://localhost:5173/notifications')
  );
}); 