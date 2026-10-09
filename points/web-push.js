/* Optional kitchen notifications. Nothing on the critical startup path. */
(() => {
  'use strict';
  window.PointsWebPush={attach};
  function attach({db,state,els,ui,backendUrl}) {
    const q=id=>document.getElementById(id),storageKey='points-push-device-v1';
    const account=q('openVersionInfoBtn').closest('.settings-group');
    const section=document.createElement('section');section.id='pointsPushSettings';
    section.innerHTML=`<div class="settings-label">通知</div><div class="settings-group">
      <div class="settings-row static"><span>厨房推送</span><span class="settings-value" id="pointsPushStatus">尚未开启</span></div>
      <button class="settings-row pressable" id="pointsPushEnable" type="button" disabled><span>开启厨房提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushDisable" type="button" hidden><span>关闭本机提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushTest" type="button" hidden><span>发送测试通知</span><span class="chevron">›</span></button>
    </div><p class="points-push-help" id="pointsPushHelp">厨房有更新时提醒，点开后查看具体内容。</p><p class="points-push-message" id="pointsPushMessage" role="status" aria-live="polite"></p>`;
    account.parentElement.insertBefore(section,account.previousElementSibling);
    let device=null,config=null,registration=null,busy=false,loading=false,permission='default',subscribed=false,epoch=0;
    let currentRole=role();
    function role(){return state.isAdmin?'admin:'+state.session?.user?.id:state.session?'unavailable':'guest';}
    function readDevice(){try{return JSON.parse(localStorage.getItem(storageKey)||'null');}catch(_){return null;}}
    function saveDevice(value){localStorage.setItem(storageKey,JSON.stringify(value));device=value;}
    function supported(){return isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;}
    function appleBrowser(){return /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform==='MacIntel' && navigator.maxTouchPoints>1;}
    function standalone(){return navigator.standalone===true || matchMedia('(display-mode: standalone)').matches;}
    function message(text){q('pointsPushMessage').textContent=text;}
    function render(){
      const available=supported() && (!appleBrowser() || standalone());
      q('pointsPushStatus').textContent=!available?'此处暂不支持':subscribed?'已开启':permission==='denied'?'系统已关闭':loading?'检查连接中':config?'尚未开启':'后端尚未连接';
      q('pointsPushEnable').hidden=subscribed;q('pointsPushEnable').disabled=busy || !available || !config || permission==='denied' || currentRole==='unavailable';
      q('pointsPushDisable').hidden=!subscribed && !device?.binding;q('pointsPushDisable').disabled=busy;
      q('pointsPushTest').hidden=!subscribed;q('pointsPushTest').disabled=busy;
      q('pointsPushHelp').textContent=appleBrowser() && !standalone()?'请先添加到主屏幕，再从图标打开小世界。iPhone 需 iOS 16.4 或以上。':!supported()?'当前浏览器不支持 Web Push，可在支持的浏览器中开启。':permission==='denied'?'请在系统设置中允许小世界的通知，再回来开启。':'厨房有更新时提醒，点开后查看具体内容。约一分钟内发送，实际送达由系统决定。';
    }
    async function rpc(name,args){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
    function deviceToken(){
      if(device?.token && /^[a-f0-9]{64}$/.test(device.token))return device.token;
      const token=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');
      saveDevice({token,binding:null});return token;
    }
    const keyBytes=key=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
    async function inspect(){
      if(loading)return;loading=true;render();const version=epoch;
      try {
        device=readDevice();permission=supported()?Notification.permission:'default';
        registration=supported()?await navigator.serviceWorker.getRegistration(new URL('./',document.baseURI).href):null;
        const local=await registration?.pushManager.getSubscription();
        if(version!==epoch)return;
        subscribed=!!local && permission==='granted' && device?.binding===currentRole;
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
        try {
          const response=await fetch(backendUrl,{cache:'no-store',credentials:'omit',signal:controller.signal});
          if(!response.ok)throw Error('Backend unavailable');const data=await response.json();
          const app=new URL(data.appUrl),scope=new URL('./',document.baseURI);
          if(!/^[A-Za-z0-9_-]{87}$/.test(data.publicKey || '') || app.origin!==scope.origin || new URL('./',app).pathname!==scope.pathname)throw Error('Wrong app configuration');
          if(version===epoch){
            config=data;
            if(subscribed && device?.token){
              const receipt=await db.rpc('points_push_get_subscription',{p_device_token:device.token});
              if(version===epoch)subscribed=!receipt.error && receipt.data?.enabled===true;
            }
          }
        }finally{clearTimeout(timer);}
      }catch(_){if(version===epoch)config=null;}
      finally{loading=false;render();}
    }
    async function enable(){
      if(busy || !config || !supported())return;
      if(currentRole==='guest' && !window.PointsDeviceAccess?.verified)return message('请先完成游客设备验证。');
      busy=true;message('');render();const version=epoch,expectedRole=currentRole;let created=null;
      try {
        const token=deviceToken();
        // Call permission synchronously from the user's click, before network waits.
        const allowed=Notification.permission==='granted'?'granted':await Notification.requestPermission();permission=allowed;
        if(allowed!=='granted'){message('没有开启通知，可以稍后再试。');return;}
        if(version!==epoch)throw Error('Identity changed');
        registration=registration || await navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'});
        if(!registration.active)await navigator.serviceWorker.ready;
        let subscription=await registration.pushManager.getSubscription();
        const expected=keyBytes(config.publicKey),old=subscription?.options?.applicationServerKey;
        if(subscription && (!device?.binding || !old || [...new Uint8Array(old)].join(',')!==[...expected].join(','))){await subscription.unsubscribe();subscription=null;}
        if(!subscription){subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expected});created=subscription;}
        await rpc('points_push_register',{p_device_token:token,p_subscription:subscription.toJSON(),p_public_key:config.publicKey,p_pairing_code:null});
        if(version!==epoch){await subscription.unsubscribe();await rpc('points_push_remove',{p_device_token:token});throw Error('Identity changed');}
        saveDevice({token,binding:expectedRole});subscribed=true;message('本机厨房提醒已开启。可以发送一条测试通知。');
      }catch(error){if(created)await created.unsubscribe().catch(()=>{});message(error.code==='42501'?'设备验证已失效，请重新完成接入验证。':'暂时无法开启。请检查网络和后端配置后重试。');}
      finally{busy=false;render();}
    }
    async function disable(silent=false){
      if(busy)return;busy=true;render();
      try {
        const local=await registration?.pushManager.getSubscription();
        if(local && !await local.unsubscribe())throw Error('Unsubscribe failed');
        subscribed=false;
        if(device?.token)await rpc('points_push_remove',{p_device_token:device.token});
        if(device)saveDevice({token:device.token,binding:null});
        if(!silent)message('本机厨房提醒已关闭。');
      }catch(_){message('本机订阅关闭结果暂未确认，请联网后再次关闭。');}
      finally{busy=false;render();}
    }
    q('pointsPushEnable').addEventListener('click',()=>void enable());
    q('pointsPushDisable').addEventListener('click',()=>void disable());
    q('pointsPushTest').addEventListener('click',async()=>{if(busy || !device?.token)return;busy=true;render();try{await rpc('points_push_test',{p_device_token:device.token});message('测试通知已排队，约一分钟内发送。锁屏也可接收。');}catch(_){message('测试未发送，请稍后重试；每分钟最多测试一次。');}finally{busy=false;render();}});
    els.settingsBtn.addEventListener('click',()=>void inspect());
    window.addEventListener('online',()=>{if(device?.binding && device.binding!==currentRole)void disable(true);});
    function roleChanged(){
      const next=role();if(next!==currentRole){epoch++;currentRole=next;subscribed=false;}
      device=readDevice();
      if(device?.binding && device.binding!==next)void (async()=>{registration=await navigator.serviceWorker?.getRegistration();await disable(true);})();
      render();
    }
    function openKitchen(){ui.closeAllLayers();document.querySelector('.app-nav [data-value="kitchen"]')?.click();}
    navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='points:open-kitchen')openKitchen();});
    const initialUrl=new URL(location.href);
    if(initialUrl.searchParams.get('open')==='kitchen'){
      const open=()=>{openKitchen();initialUrl.searchParams.delete('open');history.replaceState(history.state,'',initialUrl.href);};
      if(window.PointsStartup.status().ready)open();else window.addEventListener('points:ready',open,{once:true});
    }
    device=readDevice();render();return {roleChanged};
  }
})();
