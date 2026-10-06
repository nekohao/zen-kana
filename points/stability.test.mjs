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
  window.__sdkInitializations=(window.__sdkInitializations||0)+1;
  window.__counts={}; window.__modes={};
  window.__startingWeightJin=160;
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
    if(name==='points_fat_admin_get_settings' && __modes[name]==='deferred') {
      const result=await new Promise(resolve=>{window.__resolveStartingRead=()=>resolve({data:[{starting_weight_jin:window.__startingWeightJin}],error:null});});
      window.__deferredReadFinished=true;return result;
    }
    if(name==='points_preview_wheel') return {data:[{prize_amount:30,roll:42}],error:null};
    if(name==='points_fat_admin_get_settings') return {data:[{starting_weight_jin:window.__startingWeightJin}],error:null};
    if(name==='points_fat_admin_set_starting_weight') {window.__startingWeightJin=args.p_weight_jin;return {data:[],error:null};}
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
    window.setTimeout=(fn,ms,...args)=>original(fn,ms===10000?1500:[15000,8000].includes(ms)?200:ms,...args);
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
    if (config.blockCss && file === "ui-theme.css") return new Promise(()=>{});
    if (config.invalidSdk && file === "vendor/supabase-2.117.2.js") return route.fulfill({body:"<!DOCTYPE html><html>cached error</html>",contentType:"text/html"});
    if (file === "vendor/supabase-2.117.2.js" && !config.realSdk) {
      return route.fulfill({contentType:"application/javascript",body:fixture+hooks});
    }
    if (file === config.missing) return route.fulfill({status:404,body:"Not found"});
    let body;
    try {body = await fs.readFile(path.join(root,file));} catch (_) {return route.fulfill({status:404,body:"Not found"});}
    if (file === "index.html" && config.modify) body = config.modify(body.toString());
    if (file === "index.html" && config.remoteBuild && url.searchParams.has('__html_fingerprint_check')) {
      body = body.toString().replace(/content="[^"]+" name="points-build"/,`content="${config.remoteBuild}" name="points-build"`);
    }
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
  check(await p.locator('#fatStartingWeightValue').innerText(),'点击查看','Admin settings never show starting weight');
  check(await p.evaluate(()=>__counts.points_fat_admin_get_settings||0),0,'Opening settings does not fetch private weight');
  await p.locator('[data-fat-unit="jin"]').click();
  check(await p.locator('#fatStartingWeightValue').innerText(),'点击查看','Unit switch cannot reveal starting weight');
  check(await p.evaluate(()=>__counts.points_fat_admin_get_settings||0),0,'Unit switch does not fetch private weight');
  await p.locator('#fatStartingWeightBtn').click();
  await until(p,()=>document.querySelector('#fatSaveWeight').textContent==='修改');
  check(await p.locator('#fatWeightInput').inputValue(),'160','Clicked dialog displays previous weight in jin');
  check(await p.locator('#fatWeightInput').evaluate(e=>e.readOnly),true,'Previous value is view-only before choosing modify');
  await p.locator('#fatCancelWeight').click();
  check(await p.locator('#fatWeightInput').inputValue(),'','Closing dialog clears private value from DOM');
  check(await p.locator('#settingsLayer').evaluate(e=>e.classList.contains('open')),true,'Cancel returns to safe settings page');
  check(await p.evaluate(()=>__counts.points_fat_admin_set_starting_weight||0),0,'View cancellation makes no write');
  await p.locator('[data-fat-unit="kg"]').click();
  await p.locator('#fatStartingWeightBtn').click();
  await until(p,()=>document.querySelector('#fatSaveWeight').textContent==='修改');
  check(await p.locator('#fatWeightInput').inputValue(),'80','Dialog converts previous weight to kilograms');
  await p.locator('#fatSaveWeight').click();
  check(await p.locator('#fatWeightInput').evaluate(e=>e.readOnly),false,'Modify enables editing');
  check(await p.evaluate(()=>__counts.points_fat_admin_set_starting_weight||0),0,'Choosing modify does not immediately write');
  await p.locator('#fatWeightInput').fill('79.5');await p.locator('#fatCancelWeight').click();
  check(await p.evaluate(()=>__startingWeightJin),160,'Canceling an edit preserves stored weight');
  await p.locator('#fatStartingWeightBtn').click();
  await until(p,()=>document.querySelector('#fatSaveWeight').textContent==='修改');
  check(await p.locator('#fatWeightInput').inputValue(),'80','Canceled edit is not reused on next view');
  await p.locator('#fatSaveWeight').click();await p.locator('#fatWeightInput').fill('79.5');
  await p.locator('#fatSaveWeight').click();
  await until(p,()=>!document.querySelector('#fatWeightLayer').classList.contains('open'));
  check(await p.evaluate(()=>__startingWeightJin),159,'Save preserves existing kilogram-to-jin API conversion');
  check(await p.evaluate(()=>__counts.points_fat_admin_set_starting_weight),1,'Confirmed edit writes once');
  check(await p.locator('#fatStartingWeightValue').innerText(),'点击查看','Saved weight remains hidden in settings');
  check(await p.locator('#fatWeightInput').inputValue(),'','Save clears private input');
  await p.evaluate(()=>{__modes.points_fat_admin_get_settings='deferred';});
  await p.locator('#fatStartingWeightBtn').click();
  await until(p,()=>typeof window.__resolveStartingRead==='function');
  await p.locator('#fatCancelWeight').click();
  await p.evaluate(()=>__resolveStartingRead());
  await until(p,()=>window.__deferredReadFinished);
  check(await p.locator('#fatWeightInput').inputValue(),'','Late read after cancel cannot repopulate private value');
  check(await p.locator('#fatStartingWeightValue').innerText(),'点击查看','Late read cannot reveal weight on settings row');
  await p.evaluate(()=>{delete __modes.points_fat_admin_get_settings;});
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
  check(await p.locator('#fatWeightInput').evaluate(e=>e.readOnly),true,'Failed read cannot silently enter edit mode');
  await p.evaluate(()=>{delete __modes.points_fat_admin_get_settings;});
  await p.locator('#fatSaveWeight').click();
  await until(p,()=>document.querySelector('#fatSaveWeight').textContent==='修改');
  check(await p.locator('#fatWeightInput').inputValue(),'79.5','Retry retrieves current weight inside dialog only');
  await p.locator("#fatCancelWeight").click();
  check(await p.locator('#fatWeightInput').inputValue(),'','Cancel after failed read also clears private input');
  await p.keyboard.press('Escape');
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
  check(await p.locator('#fatWeightInput').inputValue(),'','Auth sign-out leaves no private starting-weight value');
  await p.close();

  const guest = await open("guest");
  await until(guest,()=>document.querySelector('[data-metric="fat"]'));
  await guest.locator('#fatStartingWeightBtn').evaluate(e=>e.click());
  check(await guest.evaluate(()=>__counts.points_fat_admin_get_settings||0),0,'Guest cannot trigger private-weight read');
  await guest.evaluate(()=>{__modes.points_shop_get_state_v2="hang";});
  await guest.locator("#redeemRewardBtn").click();
  check(await guest.locator("#redeemLayer").evaluate(e=>e.classList.contains("open")),true,"Shop opens before stalled request resolves");
  await guest.keyboard.press("Escape");
  await until(guest,()=>document.querySelector("#appRecovery")?.style.display!=="none");
  check(await guest.locator("#redeemLayer").evaluate(e=>e.classList.contains("open")),false,"Late request does not reopen dismissed shop");
  await guest.close();

  const missing = await open("guest",{missing:"fat-loss.js"});
  await until(missing,()=>window.PointsStartup.status().ready);
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
  await until(stalled,()=>document.querySelector("#appRecovery")?.textContent.includes("重试启动"));
  check(await stalled.locator("#appRecovery button").isEnabled(),true,"Stalled dependency exposes working recovery action");
  await stalled.close();

  const manualConfig = {blockSdk:true};
  const manual = await open("admin",manualConfig);
  await until(manual,()=>PointsStartup.status().phase==="failed");
  check(await manual.evaluate(()=>PointsStartup.status().lastFailure),"sdk","Stalled startup identifies SDK stage");
  manualConfig.blockSdk=false;
  await manual.locator('#appRecovery button').click();
  await until(manual,()=>PointsStartup.status().ready);
  await manual.locator('#settingsBtn').click();
  check(await manual.locator('#settingsLayer').evaluate(e=>e.classList.contains('open')),true,'Retry startup restores buttons without restarting WebView');
  check(await manual.evaluate(()=>__sdkInitializations),1,'Recovered startup executes SDK only once');
  await manual.close();

  const resumeConfig = {blockSdk:true};
  const resumed = await open("admin",resumeConfig);
  await until(resumed,()=>PointsStartup.status().phase==="loading");
  await resumed.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
  check(await resumed.evaluate(()=>PointsStartup.status().phase),"paused","Backgrounding cancels unfinished startup");
  resumeConfig.blockSdk=false;
  await resumed.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
  await until(resumed,()=>PointsStartup.status().ready);
  check(await resumed.locator('#metricSwitch [data-metric]').count(),3,'Foreground resume restores three modules');
  await resumed.evaluate(()=>{for(let i=0;i<4;i++){dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));}});
  check(await resumed.evaluate(()=>__sdkInitializations),1,'Ready app does not reinitialize on repeated foreground events');
  await resumed.getByRole('button',{name:'增加积分',exact:true}).click();
  await resumed.locator('#confirmChangeBtn').click();
  await until(resumed,()=>!document.querySelector('#changeLayer').classList.contains('open'));
  check(await resumed.evaluate(()=>__counts.points_change_score),1,'Repeated resume does not duplicate write handlers');
  await resumed.close();

  const cssConfig = {blockCss:true};
  const css = await open("guest",cssConfig);
  check(await css.evaluate(()=>document.readyState!=="loading"),true,'Hanging CSS does not block HTML parser');
  await css.locator('#settingsBtn').click();
  await until(css,()=>document.querySelector('#appRecovery')?.textContent.includes('重试启动'));
  cssConfig.blockCss=false;
  await css.locator('#appRecovery button').click();
  await until(css,()=>PointsStartup.status().ready);
  await css.locator('#settingsBtn').click();
  check(await css.locator('#settingsLayer').evaluate(e=>e.classList.contains('open')),true,'Retry cancels stalled CSS load and restores controls');
  await css.close();

  const invalidConfig = {invalidSdk:true};
  const invalid = await open("guest",invalidConfig);
  await until(invalid,()=>PointsStartup.status().phase==="failed");
  invalidConfig.invalidSdk=false;
  await invalid.locator('#appRecovery button').click();
  await until(invalid,()=>PointsStartup.status().ready);
  check(await invalid.locator('#metricSwitch [data-metric]').count(),3,'Invalid cached response can be replaced without reload');
  await invalid.close();

  const updateConfig = {remoteBuild:"future",blockSdk:true};
  const updating = await open("guest",updateConfig);
  let replacedPages = 0;
  updating.on('framenavigated',frame=>{if(frame===updating.mainFrame())replacedPages++;});
  await until(updating,()=>PointsStartup.status().phase==="failed");
  updateConfig.blockSdk=false;
  await updating.locator('#appRecovery button').click();
  await until(updating,()=>PointsStartup.status().ready);
  await updating.evaluate(()=>window.__checkHtmlUpdate__());
  check(replacedPages,0,'Version checks do not replace loading/resumed WebView');
  check(await updating.locator('#appRecovery').innerText(),"新版本已准备好，请在操作完成后重新加载\n重新加载",'New build becomes an explicit update prompt');
  await updating.close();

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
    console.error(await page.evaluate(()=>({startup:window.PointsStartup?.status?.(),tabs:[...document.querySelectorAll("[data-metric]")].map(b=>[b.dataset.metric,b.getAttribute("aria-selected")]),open:[...document.querySelectorAll(".open")].map(e=>e.id),notice:document.querySelector("#appRecovery")?.textContent})));
  }
  throw error;
} finally {await browser.close();}
