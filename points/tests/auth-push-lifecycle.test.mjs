import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../app.js',import.meta.url),'utf8');
const authSource=source.slice(source.indexOf('      let authReadVersion ='),source.indexOf('      async function login()'));
const eventStart=source.indexOf('      db.auth.onAuthStateChange((_event, session) =>');
const eventSource=source.slice(eventStart,source.indexOf('      // -------------------- Boot',eventStart));
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const admin={user:{id:'admin-1'}};
let session=admin,sessionError=null,adminError=null,adminResult=true,resolveAdmin,defer=false,callback;
const state={session:admin,isAdmin:true,authResolved:false,overviewMode:'closed'},events=[],timers=[];
const db={auth:{getSession:async()=>({data:{session},error:sessionError}),onAuthStateChange:fn=>callback=fn},
  rpc:async()=>defer?new Promise(resolve=>resolveAdmin=resolve):{data:adminResult,error:adminError}};
const context=vm.createContext({state,db,Event,window:{dispatchEvent:e=>events.push({event:e.type,resolved:state.authResolved,admin:state.isAdmin})},
  runtime:{clear(){},report(){},unknownWrite:e=>e.code==='08006'},renderAdminState(){},loadOverviewData:async()=>{},
  console:{error(){}},setTimeout:fn=>timers.push(fn)});
vm.runInContext(authSource+eventSource+'\nthis.readAuth=refreshAuthState;',context);
sessionError={code:'08006'};await context.readAuth();
check(state.authResolved,false);check(state.isAdmin,true);check(events.length,0);
sessionError=null;defer=true;const restoring=context.readAuth();await new Promise(r=>setImmediate(r));
check(state.authResolved,false);check(events.length,0);
resolveAdmin({data:true,error:null});await restoring;defer=false;
check(state.authResolved,true);check(state.isAdmin,true);check(events.at(-1).event,'points:auth-resolved');
check(events.at(-1).resolved,true);
// Refreshing the same session leaves identity confirmed and does not resemble a logout.
callback('TOKEN_REFRESHED',admin);check(state.authResolved,true);check(state.isAdmin,true);check(timers.length,0);
// A different or signed-out identity stays unresolved until the SDK lock has been released.
callback('SIGNED_OUT',null);check(state.authResolved,false);check(state.isAdmin,false);check(timers.length,1);
session=null;await timers.shift()();await new Promise(r=>setImmediate(r));
check(state.authResolved,true);check(state.session,null);check(events.at(-1).admin,false);
// Temporary permission reads cannot confirm a new user's identity or destroy a stored push binding.
session={user:{id:'admin-2'}};callback('SIGNED_IN',session);adminError={code:'08006'};
await timers.shift()();await new Promise(r=>setImmediate(r));check(state.authResolved,false);
adminError=null;adminResult=true;await context.readAuth();check(state.authResolved,true);check(state.session.user.id,'admin-2');
console.log(`${checks} real auth callback/SDK-lock/offline/identity confirmation checks passed.`);
