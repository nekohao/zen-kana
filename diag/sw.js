/* Diag Tutor Service Worker
 * 策略：
 *   - version.json 永远 network-first（用于检测更新）
 *   - 其它文件 cache-first，命中后台静默更新
 *   - 收到 SKIP_WAITING 立刻接管并刷新所有客户端
 */
const CACHE_PREFIX = 'diag-tutor-';
let CACHE_NAME = CACHE_PREFIX + 'bootstrap';

const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './lessons.js',
  './manifest.webmanifest',
  './icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // 拉一次 version.json 决定真实缓存名
    try {
      const r = await fetch('./version.json?ts=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        const v = await r.json();
        CACHE_NAME = CACHE_PREFIX + (v.version || 'dev');
      }
    } catch (e) { /* ignore */ }
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'PURGE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // version.json 始终走网络
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }
  event.respondWith((async () => {
    const cached = await caches.match(req);
    const fetchPromise = fetch(req).then(resp => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, copy));
      }
      return resp;
    }).catch(() => cached);
    return cached || fetchPromise;
  })());
});
