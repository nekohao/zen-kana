/* Change this version whenever any deployed file changes. */
const PREFIX = 'mediterranean:' + self.registration.scope + ':';
const VERSION = PREFIX + 'v2.0.2';
const CORE = ['./', './index.html', './styles.css', './recipes.js', './ingredients.js', './core.js', './views.js', './app.js', './cloud-config.js', './cloud.js', './assets/vendor/supabase-2.118.0.js', './manifest.webmanifest', './asset-manifest.json', './assets/icon.svg', './assets/brand-mark.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/fonts/PinyonScript-Regular.ttf'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const response = await fetch('./asset-manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Image manifest unavailable');
  const photos = await response.json();
  const cache = await caches.open(VERSION);
  await cache.addAll([...CORE, ...photos]);
  // Activate only after the complete offline package has been downloaded.
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  const previous = keys.filter(key => key.startsWith(PREFIX) && key !== VERSION);
  await Promise.all(previous.map(key => caches.delete(key)));
  await self.clients.claim();
  if (!previous.length) return; // First installation needs no extra reload.
  const windows = await self.clients.matchAll({ type: 'window' });
  for (const client of windows) {
    if (!client.url.startsWith(self.registration.scope)) continue;
    // Do not await navigation inside activate: its fetch may wait for activation to finish.
    // Worker-driven navigation also upgrades already-open v1/v2.0.0 pages.
    client.navigate(client.url).catch(() => client.postMessage({ type: 'APP_UPDATED' }));
  }
})()));
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
