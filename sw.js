/**
 * StrokeTracker Service Worker (sw.js)
 * Network-First with cache: 'no-cache' revalidation & Offline Cache Fallback:
 * - Bypasses stale browser HTTP disk cache when online so new updates always load
 * - Seamlessly serves cached app shell when offline with zero mobile reception
 */

const CACHE_NAME = 'stroketracker-cache-v5';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css?v=1.4',
  './app.js?v=1.4',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return null;
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true })
      )
  );
});
