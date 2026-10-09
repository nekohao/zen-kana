/* Optional kitchen notifications. Nothing on the critical startup path. */
(() => {
  'use strict';
  window.PointsWebPush={attach};
  function attach({db,state,els,ui,backendUrl,apiKey}) {
    const q=id=>document.getElementById(id),storageKey='points-push-device-v1';
    const account=q('openVersionInfoBtn').closest('.settings-group');
    const section=document.createElement('section');section.id='pointsPushSettings';
    section.innerHTML=`<div class="settings-label">通知</div><div class="settings-group">
      <div class="settings-row static"><span>消息推送</span><span class="settings-value" id="pointsPushStatus">尚未开启</span></div>
      <button class="settings-row pressable" id="pointsPushInitialize" type="button" hidden><span>初始化推送服务</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushEnable" type="button" disabled><span>开启消息提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushDisable" type="button" hidden><span>关闭本机提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushTest" type="button" hidden><span>发送测试通知</span><span class="chevron">›</span></button>
    </div><p class="points-push-help" id="pointsPushHelp">厨房有更新时提醒，点开后查看具体内容。</p><p class="points-push-message" id="pointsPushMessage" role="status" aria-live="polite"></p>`;
    account.parentElement.insertBefore(section,account.previousElementSibling);
    let device=null,config=null,backendState=null,registration=null,busy=false,loading=false,permission='default',subscribed=false,epoch=0;
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
      q('pointsPushStatus').textContent=loading?'检查连接中':!backendState?'发送函数未连接':!backendState.sqlReady?'请先执行整合 SQL':!config?'等待管理员初始化':!available?'此处暂不支持':subscribed?'已开启':permission==='denied'?'系统已关闭':'尚未开启';
      q('pointsPushInitialize').hidden=!state.isAdmin || !backendState?.sqlReady || !!config;q('pointsPushInitialize').disabled=busy||loading;
      q('pointsPushEnable').hidden=subscribed;q('pointsPushEnable').disabled=busy || !available || !config || permission==='denied' || currentRole==='unavailable';
      q('pointsPushDisable').hidden=!subscribed && !device?.binding;q('pointsPushDisable').disabled=busy;
      q('pointsPushTest').hidden=!subscribed;q('pointsPushTest').disabled=busy;
      q('pointsPushHelp').textContent=!config?(state.isAdmin?'首次接入：执行整合 SQL → 部署一个发送函数 → 点击初始化。密钥由服务端生成保存。':'等待哥哥配置推送服务。消息中心仍可使用。'):appleBrowser() && !standalone()?'请先添加到主屏幕，再从图标打开小世界。iPhone 需 iOS 16.4 或以上。':!supported()?'当前浏览器不支持 Web Push，可在支持的浏览器中开启。':permission==='denied'?'请在系统设置中允许小世界的通知，再回来开启。':'厨房、积分和待办有更新时提醒。连续变动会合并，夜间默认静默，锁屏隐藏具体内容。';
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
          const response=await fetch(backendUrl,{headers:apiKey?{apikey:apiKey}:{},cache:'no-store',credentials:'omit',signal:controller.signal});
          const data=await response.json();if(version===epoch)backendState=data.deployed?data:null;
          if(!response.ok || !data.configured){if(version===epoch)config=null;return;}
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
      }catch(_){if(version===epoch){config=null;backendState=null;}}
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
        saveDevice({token,binding:expectedRole});subscribed=true;message('本机消息提醒已开启。可以发送一条测试通知。');
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
        if(!silent)message('本机消息提醒已关闭。');
      }catch(_){message('本机订阅关闭结果暂未确认，请联网后再次关闭。');}
      finally{busy=false;render();}
    }
    q('pointsPushEnable').addEventListener('click',()=>void enable());
    q('pointsPushInitialize').addEventListener('click',async()=>{
      if(busy||!state.isAdmin)return;busy=true;message('正在初始化…');render();
      try{const session=await db.auth.getSession();const jwt=session.data?.session?.access_token;if(!jwt)throw Error('Admin session required');
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
        try{const response=await fetch(backendUrl+'?action=initialize',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt,...(apiKey?{apikey:apiKey}:{})},body:JSON.stringify({appUrl:new URL('./',document.baseURI).href}),signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'初始化失败');message('初始化完成。现在可以在每台设备上开启消息提醒。');await inspect();}finally{clearTimeout(timer);}
      }catch(error){message(error.message==='Admin session required'?'请重新登录管理员后初始化。':error.name==='AbortError'?'初始化结果尚未确认，请重试；重复初始化不会更换密钥。':error.message||'初始化失败，请检查部署。');}
      finally{busy=false;render();}
    });
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
    device=readDevice();render();return {roleChanged};
  }
})();
