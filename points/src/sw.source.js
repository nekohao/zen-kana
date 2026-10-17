/* Versioned public assets only. Account/API requests never enter caches. */
const BUILD='__POINTS_BUILD__';
const bakedRelease=()=>JSON.parse('__POINTS_RELEASE_JSON__');
const SCOPE=new URL(self.registration.scope),SHELL=new URL('index.html',SCOPE).href;
const PREFIX='points-release-v2-'+encodeURIComponent(SCOPE.pathname)+'-';
const ASSETS='points-assets-v2-'+encodeURIComponent(SCOPE.pathname);
const CONTROL='points-control-v2-'+encodeURIComponent(SCOPE.pathname);
const IMAGES='points-images-v2-'+encodeURIComponent(SCOPE.pathname);
const POINTER=new URL('__points_ready__',SCOPE).href,META=new URL('__points_manifest__',SCOPE).href;
const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1];};
const jsonResponse=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
function validate(release){
 if(release?.schema!==2||!/^\d{8}\.\d+$/.test(release.build)||!Array.isArray(release.assets)||release.assets.length>80)throw Error('Invalid release');
 const files=[...release.assets,release.shell],urls=new Set();let total=0;
 for(const file of files){
  if(!file||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isInteger(file.bytes)||file.bytes<1||file.bytes>2000000)throw Error('Invalid asset');
  if(!/^assets\/[a-z0-9-]+\.[a-f0-9]{64}\.(?:js|css|html)$/.test(file.url)||!file.url.includes('.'+file.sha256+'.')||urls.has(file.url))throw Error('Invalid asset URL');
  urls.add(file.url);total+=file.bytes;
 }
 if(total>8000000||!release.shell.url.endsWith('.html')||release.assets.some(f=>!/\.(?:js|css)$/.test(f.url)))throw Error('Invalid release size');
 return release;
}
async function request(url,timeout=30000){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(url,{cache:'no-store',credentials:'same-origin',signal:controller.signal});if(!response.ok)throw Error('HTTP '+response.status);const bytes=await response.arrayBuffer(),headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.delete('Content-Length');return new Response(bytes,{status:response.status,headers});}finally{clearTimeout(timer);}
}
async function ready(build){
 const cache=await caches.open(PREFIX+build),meta=await cache.match(META),shell=await cache.match(SHELL);
 if(!meta||!shell)return null;return {release:validate(await meta.json()),shell};
}
async function latest(){
 const pointer=await (await caches.open(CONTROL)).match(POINTER);
 const build=pointer?(await pointer.json()).build:BUILD;
 // Installing and active workers can publish concurrently; complete cache metadata is authoritative.
 const builds=[...new Set([build,BUILD,...(await caches.keys()).filter(name=>name.startsWith(PREFIX)).map(name=>name.slice(PREFIX.length))])]
  .filter(value=>/^\d{8}\.\d+$/.test(value)).sort((a,b)=>compare(b,a));
 for(const candidate of builds){const complete=await ready(candidate);if(complete)return complete;}
 return null;
}
let preparing=new Map(),publish=Promise.resolve();
async function prepare(input){
 const release=validate(input);
 if(preparing.has(release.build))return preparing.get(release.build);
 const job=(async()=>{
  const bank=await caches.open(ASSETS),files=[...release.assets,release.shell];let downloaded=0,reused=0;
  // Each hash is verified before use; interrupted downloads remain reusable but never become an active release.
  let index=0;
  async function download(){
   while(index<files.length){
    const file=files[index++],url=new URL(file.url,SCOPE).href;
    let response=await bank.match(url),bytes=response?await response.clone().arrayBuffer():null;
    if(bytes&&(bytes.byteLength!==file.bytes||await digest(bytes)!==file.sha256)){response=null;bytes=null;}
    if(response){reused++;continue;}
    response=await request(url);bytes=await response.clone().arrayBuffer();
    if(bytes.byteLength!==file.bytes||await digest(bytes)!==file.sha256)throw Error('Asset integrity mismatch');
    await bank.put(url,response);downloaded++;
   }
  }
  await Promise.all([download(),download(),download()]);
  const shell=await bank.match(new URL(release.shell.url,SCOPE).href),html=await shell.clone().text();
  if(!html.includes(`content="${release.build}" name="points-build"`)||!html.includes('id="pointsApp"'))throw Error('Shell mismatch');
  const cache=await caches.open(PREFIX+release.build);
  await cache.put(SHELL,shell);await cache.put(META,jsonResponse(release));
  // Serialize pointer commits; a late response must never roll an already prepared release back.
  const commit=publish.catch(()=>{}).then(async()=>{
   const control=await caches.open(CONTROL),previous=await control.match(POINTER);
   if(!previous||compare(release.build,(await previous.json()).build)>=0)await control.put(POINTER,jsonResponse({build:release.build}));
  });publish=commit;await commit;
  return {build:release.build,downloaded,reused};
 })();preparing.set(release.build,job);
 try{return await job;}finally{preparing.delete(release.build);}
}
self.addEventListener('install',event=>event.waitUntil((async()=>{await prepare(bakedRelease());await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 // Retain previous release/asset caches for open clients and rollback.
 // Remove only the retired recipe photographs from this app's image cache.
 const images=await caches.open(IMAGES);
 for(const request of await images.keys())if(new URL(request.url).pathname.startsWith(SCOPE.pathname+'images/kitchen/'))await images.delete(request);
 await self.clients.claim();
 for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'points:release-ready',build:BUILD});
})()));
self.addEventListener('message',event=>{
 const port=event.ports?.[0];if(!port)return;
 if(event.data?.type==='points:ping'){port.postMessage({ok:true,protocol:2});return;}
 if(event.data?.type!=='points:prepare-release')return;
 event.waitUntil(prepare(event.data.release).then(result=>port.postMessage({ok:true,...result}),error=>port.postMessage({ok:false,error:error.message})));
});
self.addEventListener('fetch',event=>{
 const requestInfo=event.request,url=new URL(requestInfo.url);
 if(requestInfo.method!=='GET'||url.origin!==SCOPE.origin||!url.pathname.startsWith(SCOPE.pathname))return;
 const relative=url.pathname.slice(SCOPE.pathname.length);
 const navigation=requestInfo.mode==='navigate'&&(relative===''||relative==='index.html');
 const asset=/^assets\/[a-z0-9-]+\.([a-f0-9]{64})\.(?:js|css|html)$/.exec(relative);
 const image=/^ICON\/[a-zA-Z0-9_-]+\.png$/.test(relative);
 if(!navigation&&!asset&&!image)return;
 event.respondWith((async()=>{
  if(navigation){
   const target=url.searchParams.get('__points_target');
   let selected=await latest();
   if(target&&/^\d{8}\.\d+$/.test(target)&&(!selected||compare(selected.release.build,target)<0))selected=await ready(target);
   if(selected)return selected.shell;
   // Legacy refresh URLs also use a fully prepared release, avoiding a second network download.
   try{const manifest=await (await request(new URL('version.json?check='+Date.now(),SCOPE),10000)).json();await prepare(manifest);selected=await latest();if(selected)return selected.shell;}catch(_){}
   selected=await latest();if(selected)return selected.shell;
   throw Error('No complete offline release');
  }
  const cache=await caches.open(asset?ASSETS:IMAGES),key=asset?new URL(relative,SCOPE).href:requestInfo;
  const cached=await cache.match(key);if(cached)return cached;
  if(image){const legacy=await caches.match(requestInfo);if(legacy){await cache.put(key,legacy.clone());return legacy;}}
  const response=await request(requestInfo.url);
  if(asset&&await digest(await response.clone().arrayBuffer())!==asset[1])throw Error('Asset integrity mismatch');
  await cache.put(key,response.clone());return response;
 })());
});

