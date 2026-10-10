import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../device-access.js',import.meta.url),'utf8');
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const flush=async()=>{for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));};
function setup({stored=null,session=null,cachedAdmin=null,launch=false,receipt={ok:true,deviceId:'device-1'},readAuth=null}={}) {
  let record=structuredClone(stored),reads=0,unlocks=0,opened=0,resolveReceipt;
  const ids=new Map(),events=[];
  class Element {
    set id(value){this._id=value;ids.set(value,this);}get id(){return this._id;}
    hidden=false;disabled=false;value='';textContent='';inert=false;style={};listeners={};children=[];
    classList={values:new Set(),toggle(name,on){on?this.values.add(name):this.values.delete(name);},contains(name){return this.values.has(name);}};
    set innerHTML(text){for(const match of text.matchAll(/id="([^"]+)"/g))ids.set(match[1],new Element());}
    setAttribute(){}append(el){this.children.push(el);}addEventListener(name,fn){this.listeners[name]=fn;}
    querySelector(){return null;}focus(){}replaceChildren(){this.children=[];}
  }
  for(const id of ['pointsApp','loginLayer','emailInput','adminSettings'])ids.set(id,new Element());
  const state={session:null,isAdmin:false};
  const storage=new Map(cachedAdmin?[['points-access-admin-v1',cachedAdmin]]:[]);
  if(launch)storage.set('points-access-launch-v1','guest');
  const indexedDB={open(){const request={};setImmediate(()=>{
    request.result={close(){},transaction(_store,mode){
      const tx={objectStore(){return {
        get(){const r={};setImmediate(()=>{r.result=structuredClone(record);r.onsuccess?.();setImmediate(()=>tx.oncomplete?.());});return r;},
        put(value){const r={};setImmediate(()=>{record=structuredClone(value);r.onsuccess?.();setImmediate(()=>tx.oncomplete?.());});return r;}
      };}};return tx;}};
    request.onsuccess();
  });return request;}};
  const listeners={};
  const window={dispatchEvent:e=>events.push(e.type),addEventListener:(name,fn)=>listeners[name]=fn};
  const db={auth:{getSession:async()=>({data:{session},error:null}),signOut:async()=>({})},rpc:async name=>{
    reads++;
    if(name==='points_access_get_device'){
      if(receipt==='slow')return new Promise(resolve=>{resolveReceipt=resolve;});
      if(receipt?.error)return {data:null,error:receipt.error};
      return {data:receipt,error:null};
    }
    return {data:{ok:true,deviceId:'device-1'},error:null};
  }};
  vm.runInNewContext(source,{window,document:{getElementById:id=>ids.get(id),createElement:()=>new Element(),body:{style:{}},addEventListener(){}},
    indexedDB,crypto,Event,navigator:{userAgent:'Desktop'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},setInterval:()=>0,clearInterval(){},console});
  const api=window.PointsDeviceAccess.attach({db,state,els:{adminSettings:ids.get('adminSettings'),loginLayer:ids.get('loginLayer'),emailInput:ids.get('emailInput')},
    ui:{closeAllLayers:()=>opened++,setLayer(){},renderAdminState(){}},apiOrigin:'https://backend.test',
    readAuth:async()=>{if(readAuth)await readAuth(state);else {state.session=session;state.isAdmin=!!session;}},onUnlocked:()=>unlocks++});
  return {api,access:window.PointsDeviceAccess,ids,state,events,listeners,storage,get record(){return record;},get reads(){return reads;},get unlocks(){return unlocks;},get closed(){return opened;},resolve:value=>resolveReceipt(value)};
}
const credential={id:'device-1',token:'a'.repeat(64),authorized:true};
const fresh=setup();check(fresh.ids.get('pointsAccessGate').hidden,true);
check(fresh.ids.get('pointsApp').classList.contains('points-access-restoring'),true);
await fresh.api.start();check(fresh.access.verified,false);check(fresh.ids.get('pointsAccessGate').hidden,false);check(fresh.reads,0);
const warm=setup({stored:credential,receipt:'slow'});const starting=warm.api.start();await flush();
check(warm.access.verified,true);check(warm.ids.get('pointsAccessGate').hidden,true);check(warm.reads,0);
await starting;check(warm.unlocks,1);check(warm.storage.get('points-access-launch-v1'),'guest');
const instant=setup({stored:credential,launch:true,receipt:'slow'});
check(instant.ids.get('pointsAccessGate').hidden,true);
check(instant.ids.get('pointsApp').classList.contains('points-access-restoring'),false);
check(instant.access.verified,false); // The display hint cannot authorize requests.
await instant.api.start();await instant.api.check();instant.listeners.online();await flush();
check(instant.reads,0);check(instant.access.verified,true);
const hintOnly=setup({launch:true});await hintOnly.api.start();
check(hintOnly.access.verified,false);check(hintOnly.ids.get('pointsAccessGate').hidden,false);
check(hintOnly.storage.has('points-access-launch-v1'),false);
const offline=setup({stored:credential,receipt:{error:{code:'08006',message:'Network unavailable'}}});
await offline.api.start();check(offline.access.verified,true);check(offline.ids.get('pointsAccessGate').hidden,true);check(offline.record.authorized,true);
const failedEnrollment=setup({stored:{...credential,authorized:false},receipt:{error:{code:'42501'}}});
await failedEnrollment.api.start();check(failedEnrollment.access.verified,false);check(failedEnrollment.unlocks,0);
const legacy=setup({stored:{id:credential.id,token:credential.token},receipt:'slow'});const legacyStart=legacy.api.start();await flush();
check(legacy.access.verified,false);check(legacy.ids.get('pointsAccessGate').hidden,true);
legacy.resolve({data:{ok:true,deviceId:'device-1'}});await legacyStart;check(legacy.record.authorized,true);check(legacy.access.verified,true);
const revoked=setup({stored:credential,receipt:{error:{code:'42501',message:'POINTS_DEVICE_REQUIRED'}}});
await revoked.api.start();check(revoked.access.verified,true);check(revoked.reads,0);
revoked.access.lock();await flush();check(revoked.access.verified,false);check(revoked.record.authorized,false);check(revoked.closed,1);
check(revoked.storage.has('points-access-launch-v1'),false);
check(revoked.ids.get('pointsAccessGate').hidden,false);
revoked.ids.get('pointsAccessCode').value='12345678';
revoked.ids.get('pointsAccessVerify').listeners.click();await flush();
check(revoked.access.verified,true);check(revoked.record.authorized,true);
check(revoked.storage.get('points-access-launch-v1'),'guest');
const raced=setup({stored:{id:credential.id,token:credential.token},receipt:'slow'});const racedStart=raced.api.start();await flush();
raced.access.lock();raced.resolve({data:{ok:true,deviceId:'device-1'}});await racedStart;await flush();
check(raced.access.verified,false);check(raced.record.authorized,false);check(raced.events.includes('points:access-locked'),true);
let finishWarmAuth;
const authRace=setup({stored:credential,launch:true,readAuth:()=>new Promise(resolve=>finishWarmAuth=resolve)});
const authRaceStart=authRace.api.start();await flush();authRace.access.lock();finishWarmAuth();await authRaceStart;await flush();
check(authRace.access.verified,false);check(authRace.reads,0);check(authRace.record.authorized,false);
const changing=setup({stored:credential,launch:true});await changing.api.start();
changing.state.session={user:{id:'another-user'}};changing.state.isAdmin=false;changing.state.authResolved=false;
changing.api.authChanged();check(changing.access.verified,true);check(changing.ids.get('pointsAccessGate').hidden,true);
changing.state.authResolved=true;changing.api.authChanged();await flush();check(changing.access.verified,false);
const adminSession={user:{id:'admin-1'}};
let finishAdmin;
const admin=setup({session:adminSession,cachedAdmin:'admin-1',readAuth:()=>new Promise(resolve=>finishAdmin=resolve)});
const adminStart=admin.api.start();await flush();check(admin.access.verified,true);check(admin.state.isAdmin,true);check(admin.ids.get('pointsAccessGate').hidden,true);
finishAdmin();await adminStart;check(admin.reads,0);
console.log(`${checks} cold/instant/warm/offline/revoked/stale-response/admin recovery checks passed.`);
