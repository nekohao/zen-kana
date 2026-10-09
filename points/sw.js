/* Scope is /points/. Supabase, auth, writes and version checks never enter caches. */
const BUILD='20261009.4';
const PREFIX='points-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+BUILD;
const SHELL=new URL('index.html',self.registration.scope).href;
const validShell=async response=>{
  if(!response.ok)return false;
  const html=await response.clone().text();
  const version=html.match(/content="(\d{8}\.\d+)" name="points-build"/)?.[1];
  if(!version || !html.includes('id="pointsApp"'))return false;
  const [day,revision]=version.split('.').map(Number),[currentDay,currentRevision]=BUILD.split('.').map(Number);
  return day>currentDay || day===currentDay && revision>=currentRevision;
};
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const response=await fetch(SHELL,{cache:'reload'});
    const html=await response.clone().text();
    // During a CDN rollout, refuse to cache an HTML version different from this worker.
    if(!response.ok || !html.includes('content="20261009.4" name="points-build"'))throw Error('Incomplete release');
    await (await caches.open(CACHE)).put(SHELL,response);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith(PREFIX) && key!==CACHE)await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET' || url.origin!==scope.origin || !url.pathname.startsWith(scope.pathname))return;
  const relative=url.pathname.slice(scope.pathname.length);
  const navigation=request.mode==='navigate' && (relative==='' || relative==='index.html');
  const image=/^(?:images\/kitchen\/[a-z0-9-]+\.jpg|ICON\/[a-zA-Z0-9_-]+\.png)$/.test(relative);
  if(!navigation && !image)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),key=navigation?SHELL:request;
    const cached=await cache.match(key);
    // Explicit update reloads reach the network; ordinary launches use the ready shell.
    if(cached && !(navigation && url.searchParams.has('__app_refresh')))return cached;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try {
      const response=await fetch(request,{signal:controller.signal});
      const valid=response.ok && (!navigation || await validShell(response));
      if(valid)await cache.put(key,response.clone());
      if(!valid && cached)return cached;
      if(!response.ok && cached)return cached;
      return response;
    } catch(error) {if(cached)return cached;throw error;}
    finally {clearTimeout(timer);}
  })());
});
