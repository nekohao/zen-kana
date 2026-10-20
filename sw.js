/* Change this version whenever any deployed file changes. */
const PREFIX = 'mediterranean:' + self.registration.scope + ':';
const VERSION = PREFIX + 'v1.4.2';
const CORE = ['./', './index.html', './styles.css', './recipes.js', './core.js', './views.js', './app.js', './cloud-config.js', './cloud.js', './assets/vendor/supabase-2.118.0.js', './manifest.webmanifest', './asset-manifest.json', './assets/icon.svg', './assets/brand-mark.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/fonts/PinyonScript-Regular.ttf'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const response = await fetch('./asset-manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Image manifest unavailable');
  const photos = await response.json();
  const cache = await caches.open(VERSION);
  await cache.addAll([...CORE, ...photos]);
})()));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== VERSION).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) { if (event.request.mode === 'navigate') return await cache.match('./index.html'); throw error; }
  }));
});
