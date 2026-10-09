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
  let pending=null,lastCheck=0;
  const info=document.getElementById('pointsUpdateStatus');
  function text(value){if(info)info.textContent=value;}
  async function check(manual=false) {
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
          text(`新版本 ${release.build} 已发布`);
          window.PointsRuntime?.report('update');
          void navigator.serviceWorker?.getRegistration().then(r=>r?.update()).catch(()=>{});
        } else {text('当前已是最新版本');window.PointsRuntime?.clear('update');}
      } catch (_) {if(manual)text('暂时无法检查更新，请稍后重试');}
      finally {clearTimeout(timer);pending=null;}
    })();
    return pending;
  }
  document.getElementById('pointsCheckUpdateBtn')?.addEventListener('click',()=>void check(true));
  document.getElementById('openVersionInfoBtn')?.addEventListener('click',()=>void check(true));
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
