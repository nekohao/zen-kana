import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const code=await fs.readFile(new URL('../web-push.js',import.meta.url),'utf8');
let checks=0;const check=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
const key='B'+'A'.repeat(86),scope='https://example.test/points/',endpoint='https://web.push.apple.com/test';
const legacy={token:'a'.repeat(64),binding:'admin:admin-1'};
const saved={...legacy,enabled:true,publicKey:key,endpoint};
function setup({admin=true,resolved=true,verified=true,stored=null,existing=false,configured=true,support=true,permission=existing?'granted':'default',oldKey=key}={}) {
  const ids=new Map(),events=[],calls=[],listeners={},workerListeners={},timers=new Map();
  const storage=new Map(stored?[['points-push-device-v1',JSON.stringify(stored)]]:[]);
  const faults={backend:false,receipt:false,register:false,remove:false,store:false,deferReceipt:false,deferRegister:false};
  let subscription=null,permissions=0,fetches=0,subscribes=0,unsubscribes=0,serverEnabled=existing,resolveReceipt,resolveRegister,nextTimer=0;
  class Element {
    hidden=false;disabled=false;textContent='';listeners={};parentElement={insertBefore(){}};previousElementSibling={};
    set innerHTML(v){for(const m of v.matchAll(/id="([^"]+)"/g))if(!ids.has(m[1]))ids.set(m[1],new Element());}
    closest(){return this;}addEventListener(name,fn){this.listeners[name]=fn;}click(){this.listeners.click?.();}
  }
  for(const id of ['openVersionInfoBtn','settingsBtn'])ids.set(id,new Element());
  const subscriptionFor=k=>({endpoint,options:{applicationServerKey:Uint8Array.from(atob(k.replace(/-/g,'+').replace(/_/g,'/')+'='),c=>c.charCodeAt(0))},
    unsubscribe:async()=>{unsubscribes++;events.push('unsubscribe');subscription=null;return true;},
    toJSON:()=>({endpoint,keys:{p256dh:key,auth:'A'.repeat(22)}})});
  if(existing)subscription=subscriptionFor(oldKey);
  const worker={scope,active:true,pushManager:{getSubscription:async()=>subscription,subscribe:async options=>{subscribes++;events.push('subscribe');subscription=subscriptionFor(key);subscription.options=options;return subscription;}}};
  const Notification={permission,requestPermission:()=>{permissions++;events.push('permission');Notification.permission='granted';return Promise.resolve('granted');}};
  const state={authResolved:resolved,isAdmin:admin,session:admin?{user:{id:'admin-1'}}:null};
  const access={verified};const document={hidden:false,baseURI:scope+'index.html',getElementById:id=>ids.get(id),createElement:()=>new Element(),addEventListener:(n,f)=>listeners[n]=f};
  const window={PointsDeviceAccess:access,addEventListener:(n,f)=>listeners[n]=f,...(support?{PushManager:{},Notification}:{})};
  const navigator={onLine:true,userAgent:'Desktop',platform:'',maxTouchPoints:0,serviceWorker:{getRegistration:async()=>worker,register:async()=>worker,ready:Promise.resolve(worker),addEventListener:(n,f)=>workerListeners[n]=f}};
  const db={auth:{getSession:async()=>({data:{session:{access_token:'test-jwt'}}})},async rpc(name,args){
    calls.push({name,args});events.push(name);
    if(name==='points_push_get_subscription'){
      if(faults.deferReceipt){faults.deferReceipt=false;return new Promise(resolve=>resolveReceipt=resolve);}
      if(faults.receipt)return {error:{code:'08006'}};return {data:{enabled:serverEnabled}};
    }
    if(name==='points_push_register'){if(faults.deferRegister){faults.deferRegister=false;return new Promise(resolve=>resolveRegister=()=>{serverEnabled=true;resolve({data:{enabled:true}});});}if(faults.register)return {error:{code:'08006'}};serverEnabled=true;return {data:{enabled:true}};}
    if(name==='points_push_remove'){if(faults.remove)return {error:{code:'08006'}};serverEnabled=false;return {data:null};}
    return {data:true};
  }};
  vm.runInNewContext(code,{window,document,navigator,Notification,isSecureContext:true,matchMedia:()=>({matches:false}),crypto,URL,Uint8Array,atob,AbortController,
    setTimeout:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>{if(faults.store)throw Error('Storage failed');storage.set(k,v);}},
    fetch:async(_url,options)=>{fetches++;if(faults.backend)throw Error('Network unavailable');if(options?.method==='POST'){configured=true;check(options.headers.Authorization,'Bearer test-jwt');}return new Response(JSON.stringify({deployed:true,sqlReady:true,configured,publicKey:key,appUrl:scope}));}});
  const api=window.PointsWebPush.attach({db,state,els:{settingsBtn:ids.get('settingsBtn')},backendUrl:'https://backend.test/push'});
  return {ids,events,calls,state,access,api,faults,storage,timers,document,Notification,
    emit:(n,e={})=>(listeners[n]||workerListeners[n])?.(e),resolve:value=>resolveReceipt(value),finishRegister:()=>resolveRegister(),
    get record(){return JSON.parse(storage.get('points-push-device-v1')||'null');},
    get permissions(){return permissions;},get fetches(){return fetches;},get subscribes(){return subscribes;},get unsubscribes(){return unsubscribes;},get subscription(){return subscription;},
    set serverEnabled(v){serverEnabled=v;},get serverEnabled(){return serverEnabled;}};
}
// Upgrading an existing installation restores without visiting settings or asking permission.
const warm=setup({stored:legacy,existing:true});await flush();
check(warm.ids.get('pointsPushStatus').textContent,'已开启');check(warm.permissions,0);check(warm.subscribes,0);check(warm.unsubscribes,0);
check(warm.record.enabled,true);check(warm.record.endpoint,endpoint);check(warm.calls.filter(c=>c.name==='points_push_register').length,1);
warm.emit('controllerchange');await flush();check(warm.ids.get('pointsPushStatus').textContent,'已开启');check(warm.unsubscribes,0);
check(warm.calls.filter(c=>c.name==='points_push_register').length,1);
const guest=setup({admin:false,stored:{...legacy,binding:'guest'},existing:true});await flush();check(guest.ids.get('pointsPushStatus').textContent,'已开启');check(guest.permissions,0);
// Unknown startup identity never deletes an administrator's saved subscription.
const unresolved=setup({admin:false,resolved:false,verified:false,stored:saved,existing:true});await flush();
check(unresolved.fetches,0);check(unresolved.unsubscribes,0);check(unresolved.calls.length,0);
unresolved.api.roleChanged();await flush();check(unresolved.record.enabled,true);check(unresolved.unsubscribes,0);
unresolved.state.session={user:{id:'admin-1'}};unresolved.state.isAdmin=true;unresolved.state.authResolved=true;unresolved.access.verified=true;
unresolved.emit('points:auth-resolved');await flush();check(unresolved.ids.get('pointsPushStatus').textContent,'已开启');check(unresolved.unsubscribes,0);
// Weak network and failed receipt reads leave the browser subscription and on choice intact.
warm.faults.backend=true;await warm.api.recover();check(warm.ids.get('pointsPushStatus').textContent,'已开启 · 待同步');check(warm.record.enabled,true);check(warm.unsubscribes,0);
warm.faults.backend=false;warm.emit('online');await flush();check(warm.ids.get('pointsPushStatus').textContent,'已开启');
warm.faults.receipt=true;await warm.api.recover();check(warm.ids.get('pointsPushStatus').textContent,'已开启 · 待同步');check(warm.subscription!==null,true);
warm.faults.receipt=false;warm.serverEnabled=false;warm.emit('pageshow');await flush();check(warm.serverEnabled,true);check(warm.permissions,0);check(warm.subscribes,0);
// Actual logout/identity change retires the previous recipient's subscription.
warm.state.session=null;warm.state.isAdmin=false;warm.api.roleChanged();await flush();
check(warm.unsubscribes,1);check(warm.serverEnabled,false);check(warm.record.enabled,false);check(warm.record.binding,null);
// First opt-in remains a user gesture, and failed registration can recover using the same subscription.
const first=setup();await flush();check(first.permissions,0);check(first.subscribes,0);check(first.ids.get('pointsPushEnable').disabled,false);
first.faults.register=true;first.ids.get('pointsPushEnable').click();await flush();
check(first.permissions,1);check(first.subscribes,1);check(first.record.enabled,true);check(first.subscription!==null,true);
first.faults.register=false;first.emit('online');await flush();check(first.ids.get('pointsPushStatus').textContent,'已开启');check(first.permissions,1);check(first.subscribes,1);
// Closing offline persists the off intention before attempting server cleanup.
first.faults.remove=true;first.ids.get('pointsPushDisable').click();await flush();
check(first.record.enabled,false);check(first.record.pendingRemoval,true);check(first.subscription,null);check(first.ids.get('pointsPushStatus').textContent,'本机已关闭 · 待同步');
const offReload=setup({stored:first.record});await flush();check(offReload.record.pendingRemoval,false);check(offReload.subscribes,0);check(offReload.permissions,0);
check(offReload.ids.get('pointsPushStatus').textContent,'本机已关闭');check(offReload.ids.get('pointsPushEnable').disabled,false);
// An old subscription that remains locally after a failed close is removed, never recreated.
const staleOff=setup({stored:{...saved,enabled:false,pendingRemoval:true},existing:true});await flush();
check(staleOff.subscription,null);check(staleOff.serverEnabled,false);check(staleOff.subscribes,0);
// A late receipt must not overwrite a newer off choice, including a choice from another tab.
const raced=setup({stored:saved,existing:true});await flush();raced.faults.deferReceipt=true;void raced.api.recover();await flush();
raced.ids.get('pointsPushDisable').click();check(raced.record.enabled,false);raced.resolve({data:{enabled:true}});await flush();
check(raced.record.enabled,false);check(raced.serverEnabled,false);check(raced.subscription,null);
const tabs=setup({stored:saved,existing:true});await flush();tabs.faults.deferReceipt=true;void tabs.api.recover();await flush();
tabs.storage.set('points-push-device-v1',JSON.stringify({...saved,enabled:false,pendingRemoval:true}));tabs.emit('storage',{key:'points-push-device-v1'});
tabs.resolve({data:{enabled:true}});await flush();check(tabs.record.enabled,false);check(tabs.subscription,null);check(tabs.serverEnabled,false);
const writeRace=setup({stored:saved,existing:true});await flush();writeRace.serverEnabled=false;writeRace.faults.deferRegister=true;void writeRace.api.recover();await flush();
writeRace.storage.set('points-push-device-v1',JSON.stringify({...saved,enabled:false,pendingRemoval:false,binding:null}));writeRace.emit('storage',{key:'points-push-device-v1'});
writeRace.finishRegister();await flush();check(writeRace.record.enabled,false);check(writeRace.serverEnabled,false);check(writeRace.subscription,null);
// Missing or re-keyed browser subscriptions require a user gesture; automatic recovery never subscribes.
const missing=setup({stored:saved,permission:'granted'});await flush();check(missing.subscribes,0);check(missing.permissions,0);check(missing.ids.get('pointsPushStatus').textContent,'订阅需要恢复');
missing.ids.get('pointsPushEnable').click();await flush();check(missing.subscribes,1);check(missing.permissions,0);check(missing.ids.get('pointsPushStatus').textContent,'已开启');
const changedKey=setup({stored:saved,existing:true,oldKey:'C'+'A'.repeat(86)});await flush();check(changedKey.unsubscribes,0);check(changedKey.ids.get('pointsPushStatus').textContent,'订阅需要恢复');
changedKey.ids.get('pointsPushEnable').click();await flush();check(changedKey.unsubscribes,1);check(changedKey.subscribes,1);check(changedKey.ids.get('pointsPushStatus').textContent,'已开启');
const denied=setup({stored:saved,permission:'denied'});await flush();check(denied.permissions,0);check(denied.subscribes,0);check(denied.ids.get('pointsPushEnable').disabled,true);check(denied.ids.get('pointsPushStatus').textContent,'系统已关闭');
const revoked=setup({stored:saved,existing:true,verified:false});await flush();check(revoked.calls.length,0);check(revoked.subscribes,0);check(revoked.record.enabled,true);
// Storage failures must not create an unowned server/browser subscription.
const noStore=setup();await flush();noStore.faults.store=true;noStore.ids.get('pointsPushEnable').click();await flush();check(noStore.permissions,0);check(noStore.subscribes,0);check(noStore.calls.length,0);
const initialize=setup({configured:false});await flush();check(initialize.ids.get('pointsPushInitialize').hidden,false);initialize.ids.get('pointsPushInitialize').click();await flush();check(initialize.ids.get('pointsPushInitialize').hidden,true);check(initialize.permissions,0);
console.log(`${checks} push startup/upgrade/offline/identity/intent/race/permission recovery checks passed.`);
