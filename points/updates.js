/* Only public release metadata and static shell are cached; never account/API data. */
(() => {
  'use strict';
  const current=document.querySelector('meta[name="points-build"]').content;
  try {
    const url=new URL(location.href);
    if(url.searchParams.has('__app_refresh')) {
      url.searchParams.delete('__app_refresh');history.replaceState(history.state,'',url.href);
    }
  } catch (_) {}
  let pending=null,lastCheck=0,available=null,installing=false,refreshStarted=false,retryTimer=null;
  const info=document.getElementById('pointsUpdateStatus');
  function text(value){if(info)info.textContent=value;}
  function retryUpdate(){if(retryTimer===null)retryTimer=setTimeout(()=>{retryTimer=null;void check(true);},15000);}
  async function install() {
    if(installing||refreshStarted||!available)return;
    installing=true;text(`正在更新至 ${available}…`);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    try {
      // Check the actual release HTML before navigating; a manifest alone can lead a CDN rollout.
      const asset=new URL('index.html',document.baseURI);asset.searchParams.set('__app_refresh',Date.now());
      const response=await fetch(asset,{cache:'no-store',signal:controller.signal,credentials:'same-origin'});
      if(!response.ok)throw Error('Release unavailable');
      const html=await response.text(),build=html.match(/content="(\d{8}\.\d+)" name="points-build"/)?.[1];
      if(build!==available || !html.includes('id="pointsApp"')){text('新版本正在分发，将自动重试');retryUpdate();return;}
      window.dispatchEvent(new Event('points:before-update'));
      const url=new URL(location.href);url.searchParams.set('__app_refresh',Date.now());
      refreshStarted=true;clearTimeout(retryTimer);retryTimer=null;
      location.replace(url.href);
    }catch(_){text(navigator.onLine===false?'网络未连接，联网后自动更新':'暂时无法下载新版本，将自动重试');retryUpdate();}
    finally{clearTimeout(timer);installing=false;}
  }
  async function check(manual=false) {
    if(refreshStarted)return;
    if(pending)return pending;
    if(!manual && Date.now()-lastCheck<60000)return;
    lastCheck=Date.now();
    if(navigator.onLine===false){if(manual)text('网络未连接，当前版本仍可使用');return;}
    pending=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
      if(manual)text('正在检查更新…');
      try {
        const url=new URL('version.json',document.baseURI);url.searchParams.set('check',Date.now());
        const res=await fetch(url,{cache:'no-store',signal:controller.signal,credentials:'same-origin'});
        if(!res.ok)throw Error('Version unavailable');
        const release=await res.json();
        if(!/^\d{8}\.\d+$/.test(release.build))throw Error('Invalid version');
        // Ignore a temporarily older CDN response; never downgrade the running app.
        const parts=v=>v.split('.').map(Number),a=parts(release.build),b=parts(current);
        if(a[0]>b[0] || a[0]===b[0] && a[1]>b[1]) {
          available=release.build;
          window.PointsRuntime?.clear('update');
          void navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});
          await install();
        } else if(available){await install();
        } else if(!available){text('当前已是最新版本');window.PointsRuntime?.clear('update');}
      } catch (_) {if(manual)text('暂时无法检查更新，请稍后重试');if(available)retryUpdate();}
      finally {clearTimeout(timer);pending=null;}
    })();
    return pending;
  }
  document.getElementById('pointsCheckUpdateBtn')?.addEventListener('click',()=>void check(true));
  document.getElementById('openVersionInfoBtn')?.addEventListener('click',()=>void check(true));
  window.PointsUpdates={install,get available(){return available;}};
  // Defer maintenance requests until after the interface has initialized.
  const maintain=()=>{
    void check();
    if('serviceWorker' in navigator && isSecureContext) {
      void navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'})
        .catch(()=>{text('当前浏览器无法启用离线界面缓存');});
    }
  };
  // Slow images must not delay installing the shell cache or checking versions.
  if(window.PointsStartup.status().ready)setTimeout(maintain,1500);
  else window.addEventListener('points:ready',()=>setTimeout(maintain,1500),{once:true});
  window.addEventListener('online',()=>void check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check();});
  window.__checkHtmlUpdate__=()=>check(true);
})();
