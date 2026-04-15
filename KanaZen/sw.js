const CACHE_NAME = "kanazen-v9-20260415";
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, response.clone());
      }
      return response;
    } catch (error) {
      return cached || Response.error();
    }
  })());
});