// Every push is visible, including malformed messages (required by Safari).
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload={};try{payload=event.data?.json() || {};}catch(_){}
    const fallback=new URL('index.html?open=messages',self.registration.scope);
    let target=fallback;
    try {
      const candidate=new URL(payload.url,self.registration.scope),scope=new URL(self.registration.scope);
      if(candidate.origin===scope.origin && candidate.pathname.startsWith(scope.pathname))target=candidate;
    } catch(_){}
    const taskId=String(payload.tag||'').match(/^points-family-([1-9][0-9]*)$/)?.[1];
    if(taskId&&target.searchParams.get('open')==='kitchen')target.searchParams.set('family_task',taskId);
    await self.registration.showNotification(String(payload.title || '小世界').slice(0,80),{
      body:String(payload.body || '你有一条新提醒。').slice(0,160),
      icon:new URL('ICON/icon-192.png',self.registration.scope).href,
      tag:String(payload.tag || 'points-updates').slice(0,64),data:{url:target.href}
    });
  })());
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const scope=new URL(self.registration.scope);
    let target=new URL('index.html?open=messages',scope);
    try {
      const candidate=new URL(event.notification.data?.url,scope);
      if(candidate.origin===scope.origin && candidate.pathname.startsWith(scope.pathname))target=candidate;
    } catch(_){}
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=windows.find(client=>{try{const u=new URL(client.url);return u.origin===scope.origin && u.pathname.startsWith(scope.pathname);}catch(_){return false;}});
    if(existing){await existing.focus();existing.postMessage({type:'points:open-notification',url:target.href});}
    else await self.clients.openWindow(target.href);
  })());
});
