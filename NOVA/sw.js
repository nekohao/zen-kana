const CACHE='bsw-learning-v2026.09.30.1';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './data/courses.json',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
async function networkFirst(req){
  const cache=await caches.open(CACHE);
  try{const res=await fetch(req);if(res&&res.ok)cache.put(req,res.clone());return res}
  catch(e){return (await cache.match(req))||Response.error()}
}
async function staleWhileRevalidate(req){
  const cache=await caches.open(CACHE),cached=await cache.match(req);
  const fetchPromise=fetch(req).then(res=>{if(res&&res.ok)cache.put(req,res.clone());return res}).catch(()=>null);
  return cached||(await fetchPromise)||Response.error();
}
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.endsWith('/index.html')||url.pathname.endsWith('/data/courses.json')||url.pathname.endsWith('/manifest.webmanifest')){
    event.respondWith(networkFirst(req));return;
  }
  if(url.pathname.includes('/notes/')){
    event.respondWith(staleWhileRevalidate(req));return;
  }
  event.respondWith(staleWhileRevalidate(req));
});