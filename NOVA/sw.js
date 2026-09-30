const CACHE_PREFIX='bsw-learning-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=CACHE_PREFIX+'v2026.09.30.7';
const SHELL=[
  './index.html','./manifest.webmanifest','./data/courses.json',
  './icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png',
  './notes/07/7.1.html','./notes/07/7.2.html','./notes/07/7.3.html','./notes/07/7.4.html',
  './notes/06/6.2.html','./notes/08/8.1.html','./notes/08/8.2.html','./notes/08/8.3.html','./notes/08/8.4.html','./notes/08/8.6.html'
];
async function boundedFetch(req,options={},timeoutMs=5000){
  const controller=new AbortController();let timer;
  try{
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>{reject(new Error('Network timeout'));controller.abort()},timeoutMs);
    });
    return await Promise.race([(async()=>{
      const res=await fetch(req,{...options,signal:controller.signal});
      if(!res.ok)throw new Error('HTTP '+res.status);
      // Include the response body in the timeout, not just HTTP headers.
      const body=await res.arrayBuffer();
      return new Response(body,{status:res.status,statusText:res.statusText,headers:res.headers});
    })(),timeout]);
  }finally{clearTimeout(timer)}
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    // A missing optional asset must not prevent this worker from replacing the old one.
    await Promise.allSettled(SHELL.map(async path=>{
      const req=new Request(new URL(path,self.registration.scope));
      const res=await boundedFetch(req,{cache:'reload'});
      await cache.put(req,res);
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
async function networkFirst(req,fallback){
  const cache=await caches.open(CACHE);
  try{
    const res=await boundedFetch(req,{cache:'no-store'});
    try{await cache.put(req,res.clone())}catch(e){console.warn(e)}
    return res;
  }catch(e){
    return (await cache.match(req))||(fallback?await cache.match(fallback):null)||Response.error();
  }
}
async function staleWhileRevalidate(req,event,fallback){
  const cache=await caches.open(CACHE),cached=(await cache.match(req))||(fallback?await cache.match(fallback):null);
  const refresh=boundedFetch(req).then(async res=>{
    try{await cache.put(req,res.clone())}catch(e){console.warn(e)}
    return res;
  }).catch(()=>null);
  event.waitUntil(refresh.then(()=>{}));
  return cached||(await refresh)||Response.error();
}
function isAppEntry(url){
  const scope=new URL(self.registration.scope);
  return url.pathname===scope.pathname||url.pathname===scope.pathname+'index.html';
}
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);if(url.origin!==location.origin)return;
  if(req.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(req,event,isAppEntry(url)?'./index.html':null));return;
  }
  if(url.pathname.endsWith('/sw.js')){
    event.respondWith(networkFirst(req));return;
  }
  event.respondWith(staleWhileRevalidate(req,event));
});
