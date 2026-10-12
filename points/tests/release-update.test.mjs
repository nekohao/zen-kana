import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const code=await fs.readFile('points/updates.js','utf8');
let checks=0;
const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
function setup({version='20261011.8',fail=false,offline=false,hidden=false,prepareError=false,stored=null,ready=true}={}){
 const events={},timers=[],calls=[],navigations=[],messages=[],storage=new Map(),status={textContent:''};
 if(stored)storage.set('points-release-target:/points/',JSON.stringify(stored));
 const release={schema:2,build:version,shell:{url:'assets/shell.hash.html'},assets:[]};
 class Channel{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};}}
 const controller={postMessage(data,ports){messages.push(data);ports[0].postMessage(data.type==='points:ping'?{ok:true,protocol:2}:prepareError?{ok:false,error:'Asset mismatch'}:{ok:true,build:data.release.build,downloaded:2,reused:21});}};
 const elements={pointsUpdateStatus:status,pointsCheckUpdateBtn:{addEventListener:(_type,fn)=>events.manual=fn},openVersionInfoBtn:{addEventListener:(_type,fn)=>events.open=fn}};
 let failFetch=fail,resolveWrite=null;
 const window={fetch:async(input,init)=>{calls.push({url:String(input),init});if(init?.method==='POST')return new Promise(resolve=>resolveWrite=resolve);if(failFetch)throw Error('Network down');return {ok:true,json:async()=>release};},
  PointsStartup:{status:()=>({ready})},PointsRuntime:{clear(){}},addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>messages.push(event.type)};
 const navigator={onLine:!offline,serviceWorker:{controller,register:async()=>({active:controller,update:async()=>{}}),addEventListener:(name,fn)=>events[name]=fn}};
 const document={hidden,baseURI:'https://example.test/points/',querySelector:()=>({content:'20261011.7'}),getElementById:id=>elements[id],addEventListener:(name,fn)=>events[name]=fn};
 const context=vm.createContext({window,navigator,document,URL,Date,Event,AbortController,MessageChannel:Channel,Promise,console,isSecureContext:true,
  sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  location:{href:'https://example.test/points/?__points_target=20261011.8',replace:url=>navigations.push(url)},history:{state:null,replaceState(){}},
  fetch:(...args)=>window.fetch(...args),
  setTimeout:(fn,ms)=>{const id=timers.length;timers.push({fn,ms,cleared:false});if(ms===200||ms===250)setImmediate(fn);return id;},clearTimeout:id=>{if(timers[id])timers[id].cleared=true;}
 });vm.runInContext(code,context);
 return {context,window,navigator,document,events,timers,calls,navigations,messages,storage,status,setFail:value=>failFetch=value,finishWrite:()=>resolveWrite?.({ok:true})};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
let env=setup();
await env.window.__checkHtmlUpdate__();
check(env.calls.length,1,'one small manifest request, worker downloads payload');
check(env.messages.filter(m=>m.type==='points:prepare-release').length,1,'single prepare coordinator');
check(env.navigations.length,1,'prepared release navigates once');
check(new URL(env.navigations[0]).searchParams.get('__points_target'),'20261011.8','exact target requested');
check(env.messages.includes('points:before-update'),true,'draft event preserved');
await env.window.PointsUpdates.install();check(env.navigations.length,1,'no duplicate refresh');
env=setup({fail:true});await env.window.__checkHtmlUpdate__();
check(env.timers.some(t=>t.ms===5000&&!t.cleared),true,'first manifest failure retries');
check(env.status.textContent.includes('自动重试'),true,'first failure is visible');
env.setFail(false);env.timers.find(t=>t.ms===5000).fn();await flush();await flush();await flush();
check(env.navigations.length,1,'automatic retry recovers initial failure');
env=setup({prepareError:true});await env.window.__checkHtmlUpdate__();
check(env.navigations.length,0,'partial release never navigates');
check(env.timers.some(t=>t.ms===5000),true,'failed preparation retries');
env=setup({offline:true});await env.window.__checkHtmlUpdate__();
check(env.calls.length,0,'offline manifest skipped');env.navigator.onLine=true;env.events.online();await flush();await flush();await flush();
check(env.navigations.length,1,'online resumes update immediately');
env=setup({hidden:true});await env.window.__checkHtmlUpdate__();check(env.calls.length,0,'hidden check deferred');
env.document.hidden=false;env.events.visibilitychange();await flush();await flush();await flush();
check(env.navigations.length,1,'foreground resumes update without old minute cooldown');
env=setup();const input={method:'POST',headers:{'x-test':'same'},body:'unchanged'};
const write=env.window.fetch('https://project.supabase.co/rest/v1/rpc/save',input);
const install=env.window.__checkHtmlUpdate__();await flush();await flush();
check(env.navigations.length,0,'active request prevents reload');
check(env.calls[0].init,input,'request parameters untouched');env.finishWrite();await write;await install;
check(env.navigations.length,1,'update proceeds after write completes');
env=setup({version:'20261011.6'});await env.window.__checkHtmlUpdate__();
check(env.navigations.length,0,'stale CDN never downgrades');
check(env.status.textContent.includes('尚未同步'),true,'stale CDN is not reported as latest');
env=setup({version:'20261011.7',stored:{build:'20261011.7',attempts:1}});await env.window.__checkHtmlUpdate__();
check(env.storage.size,0,'actual running version confirms completed update');
env=setup({stored:{build:'20261011.9',attempts:1}});await env.window.__checkHtmlUpdate__();
check(env.navigations.length,0,'failed target does not accept older manifest');
env=setup({ready:false,version:'20261011.7',stored:{build:'20261011.7',attempts:3}});await env.events.open();
check(env.navigations.length,0,'same-version startup failures have a reload limit');
await env.events.manual();check(env.navigations.length,1,'explicit check can reset failed update limit');
env=setup({version:'20261011.7'});env.timers.find(t=>t.ms===60000).fn();await flush();
check(env.calls.length,1,'foreground periodically checks a newly published manifest');
env=setup({hidden:true});env.timers.find(t=>t.ms===60000).fn();await flush();
check(env.calls.length,0,'background polling does not wake hidden apps');
console.log(`${checks} coordinator retries, resume, atomic target switching, version confirmation and untouched requests checks passed.`);
