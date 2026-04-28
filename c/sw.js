/* C 语言入门 App - Service Worker
   版本：2.4.0
   用法：和 index.html、manifest.json 放在 GitHub Pages 仓库根目录。
*/

const CACHE_NAME = 'c-language-guide-v2.4.0';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 只处理本站资源，避免拦截第三方请求。
  if (url.origin !== self.location.origin) return;

  // HTML 页面走 network-first：优先拿 GitHub 最新页面，失败时再用缓存。
  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('/index.html')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 其他静态资源走 stale-while-revalidate。
  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const fresh = await fetch(request, { cache: 'no-store' });

    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }

    return fresh;
  } catch (error) {
    const cached = await cache.match(request);
    const fallback = await cache.match('./index.html');

    return cached || fallback || new Response(
      '当前离线，且没有可用缓存。请联网后重新打开。',
      {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const freshPromise = fetch(request)
    .then((fresh) => {
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const fresh = await freshPromise;
  return fresh || new Response(
    '资源暂时不可用。',
    {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    }
  );
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
