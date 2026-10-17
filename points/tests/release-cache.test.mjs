import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto,createHash} from 'node:crypto';
import {bundle} from '../scripts/build.mjs';
let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const stamp='2026-10-11T14:00:00.000Z';
const a=await bundle({build:'20261011.701',updatedAt:stamp});
const b=await bundle({build:'20261011.702',updatedAt:stamp,overrides:{'kitchen.css':await fs.readFile('points/src/kitchen.css','utf8')+'\n/* isolated test change */\n'}});
check(a.release.assets.length,21,'independent CSS/JS modules without retired kitchen scripts');
const changed=b.release.assets.filter(f=>!a.release.assets.some(x=>x.url===f.url));
check(changed.length,1,'one CSS change alters one asset');
check(changed[0].url.startsWith('assets/kitchen.'),true,'only kitchen CSS affected');
check(Buffer.byteLength(a.html)<85000,true,'small shell');
check(a.html.indexOf('window.PointsReleaseLoadFailed=true')<a.html.indexOf('<link rel="stylesheet"'),true,'resource recovery binds before first stylesheet');
for(const result of [a,b])for(const [url,body] of result.files){
 const file=[...result.release.assets,result.release.shell].find(f=>f.url===url);
 check(createHash('sha256').update(body).digest('hex'),file.sha256,'manifest integrity');
 if(url.endsWith('.js'))new vm.Script(body);
}
const order=[...a.html.matchAll(/data-points-asset="([^"]+)"/g)].map(m=>m[1]);
check(order,['startup','runtime','sdk','gestures','family','fat','rewards','access','push','notifications','app','theme'],'active module execution order');
const scope='https://example.test/points/',shell=scope+'index.html';
const buckets=new Map(),networkFiles=new Map([...a.files,...b.files]),requests=[],handlers={};
let offline=false,badAsset=null;
const cacheStorage={
 async open(name){if(!buckets.has(name))buckets.set(name,new Map());const entries=buckets.get(name);return {
  match:async key=>entries.get(typeof key==='string'?key:key.url)?.clone(),
  put:async(key,response)=>entries.set(typeof key==='string'?key:key.url,response.clone()),
  keys:async()=>[...entries.keys()].map(url=>({url})),delete:async key=>entries.delete(typeof key==='string'?key:key.url)
 };},keys:async()=>[...buckets.keys()],delete:async key=>buckets.delete(key),
 async match(key){for(const name of buckets.keys()){const value=await (await this.open(name)).match(key);if(value)return value;}}
};
const context=vm.createContext({URL,Response,Headers,AbortController,setTimeout,clearTimeout,crypto:webcrypto,caches:cacheStorage,
 fetch:async url=>{const relative=String(url).slice(scope.length);requests.push(relative);if(offline)throw Error('Offline');if(relative===badAsset)return new Response('corrupt',{status:200});if(relative.startsWith('version.json'))return new Response(JSON.stringify(b.release));if(!networkFiles.has(relative))throw Error('Missing '+relative);return new Response(networkFiles.get(relative));},
 self:{registration:{scope},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>[]}}
});vm.runInContext(a.worker,context);
async function lifecycle(type){let work;handlers[type]({waitUntil:p=>work=p});await work;}
async function prepare(release){let work,answer;handlers.message({data:{type:'points:prepare-release',release},ports:[{postMessage:response=>answer=response}],waitUntil:p=>work=p});await work;return answer;}
async function navigate(query=''){let result;handlers.fetch({request:{url:shell+query,method:'GET',mode:'navigate'},respondWith:p=>result=p});return result?await result:null;}
const photos=await cacheStorage.open('points-images-v2-'+encodeURIComponent('/points/'));
await photos.put(scope+'images/kitchen/old.jpg',new Response('old recipe'));await photos.put(scope+'ICON/icon-192.png',new Response('icon'));
await lifecycle('install');await lifecycle('activate');
check(await photos.match(scope+'images/kitchen/old.jpg'),undefined,'retired food cache removed');
check(!!await photos.match(scope+'ICON/icon-192.png'),true,'icons retained');
check(requests.length,a.release.assets.length+1,'initial prepare downloads shell and assets once');
check((await (await navigate()).text()).includes('20261011.701'),true,'initial ready shell');
const before=requests.length;
badAsset=changed[0].url;
const failure=await prepare(b.release);
check(failure.ok,false,'hash failure does not commit');
check((await (await navigate()).text()).includes('20261011.701'),true,'failed update retains old release');
// Inflight valid downloads may finish even when another asset failed; let them settle before retry.
await new Promise(resolve=>setTimeout(resolve,50));badAsset=null;
const result=await prepare(b.release);
check(result.ok,true,'retry prepares complete release');
const newRequests=requests.slice(before);
check(newRequests.some(url=>a.release.assets.some(f=>f.url===url)),false,'unchanged assets make zero download requests');
check(newRequests.filter(url=>url===changed[0].url).length,2,'only corrupt changed asset retried');
check(newRequests.filter(url=>url===b.release.shell.url).length,1,'prepared shell reused on retry');
offline=true;
const readyRequestCount=requests.length;
check((await (await navigate('?__points_target=20261011.702')).text()).includes('20261011.702'),true,'offline navigation consumes prepared version');
check(requests.length,readyRequestCount,'no second HTML download after prepare');
check((await (await navigate('?__app_refresh=123')).text()).includes('20261011.702'),true,'old updater refresh URL migrates to ready release');
check((await (await navigate()).text()).includes('20261011.702'),true,'warm launch uses latest complete version');
await prepare(a.release);
check((await (await navigate()).text()).includes('20261011.702'),true,'late older preparation cannot downgrade');
check((await (await navigate('?__points_target=20261011.701')).text()).includes('20261011.702'),true,'late old navigation target cannot downgrade');
const control=await cacheStorage.open('points-control-v2-'+encodeURIComponent('/points/'));
await control.put(scope+'__points_ready__',new Response(JSON.stringify({build:a.build})));
check((await (await navigate()).text()).includes('20261011.702'),true,'concurrent workers with stale pointer still select highest complete release');
let intercepted=false;
for(const request of [{url:scope+'version.json',method:'GET',mode:'cors'},{url:scope+'rpc',method:'POST',mode:'cors'},{url:'https://project.supabase.co/rest/v1/rpc/a',method:'POST',mode:'cors'}]){
 handlers.fetch({request,respondWith:()=>intercepted=true});
}check(intercepted,false,'version/API/auth/writes never cached');
const malicious={...b.release,shell:{...b.release.shell,url:'../other/index.html'}};
check((await prepare(malicious)).ok,false,'out-of-scope assets rejected');
console.log(`${checks} content hashes, atomic cache commits, retries, incrementality, offline target navigation and scope checks passed.`);
