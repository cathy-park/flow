const CACHE_NAME = 'flow-cache-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/logo.png',
  '/assets/income_bag.png',
  '/assets/wallet_wings.png',
  '/assets/money_stack.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Aggressively delete ALL old caches that aren't the current version
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW: Purging old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const isNavigation = event.request.mode === 'navigate';
  
  if (isNavigation) {
    // Network-First for Navigation (index.html)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-First for other assets
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});
