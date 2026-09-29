const CACHE_NAME = 'autosar-bsw-2026.09.29.5';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('autosar-bsw-') && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigation: network-first so GitHub updates are picked up immediately.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req, {cache:'no-store'});
        const cache = await caches.open(CACHE_NAME);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      const network = fetch(req).then(async res => {
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      }).catch(() => null);
      return cached || await network || Response.error();
    })());
  }
});
