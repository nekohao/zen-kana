/* Release coordinator only: no account state or business request parameters are changed. */
(() => {
 'use strict';
 const current=document.querySelector('meta[name="points-build"]').content;
 const compare=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return x[0]-y[0]||x[1]-y[1];};
 const info=document.getElementById('pointsUpdateStatus'),key='points-release-target:'+new URL(document.baseURI).pathname;
 let pending=null,available=null,installing=false,refreshStarted=false,timer=null,failures=0,lastCheck=0,started=0,epoch=0,registration=null,writes=0,target=null;
 const text=value=>{if(info)info.textContent=value;};
 try{target=JSON.parse(sessionStorage.getItem(key)||'null');if(target&&compare(current,target.build)>=0&&window.PointsStartup.status().ready&&!window.PointsReleaseLoadFailed){text('已更新至 '+current);sessionStorage.removeItem(key);target=null;}}
 catch(_){target=null;}
 try{const url=new URL(location.href);url.searchParams.delete('__app_refresh');url.searchParams.delete('__points_target');history.replaceState(history.state,'',url.href);}catch(_){}
 // Observe request completion without changing URLs, headers, bodies, responses or retries.
 const originalFetch=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const method=String(init?.method||input?.method||'GET').toUpperCase(),write=!['GET','HEAD'].includes(method);
  if(write)writes++;
  let result;try{result=originalFetch(input,init);}catch(error){if(write)writes--;throw error;}
  return write?Promise.resolve(result).finally(()=>writes--):result;
 };
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 function retry(){
  if(timer!==null||refreshStarted)return;
  const delay=Math.min(60000,5000*2**Math.min(failures++,4));
  timer=setTimeout(()=>{timer=null;if(!document.hidden)void check(true);},delay);
 }
 function call(worker,type,data={},timeout=4000){
  return new Promise((resolve,reject)=>{
   const channel=new MessageChannel(),deadline=setTimeout(()=>{channel.port1.close();reject(Error('Worker response timeout'));},timeout);
   channel.port1.onmessage=event=>{clearTimeout(deadline);channel.port1.close();event.data?.ok?resolve(event.data):reject(Error(event.data?.error||'Update not ready'));};
   try{worker.postMessage({type,...data},[channel.port2]);}catch(error){clearTimeout(deadline);channel.port1.close();reject(error);}
  });
 }
 async function worker(token){
  if(!('serviceWorker' in navigator)||!isSecureContext)throw Error('Offline updater unavailable');
  if(!registration){let timeout;try{registration=await Promise.race([navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}),new Promise((_,reject)=>timeout=setTimeout(()=>reject(Error('Worker registration timeout')),20000))]);}finally{clearTimeout(timeout);}}
  if(!navigator.serviceWorker.controller)void registration.update?.().catch(()=>{});
  const until=Date.now()+90000;
  while(Date.now()<until&&token===epoch){
   const candidate=navigator.serviceWorker.controller||registration.active;
   if(candidate){try{const response=await call(candidate,'points:ping',{},1800);if(response.protocol===2)return candidate;}catch(_){void registration.update?.().catch(()=>{});} }
   if(document.hidden)throw Error('Page hidden');await pause(500);
  }
  throw Error('Updater is still installing');
 }
 async function idle(token){
  const until=Date.now()+45000;
  while(writes&&Date.now()<until&&token===epoch){text('新版本已下载，等待当前请求结束…');await pause(250);}
  if(writes||document.hidden||token!==epoch)throw Error('Update deferred');
  await pause(200);if(writes||document.hidden||token!==epoch)throw Error('Update deferred');
 }
 async function install(token=epoch){
  if(installing||refreshStarted||!available)return;
  installing=true;
  try{
   text('正在准备版本 '+available.build+'…');
   const controller=await worker(token);
   const result=await call(controller,'points:prepare-release',{release:available},180000);
   if(token!==epoch)return;
   if(result.build!==available.build)throw Error('Prepared release mismatch');
   await idle(token);
   const attempts=target?.build===available.build?(target.attempts||0)+1:1;
   if(attempts>3){text('更新后版本未生效，请点击检查更新重试');return;}
   target={build:available.build,attempts};try{sessionStorage.setItem(key,JSON.stringify(target));}catch(_){}
   window.dispatchEvent(new Event('points:before-update'));
   const url=new URL(location.href);url.searchParams.set('__points_target',result.build);
   refreshStarted=true;clearTimeout(timer);timer=null;location.replace(url.href);
  }catch(error){if(token===epoch){text(navigator.onLine===false?'网络未连接，联网后继续更新':'更新暂未完成，已下载文件会保留并自动重试');retry();}}
  finally{if(token===epoch)installing=false;}
 }
 async function check(manual=false){
  if(refreshStarted||document.hidden)return;
  if(pending)return pending;
  if(!manual&&Date.now()-lastCheck<15000)return;
  lastCheck=Date.now();started=lastCheck;const token=epoch;
  if(navigator.onLine===false){text('网络未连接，当前版本仍可使用');retry();return;}
  const work=(async()=>{
   const controller=new AbortController(),deadline=setTimeout(()=>controller.abort(),10000);
   try{
    text('正在检查更新…');
    const url=new URL('version.json',document.baseURI);url.searchParams.set('check',Date.now());
    const response=await fetch(url,{cache:'no-store',signal:controller.signal,credentials:'same-origin'});
    if(!response.ok)throw Error('Manifest unavailable');const release=await response.json();
    if(token!==epoch)return;
    if(release.schema!==2||!/^\d{8}\.\d+$/.test(release.build)||!release.shell||!Array.isArray(release.assets))throw Error('Release manifest is being distributed');
    clearTimeout(deadline);
    if(target&&compare(release.build,target.build)<0){text('服务器版本尚未同步，稍后自动重试');retry();return;}
    const repair=window.PointsReleaseLoadFailed||!window.PointsStartup.status().ready;
    if(compare(release.build,current)>0||(compare(release.build,current)===0&&repair)){
     available=release;window.PointsRuntime?.clear('update');await install(token);
    }else if(compare(release.build,current)<0){text('服务器版本尚未同步，稍后自动重试');retry();}
    else{failures=0;text('当前已是最新版本 '+current);window.PointsRuntime?.clear('update');}
   }catch(_){if(token===epoch){text('暂时无法检查更新，将自动重试');retry();}}
   finally{clearTimeout(deadline);if(token===epoch)pending=null;}
  })();pending=work;return work;
 }
 function resume(){
  if(document.hidden)return;
  clearTimeout(timer);timer=null;
  if(pending&&Date.now()-started>45000){epoch++;pending=null;installing=false;}
  lastCheck=0;void check(true);
 }
 function manual(){if(target?.attempts>=3){target.attempts=0;try{sessionStorage.setItem(key,JSON.stringify(target));}catch(_){}}return check(true);}
 document.getElementById('pointsCheckUpdateBtn')?.addEventListener('click',manual);
 document.getElementById('openVersionInfoBtn')?.addEventListener('click',()=>void check(true));
 window.PointsUpdates={install:()=>install(),get available(){return available?.build||null;}};
 window.__checkHtmlUpdate__=manual;
 window.addEventListener('online',resume);window.addEventListener('pageshow',resume);
 document.addEventListener('visibilitychange',resume);
 navigator.serviceWorker?.addEventListener('controllerchange',resume);
 navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='points:release-ready'&&compare(event.data.build,current)>0)resume();});
 function poll(){setTimeout(()=>{if(refreshStarted)return;if(!document.hidden)void check();poll();},60000);}
 poll();
 setTimeout(()=>{if('serviceWorker' in navigator&&isSecureContext)navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}).then(value=>registration=value).catch(()=>{});void check();},1000);
})();
