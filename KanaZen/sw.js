const CACHE_NAME = "ZenPro-v1-20260417";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-1024.png"
];
const AUDIO_IDS = [
  "a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so",
  "ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho",
  "ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"
];
const AUDIO_ASSETS = AUDIO_IDS.map((id) => `./assets/audio/${id}.mp3`);
const ASSETS = [...CORE_ASSETS, ...AUDIO_ASSETS];
const SHELL_URL = new URL("./index.html", self.registration.scope);

function isShellRequest(request) {
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === SHELL_URL.pathname);
}

async function fetchFresh(request) {
  try {
    return await fetch(new Request(request, { cache: "reload" }));
  } catch (error) {
    return fetch(request);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchFresh(request);
    if (response.ok) {
      await cache.put(SHELL_URL.href, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match(SHELL_URL.href)) || (await cache.match("./")) || Response.error();
  }
}

async function cacheFirstWithRefresh(request) {
  const cached = await caches.match(request);
  const refresh = (async () => {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })();
  if (cached) {
    refresh.catch(() => {});
    return cached;
  }
  return refresh.catch(() => Response.error());
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(ASSETS.map(async (asset) => {
      const response = await fetch(asset, { cache: "reload" });
      if (response.ok) await cache.put(asset, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate" || isShellRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }
  event.respondWith(cacheFirstWithRefresh(event.request));
});
