// Isolated browser regression tests. No real Supabase requests or writes.
// node points/stability.test.mjs [path-to-playwright] [path-to-Chrome]
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const {chromium} = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright");
const fixture = `(() => {
  const isAdmin = new URLSearchParams(location.search).get('role') === 'admin';
  const firstWeek = new URLSearchParams(location.search).has('first-week');
  const session = isAdmin ? {user:{id:'00000000-0000-0000-0000-000000000001',email:'local-preview@example.invalid'}} : null;
  const stored = JSON.parse(localStorage.getItem('fat_reward_preview') || 'null');
  const wallet = stored || {diamonds:3,backpack:0,services:[]};
  const operationIds = new Set(JSON.parse(localStorage.getItem('fat_reward_preview_operations') || '[]'));
  const save = () => {localStorage.setItem('fat_reward_preview',JSON.stringify(wallet));localStorage.setItem('fat_reward_preview_operations',JSON.stringify([...operationIds]));};
  const rewardState = (before) => {
    const sorted=wallet.services.slice().sort((a,b)=>Number(b.id)-Number(a.id)).filter(r=>!before || Number(r.id)<Number(before));
    const result={admin:isAdmin,services:sorted.slice(0,30),more:sorted.length>30,pending_service:wallet.services.filter(r=>r.status==='pending_service').length,pending_confirmation:wallet.services.filter(r=>r.status==='pending_confirmation').length};
    if(isAdmin) Object.assign(result,{diamonds:wallet.diamonds,backpack:wallet.backpack,next_cutoff:'2026-10-11T04:00:00Z',preview:{week:'2026-10-05',current_days:3,previous_days:7,change_jin:-1.2,eligible:true,calculated_delta:1,settled:false},weeks:[]});
    if(isAdmin && firstWeek) Object.assign(result.preview,{previous_days:0,comparison_basis:'starting_weight',reference_available:true});
    return structuredClone(result);
  };
  const db={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),getSession:async()=>({data:{session},error:null}),signOut:async()=>({error:null})},rpc:async(name,args={})=>{
    console.debug('fixture RPC',name);
    if(name==='points_is_admin') return {data:isAdmin,error:null};
    if(name==='points_get_state') return {data:[{score:100,updated_at:new Date().toISOString()}],error:null};
    if(name==='points_get_wheel_state') return {data:[{spin_chances:2,cash_balance:0}],error:null};
    if(name==='points_fat_get_state') return {data:[{configured:true,delta_jin:-3.2,recorded_at:new Date().toISOString(),record_count:10}],error:null};
    if(name==='points_fat_get_logs') return {data:Array.from({length:10},(_,i)=>({id:i+1,delta_jin:-i*.3,created_at:new Date(Date.now()-(9-i)*86400000).toISOString()})),error:null};
    if(name==='points_fat_admin_get_settings') return {data:[{starting_weight_jin:160}],error:null};
    if(name==='points_fat_reward_get_state') return {data:rewardState(args.p_before),error:null};
    if(name==='points_fat_reward_admin_exchange') {
      if(!isAdmin) return {error:{code:'42501',message:'Admin permission required'}};
      if(!operationIds.has(args.p_operation_id)) {
        if(args.p_kind==='buy') {if(wallet.diamonds<1) return {error:{code:'P0001',message:'Insufficient diamonds'}};wallet.diamonds--;wallet.backpack++;}
        else {if(wallet.backpack<1) return {error:{code:'P0001',message:'Empty backpack'}};wallet.backpack--;wallet.services.push({id:String(wallet.services.length+1),status:'pending_service',requested_at:new Date().toISOString()});}
        operationIds.add(args.p_operation_id);save();
      }
      const lossTest=new URLSearchParams(location.search).get('lose-response');
      if(lossTest && !sessionStorage.getItem('fat_preview_response_lost:'+lossTest)) {sessionStorage.setItem('fat_preview_response_lost:'+lossTest,'1');return {error:{message:'Simulated lost response'}};}
      return {data:rewardState(),error:null};
    }
    if(name==='points_fat_reward_guest_serviced') {
      const r=wallet.services.find(r=>r.id===args.p_request_id);
      if(r?.status==='pending_service') {r.status='pending_confirmation';r.serviced_at=new Date().toISOString();save();}
      return {data:rewardState(),error:null};
    }
    if(name==='points_fat_reward_admin_resolve') {
      const r=wallet.services.find(r=>r.id===args.p_request_id);
      if(r?.status==='pending_confirmation') {r.status=args.p_confirm?'completed':'returned';r.resolved_at=new Date().toISOString();if(!args.p_confirm)wallet.backpack++;save();}
      return {data:rewardState(),error:null};
    }
    if(name==='points_shop_get_state_v2') return {data:{inventory:{},weekly:{},catalog:[]},error:null};
    return {data:[],error:null};
  }};
  window.supabase={createClient:()=>db};
  addEventListener('DOMContentLoaded',()=>{const tag=document.createElement('span');tag.className='fat-preview-tag';tag.textContent='本地测试 · '+(isAdmin?'管理员':'游客');tag.style.cssText='position:fixed;top:2px;left:50%;transform:translateX(-50%);z-index:200;font:10px sans-serif;color:#638171;pointer-events:none';document.body.append(tag);});
})();`;
const hooks = `
  window.__counts={}; window.__modes={};
  const db=window.supabase.createClient(), original=db.rpc;
  window.__session=new URLSearchParams(location.search).get('role')==='admin'
    ? {user:{id:'00000000-0000-0000-0000-000000000001',email:'local-preview@example.invalid'}} : null;
  const authCallbacks=[];
  db.auth.getSession=async()=>({data:{session:window.__session},error:null});
  db.auth.onAuthStateChange=fn=>{authCallbacks.push(fn);return {data:{subscription:{unsubscribe(){}}}};};
  window.__signOut=()=>{window.__session=null;authCallbacks.forEach(fn=>fn('SIGNED_OUT',null));};
  db.rpc=async(name,args)=>{
    __counts[name]=(__counts[name]||0)+1;
    if(__modes[name]==='hang') return new Promise(()=>{});
    if(__modes[name]==='error') return {data:null,error:{code:'08006',message:'Synthetic network failure'}};
    if(__modes[name]==='slow') await new Promise(r=>setTimeout(r,80));
    if(name==='points_preview_wheel') return {data:[{prize_amount:30,roll:42}],error:null};
    const result=await original(name,args);
    if(__modes[name]==='bad-date' && result.data?.[0]) result.data[0].recorded_at='invalid';
    return result;
  };
  window.supabase.createClient=()=>db;
`;
const browser = await chromium.launch({headless:true, executablePath:process.argv[3] || undefined});
let checks = 0;
const check = (actual, expected, label) => {assert.deepEqual(actual,expected,label);checks++;};
const errors = [], outbound = [];
async function open(role="admin", config={}) {
  const page = await browser.newPage({viewport:{width:390,height:844}, reducedMotion:"reduce"});
  page.on("pageerror", error => errors.push(error.message));
  // Shorten only our explicit deadlines, not business/UI timers.
  await page.addInitScript(() => {
    const original=window.setTimeout;
    window.setTimeout=(fn,ms,...args)=>original(fn,[15000,10000,8000].includes(ms)?200:ms,...args);
  });
  await page.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (config.realSdk && url.hostname === "zrzplqwauuruyssgcwqt.supabase.co") {
      const name = url.pathname.split("/").at(-1);
      const states = {
        points_get_state:[{score:100,updated_at:new Date().toISOString()}],
        points_get_wheel_state:[{spin_chances:2,cash_balance:0}],
        points_fat_get_state:[{configured:true,delta_jin:-3.2,record_count:1,recorded_at:new Date().toISOString()}],
        points_fat_reward_get_state:{admin:false,services:[],pending_service:0,pending_confirmation:0},
        points_shop_get_state_v2:{inventory:{},weekly:{},catalog:[]},
        points_is_admin:false
      };
      return route.fulfill({contentType:"application/json",body:JSON.stringify(states[name] ?? [])});
    }
    if (url.origin !== "http://127.0.0.1:8766") {outbound.push(url.hostname);return route.abort();}
    const file = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (config.blockSdk && file === "vendor/supabase-2.117.2.js") return new Promise(()=>{});
    if (file === "vendor/supabase-2.117.2.js" && !config.realSdk) {
      return route.fulfill({contentType:"application/javascript",body:fixture+hooks});
    }
    if (file === config.missing) return route.fulfill({status:404,body:"Not found"});
    let body;
    try {body = await fs.readFile(path.join(root,file));} catch (_) {return route.fulfill({status:404,body:"Not found"});}
    if (file === "index.html" && config.modify) body = config.modify(body.toString());
    return route.fulfill({body,contentType:file.endsWith(".js")?"application/javascript":file.endsWith(".css")?"text/css":file.endsWith(".html")?"text/html":"application/octet-stream"});
  });
  await page.goto(`http://127.0.0.1:8766/?role=${role}`,{waitUntil:config.blockSdk?"commit":"load"});
  return page;
}
const until = (p,fn,arg) => p.waitForFunction(fn,arg,{timeout:5000});
try {
  const p = await open();
  await until(p,()=>document.querySelector("#fatRecordBtn")?.hidden===false);
  check(await p.locator("#metricSwitch [data-metric]").count(),3,"Three modules start without CDN");
  await p.locator("#settingsBtn").click();
  check(await p.locator("#settingsLayer").evaluate(e=>e.classList.contains("open")),true,"Settings responds");
  await p.keyboard.press("Escape");
  for (const metric of ["fat","wheel","score","fat","score","wheel","fat"]) {
    await p.locator(`[data-metric="${metric}"]`).click();
    await until(p,m=>document.querySelector(`[data-metric="${m}"]`).getAttribute("aria-selected")==="true",metric);
  }
  check(await p.locator(".fat-home-content").isVisible(),true,"Repeated switching keeps fat visible");
  await p.locator('[data-metric="wheel"]').click();
  await until(p,()=>document.querySelector('.home').classList.contains('wheel-active'));
  await p.locator('#spinWheelActionBtn').click();
  await until(p,()=>document.querySelector('#wheelPreviewLayer').classList.contains('open'));
  await p.evaluate(()=>{__modes.points_preview_wheel='slow';__counts.points_preview_wheel=0;});
  await p.locator('#wheelPreviewConfirmBtn').evaluate(e=>{e.click();e.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  await until(p,()=>document.querySelector('#wheelResultLayer').classList.contains('open'));
  check(await p.evaluate(()=>__counts.points_preview_wheel),1,'Repeated wheel submit makes one request');
  await p.locator('#wheelResultDoneBtn').click();
  await p.locator('[data-metric="fat"]').click();
  await p.evaluate(()=>{__modes.points_fat_get_state="hang";});
  await p.locator("#fatRefreshBtn").click();
  await until(p,()=>document.querySelector("#fatHomeMeta").textContent.includes("同步失败"));
  check(await p.locator("#fatRefreshBtn").evaluate(e=>e.classList.contains("refreshing")),false,"Timed-out refresh releases spinner");
  await p.locator("[data-metric=score]").click();
  await until(p,()=>document.querySelector("[data-metric=score]").getAttribute("aria-selected")==="true");
  await p.locator("#settingsBtn").click();
  check(await p.locator("#settingsLayer").evaluate(e=>e.classList.contains("open")),true,"Fat timeout does not disable settings");
  await p.keyboard.press("Escape");
  await p.evaluate(()=>{delete __modes.points_fat_get_state;});
  await p.locator("#appRecovery button").click();
  await until(p,()=>document.querySelector("#appRecovery").style.display==="none");
  check(await p.locator("#appRecovery").isVisible(),false,"Explicit retry clears network failure");
  await p.evaluate(()=>{__modes.points_fat_admin_get_settings="hang";});
  await p.locator("#settingsBtn").click();await p.locator("#fatStartingWeightBtn").click();
  await until(p,()=>document.querySelector("#fatWeightError").hidden===false);
  check(await p.locator("#fatWeightInput").isEnabled(),true,"Starting weight read timeout unlocks input");
  await p.locator("#fatCancelWeight").click();
  await p.evaluate(()=>{delete __modes.points_fat_admin_get_settings;__modes.points_change_score="slow";__counts.points_change_score=0;});
  await p.getByRole("button",{name:"增加积分",exact:true}).click();
  await p.locator("#confirmChangeBtn").evaluate(e=>{e.click();e.dispatchEvent(new MouseEvent("click",{bubbles:true}));e.dispatchEvent(new MouseEvent("click",{bubbles:true}));});
  await until(p,()=>!document.querySelector("#changeLayer").classList.contains("open"));
  check(await p.evaluate(()=>__counts.points_change_score),1,"Repeated score submit makes one write");
  await p.evaluate(()=>{__modes.points_fat_get_state="bad-date";});
  await p.locator("[data-metric=fat]").click();await p.locator("#fatRefreshBtn").click();
  await until(p,()=>document.querySelector("#fatHomeMeta").textContent.includes("时间待同步"));
  check(await p.locator(".fat-home-content").isVisible(),true,"Malformed timestamp does not crash module");
  await p.locator("#fatDiamondShopBtn").click();
  await until(p,()=>document.querySelector("#fatRewardLayer").classList.contains("open"));
  await p.evaluate(()=>{__modes.points_fat_reward_admin_exchange="hang";});
  await p.locator('[data-fat-reward-action="buy"]').click();await p.locator('[data-fat-reward-action="submit"]').click();
  await until(p,()=>document.querySelector("#fatRewardError").textContent.includes("网络异常"));
  check(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes("points_fat_operation")&&k.endsWith(":buy"))),true,"Unknown exchange outcome retains idempotency key");
  await p.keyboard.press("Escape");
  check(await p.locator("#fatRewardLayer").evaluate(e=>e.classList.contains("open")),false,"Mutation timeout unlocks reward sheet");
  await p.evaluate(()=>{__signOut();});
  await until(p,()=>document.querySelector('#adminSettings').hidden && document.querySelector('#fatRecordBtn').hidden);
  check(await p.locator('#adminSettings').evaluate(e=>e.hidden),true,'Auth sign-out immediately removes administrator UI');
  await p.close();

  const guest = await open("guest");
  await until(guest,()=>document.querySelector('[data-metric="fat"]'));
  await guest.evaluate(()=>{__modes.points_shop_get_state_v2="hang";});
  await guest.locator("#redeemRewardBtn").click();
  check(await guest.locator("#redeemLayer").evaluate(e=>e.classList.contains("open")),true,"Shop opens before stalled request resolves");
  await guest.keyboard.press("Escape");
  await until(guest,()=>document.querySelector("#appRecovery")?.style.display!=="none");
  check(await guest.locator("#redeemLayer").evaluate(e=>e.classList.contains("open")),false,"Late request does not reopen dismissed shop");
  await guest.close();

  const missing = await open("guest",{missing:"fat-loss.js"});
  await missing.locator("#settingsBtn").click();
  check(await missing.locator("#settingsLayer").evaluate(e=>e.classList.contains("open")),true,"Missing module keeps base UI usable");
  check(await missing.locator("#appRecovery").innerText(),"减脂模块加载失败，请重新加载\n重新加载","Missing module has visible recovery");
  await missing.close();

  const rewards = await open("admin",{missing:"fat-rewards.js"});
  await until(rewards,()=>document.querySelector('[data-metric="fat"]'));
  await rewards.locator('[data-metric="fat"]').click();
  check(await rewards.locator(".fat-home-content").isVisible(),true,"Missing rewards does not remove fat module");
  await rewards.close();

  const stalled = await open("guest",{blockSdk:true});
  await until(stalled,()=>document.querySelector("#appRecovery")?.textContent.includes("重新加载"));
  check(await stalled.locator("#appRecovery button").isEnabled(),true,"Stalled dependency exposes working recovery action");
  await stalled.close();

  const actualSdk = await open("guest",{realSdk:true});
  await until(actualSdk,()=>document.querySelector("#scoreValue").textContent==="100");
  await actualSdk.locator('[data-metric="fat"]').click();
  await until(actualSdk,()=>document.querySelector("#fatHomeMeta").textContent.includes("共 1 次"));
  check(await actualSdk.locator(".fat-home-content").isVisible(),true,"Real pinned SDK initializes and reads mocked REST endpoints");
  await actualSdk.close();

  const unit = await browser.newPage();
  await unit.addInitScript(()=>{const original=setTimeout;window.setTimeout=(fn,ms,...args)=>original(fn,ms===15000?30:ms,...args);});
  await unit.goto("about:blank");
  await unit.addScriptTag({content:await fs.readFile(path.join(root,"app-runtime.js"),"utf8")});
  const unitResults = await unit.evaluate(async()=>{
    let authCallback, resolveRead, calls=0, mode="normal";
    const client = PointsRuntime.protectClient({
      auth:{onAuthStateChange(fn){authCallback=fn;},getSession:()=>new Promise(()=>{})},
      rpc(name){calls++;if(mode==="hang")return new Promise(()=>{});
        if(name==="points_get_delayed")return new Promise(resolve=>{resolveRead=resolve;});
        return Promise.resolve({data:[],error:null});}
    });
    authCallback("INITIAL_SESSION",null);
    const a=client.rpc("points_get_delayed"), b=client.rpc("points_get_delayed");
    await Promise.resolve();const coalesced=calls===1;
    resolveRead({data:[1],error:null});await Promise.all([a,b]);
    const old=client.rpc("points_get_delayed");await Promise.resolve();
    authCallback("SIGNED_IN",{user:{id:"different-user"}});
    resolveRead({data:[2],error:null});const staleAuth=(await old).error.code;
    const read=client.rpc("points_get_delayed");await Promise.resolve();
    await client.rpc("points_change_score");resolveRead({data:[3],error:null});
    const staleWrite=(await read).error.code;
    mode="hang";
    const timeout=(await client.rpc("points_get_state")).error.code;
    const unknown=(await client.rpc("points_change_score")).error.code;
    const authTimeout=(await client.auth.getSession()).error.code;
    mode="normal";const recovered=(await client.rpc("points_get_state")).error===null;
    let aborted=false;
    try {await PointsRuntime.bounded(signal=>{signal.addEventListener("abort",()=>{aborted=true});return new Promise(()=>{});},10);}catch(_){}
    return {coalesced,staleAuth,staleWrite,timeout,unknown,authTimeout,recovered,aborted};
  });
  check(unitResults,{coalesced:true,staleAuth:"APP_STALE_READ",staleWrite:"APP_STALE_READ",timeout:"APP_REQUEST_TIMEOUT",unknown:"APP_RESULT_UNKNOWN",authTimeout:"APP_REQUEST_TIMEOUT",recovered:true,aborted:true},"Request merge, stale response rejection, auth deadline, unknown write and recovery");
  await unit.close();
  check(errors,[],"No unexpected browser exceptions");
  check(outbound,[],"All regression tests avoid external services");
  console.log(`PASS ${checks} stability checks`);
} catch (error) {
  console.error("Browser errors:", errors);
  for (const page of browser.contexts().flatMap(c=>c.pages())) {
    console.error(await page.evaluate(()=>({tabs:[...document.querySelectorAll("[data-metric]")].map(b=>[b.dataset.metric,b.getAttribute("aria-selected")]),open:[...document.querySelectorAll(".open")].map(e=>e.id),notice:document.querySelector("#appRecovery")?.textContent})));
  }
  throw error;
} finally {await browser.close();}
