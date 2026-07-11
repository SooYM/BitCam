// sw.js
const CACHE_NAME = 'vicepoly-cache-v9';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/filters.js',
  './js/app.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json'
];

// Cache all assets during service worker installation
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate handler to clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Cache-first request resolution strategy
self.addEventListener('fetch', (e) => {
  // Only handle GET requests (ignores chrome-extension and external analytics)
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache, but fetch updated asset in background for next reload (stale-while-revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
          }
        }).catch(() => {/* Ignore network errors offline */});
        return cachedResponse;
      }
      return fetch(e.request);
    })
  );
});
