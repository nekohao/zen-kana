/* Inline in the release HTML: no network dependency before business events bind. */
(() => {
  'use strict';
  let ready=false, banner=null, retry=null, reload=false, failure=null;
  const issues=new Set();
  const build=document.querySelector('meta[name="points-build"]').content;
  function show(message,needsReload=false) {
    if(!banner) {
      banner=document.createElement('div');banner.id='appRecovery';
      banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
      banner.style.cssText='position:fixed;z-index:9999;bottom:calc(env(safe-area-inset-bottom,0px) + 64px);left:16px;right:16px;max-width:550px;margin:auto;padding:10px 12px;border:1px solid #e8e5ec;border-radius:14px;background:#fff;color:#55515f;box-shadow:0 4px 18px #22222212;font:13px/1.5 system-ui;display:flex;align-items:center;justify-content:space-between;gap:12px';
      const text=document.createElement('span'),button=document.createElement('button');
      button.type='button';button.style.cssText='flex-shrink:0;border:0;border-radius:9px;background:#f2eff5;color:#62596d;padding:7px 10px;font:inherit';
      button.addEventListener('click',()=>{
        if(reload || !ready) {
          const url=new URL(location.href);url.searchParams.set('__app_refresh',Date.now());
          location.replace(url.href);
        } else void retry?.();
      });
      banner.append(text,button);document.body.append(banner);
    }
    banner.hidden=!message;banner.style.display=message?'flex':'none';
    banner.firstChild.textContent=message;reload=needsReload;
    banner.lastChild.textContent=needsReload || !ready?'重新加载':'重试同步';
  }
  window.PointsStartup={
    show,
    canStart:()=>!failure,
    fail(id,error,required) {
      console.error('Application module:',id,error?.name || 'Error');
      if(required) {failure=id;show(`应用初始化失败（${id} · ${build}），请重新加载`,true);}
      else issues.add(id);
    },
    ready(fn) {
      ready=true;retry=fn;show('');
      for(const issue of issues)window.PointsRuntime?.report(issue);
      window.dispatchEvent(new Event('points:ready'));
    },
    finish() {if(!ready && !failure){failure='app';show(`应用初始化失败（${build}），请重新加载`,true);}},
    status:()=>({phase:failure?'failed':ready?'ready':'loading',ready,lastFailure:failure || '',build})
  };
})();
