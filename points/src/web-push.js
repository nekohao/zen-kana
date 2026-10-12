/* Per-device push intent survives releases; recovery never requests system permission. */
(() => {
  'use strict';
  window.PointsWebPush={attach};
  function attach({db,state,els,backendUrl,apiKey}) {
    const q=id=>document.getElementById(id),storageKey='points-push-device-v1';
    const scope=new URL('./',document.baseURI).href;
    const account=q('openVersionInfoBtn').closest('.settings-group');
    const section=document.createElement('section');section.id='pointsPushSettings';
    section.innerHTML=`<div class="settings-label">通知</div><div class="settings-group">
      <div class="settings-row static"><span>消息推送</span><span class="settings-value" id="pointsPushStatus">正在恢复提醒</span></div>
      <button class="settings-row pressable" id="pointsPushInitialize" type="button" hidden><span>初始化推送服务</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushEnable" type="button" disabled><span id="pointsPushEnableLabel">开启消息提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushDisable" type="button" hidden><span>关闭本机提醒</span><span class="chevron">›</span></button>
      <button class="settings-row pressable" id="pointsPushTest" type="button" hidden><span>发送测试通知</span><span class="chevron">›</span></button>
    </div><p class="points-push-help" id="pointsPushHelp"></p><p class="points-push-message" id="pointsPushMessage" role="status" aria-live="polite"></p>`;
    account.parentElement.insertBefore(section,account.previousElementSibling);
    let device=readDevice(),config=null,backendState=null,registration=null;
    let busy=false,work=null,workEpoch=null,queued=false,permission='default',localActive=false,confirmed=false,syncIssue=false;
    let epoch=0,currentRole=null,retryTimer=null,storageIssue=false,needsGesture=false;
    function role(){return state.authResolved===true?(state.isAdmin?'admin:'+state.session?.user?.id:state.session?'unavailable':'guest'):null;}
    const granted=()=>window.PointsDeviceAccess?.verified===true;
    const wanted=()=>!!device?.binding&&device.enabled!==false;
    function tokenValid(value){return /^[a-f0-9]{64}$/.test(value||'');}
    function readDevice(){try{const value=JSON.parse(localStorage.getItem(storageKey)||'null');return value&&tokenValid(value.token)?value:null;}catch(_){return null;}}
    function saveDevice(value){device=value;try{localStorage.setItem(storageKey,JSON.stringify(value));storageIssue=false;return true;}catch(_){storageIssue=true;return false;}}
    function supported(){return isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
    function appleBrowser(){return /iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;}
    function standalone(){return navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;}
    const available=()=>supported()&&(!appleBrowser()||standalone());
    function message(value){q('pointsPushMessage').textContent=value;}
    function render(){
      let status;
      if(device?.enabled===false)status=device.pendingRemoval?'本机已关闭 · 待同步':'本机已关闭';
      else if(permission==='denied')status='系统已关闭';
      else if(!currentRole)status='正在恢复身份';
      else if(currentRole==='unavailable'||!granted())status='等待设备授权';
      else if(!available())status='此处暂不支持';
      else if(localActive&&wanted())status=confirmed?'已开启':'已开启 · 待同步';
      else if(wanted())status=needsGesture?'订阅需要恢复':'提醒待恢复';
      else if(work)status='检查连接中';
      else if(syncIssue)status='连接待同步';
      else if(backendState&&!backendState.sqlReady)status='请先执行整合 SQL';
      else if(backendState&&!config)status='等待管理员初始化';
      else status='尚未开启';
      q('pointsPushStatus').textContent=status;
      q('pointsPushInitialize').hidden=!state.isAdmin||!backendState?.sqlReady||!!config;
      q('pointsPushInitialize').disabled=busy||!!work||!granted();
      q('pointsPushEnable').hidden=localActive&&wanted()&&!needsGesture;
      q('pointsPushEnable').disabled=busy||!!work||!available()||!config||permission==='denied'||!currentRole||currentRole==='unavailable'||!granted()||!!device?.pendingRemoval;
      q('pointsPushEnableLabel').textContent=wanted()?'恢复消息提醒':'开启消息提醒';
      q('pointsPushDisable').hidden=!wanted()&&!device?.pendingRemoval;
      q('pointsPushDisable').disabled=busy;
      q('pointsPushTest').hidden=!confirmed||!localActive||!wanted();q('pointsPushTest').disabled=busy||!!work;
      q('pointsPushHelp').textContent=storageIssue?'本机存储暂不可用，无法保证设置保存。请恢复存储后重试。':
        device?.enabled===false?'本机提醒已关闭，刷新和版本更新不会自动重新开启。':
        appleBrowser()&&!standalone()?'请从主屏幕图标打开小世界。iPhone 需 iOS 16.4 或以上。':
        permission==='denied'?'请在系统设置中允许小世界的通知，再回来恢复。':
        needsGesture?'系统订阅已失效或推送密钥已变化，请点一次恢复消息提醒。无需重复输入设备验证码。':
        syncIssue?'连接暂未确认，已保存的提醒选择不会被清除；联网后会自动同步。':
        !config?(state.isAdmin?'首次接入：执行整合 SQL → 部署发送函数 → 初始化推送服务。':'等待哥哥配置推送服务。模块红点仍可使用。'):
        '开启一次后，刷新和版本升级会自动恢复。连续变动合并，夜间默认静默，锁屏隐藏具体内容。';
    }
    async function rpc(name,args){const result=await db.rpc(name,args);if(result.error)throw result.error;return result.data;}
    async function browserCall(fn){
      let timer;
      try{return await Promise.race([Promise.resolve().then(fn),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Browser request timeout')),10000);})]);}
      finally{clearTimeout(timer);}
    }
    const keyBytes=key=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
    function keyMatches(subscription){
      const key=subscription.options?.applicationServerKey;
      if(key)return [...new Uint8Array(key)].join(',')===[...keyBytes(config.publicKey)].join(',');
      return !device?.publicKey||device.publicKey===config.publicKey;
    }
    const same=version=>version===epoch&&role()===currentRole;
    async function getRegistration(){
      const result=supported()?await browserCall(()=>navigator.serviceWorker.getRegistration(scope)):null;
      if(result?.scope&&new URL(result.scope).href!==scope)throw Error('Wrong worker scope');
      return result;
    }
    async function backend(){
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
      try{
        const response=await fetch(backendUrl,{headers:apiKey?{apikey:apiKey}:{},cache:'no-store',credentials:'omit',signal:controller.signal});
        const data=await response.json();if(!response.ok)throw Error('Backend unavailable');
        if(data.configured){
          const app=new URL(data.appUrl);
          if(!/^[A-Za-z0-9_-]{87}$/.test(data.publicKey||'')||app.origin!==new URL(scope).origin||new URL('./',app).href!==scope)throw Error('Wrong app configuration');
        }
        return data;
      }finally{clearTimeout(timer);}
    }
    function scheduleRetry(){
      if(retryTimer!==null)return;
      retryTimer=setTimeout(()=>{retryTimer=null;if(!document.hidden&&navigator.onLine!==false)void recover();},30000);
    }
    function markOff(){
      if(!device)return;
      saveDevice({...device,enabled:false,pendingRemoval:true});localActive=false;confirmed=false;needsGesture=false;epoch++;render();
    }
    async function finishRemoval(version){
      registration=await getRegistration();if(!same(version))return;
      const local=registration?await browserCall(()=>registration.pushManager.getSubscription()):null;if(!same(version))return;
      if(local&&!await browserCall(()=>local.unsubscribe()))throw Error('Unsubscribe failed');
      if(!same(version))return;
      await rpc('points_push_remove',{p_device_token:device.token});if(!same(version))return;
      saveDevice({...device,enabled:false,binding:null,pendingRemoval:false});localActive=false;confirmed=false;syncIssue=false;
    }
    async function recover(){
      if(busy){queued=true;return;}
      const next=role();
      if(next!==currentRole){epoch++;currentRole=next;confirmed=false;localActive=false;}
      if(work){queued=queued||workEpoch!==epoch;return work;}
      if(!currentRole){render();return;}
      if(!storageIssue)device=readDevice()||device;
      // Only a resolved identity may retire a subscription belonging to another identity.
      if(wanted()&&device.binding!==currentRole)markOff();
      const version=epoch;syncIssue=false;
      const task=(async()=>{
        await Promise.resolve();
        try{
          if(device?.pendingRemoval||device?.enabled===false){await finishRemoval(version);if(!same(version))return;}
          if(currentRole==='unavailable'||!granted())return;
          permission=supported()?Notification.permission:'default';
          registration=await getRegistration();if(!same(version))return;
          const local=registration?await browserCall(()=>registration.pushManager.getSubscription()):null;if(!same(version))return;
          localActive=!!local&&permission==='granted'&&wanted();needsGesture=wanted()&&!localActive;render();
          const data=await backend();if(!same(version)||!granted())return;
          backendState=data.deployed?data:null;config=data.configured?data:null;
          if(!config||!wanted()||!localActive||device.enabled===false)return;
          if(!keyMatches(local)){needsGesture=true;localActive=false;return;}
          const receipt=await rpc('points_push_get_subscription',{p_device_token:device.token});
          if(!same(version)||!granted())return;
          const snapshot=local.toJSON();
          if(!receipt?.enabled||device.endpoint!==snapshot.endpoint){
            // Reuse the existing browser subscription; this upsert needs no new system permission.
            await rpc('points_push_register',{p_device_token:device.token,p_subscription:snapshot,p_public_key:config.publicKey,p_pairing_code:null});
            if(!same(version)||!granted())return;
          }
          confirmed=true;needsGesture=false;
          saveDevice({...device,enabled:true,publicKey:config.publicKey,endpoint:snapshot.endpoint});
        }catch(_){if(same(version)){confirmed=false;syncIssue=true;scheduleRetry();}}
        finally{if(work===task){work=null;workEpoch=null;}render();if(queued){queued=false;void recover();}}
      })();work=task;workEpoch=version;render();return task;
    }
    async function enable(){
      if(busy||work||!config||!available()||!currentRole||currentRole==='unavailable'||!granted()||device?.pendingRemoval)return;
      busy=true;message('');render();const version=epoch,expectedRole=currentRole;
      try{
        if(!device){const token=[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('');if(!saveDevice({token,binding:null,enabled:false}))throw Error('Storage unavailable');}
        // First permission request stays in the user's click; recovery never calls it.
        const result=Notification.permission==='granted'?'granted':await Notification.requestPermission();permission=result;
        if(result!=='granted'){message('没有开启通知，可以稍后再试。');return;}
        if(!same(version)||!granted())throw Error('Identity changed');
        if(!saveDevice({...device,binding:expectedRole,enabled:true,pendingRemoval:false}))throw Error('Storage unavailable');
        registration=await getRegistration()||await browserCall(()=>navigator.serviceWorker.register('sw.js',{scope:'./',updateViaCache:'none'}));
        if(!registration.active)await browserCall(()=>navigator.serviceWorker.ready);
        if(!same(version)||!granted())throw Error('Identity changed');
        let subscription=await browserCall(()=>registration.pushManager.getSubscription());
        if(subscription&&!keyMatches(subscription)){await browserCall(()=>subscription.unsubscribe());subscription=null;}
        if(!same(version)||!granted())throw Error('Identity changed');
        if(!subscription)subscription=await browserCall(()=>registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(config.publicKey)}));
        if(!same(version)||!granted()){markOff();throw Error('Identity changed');}
        if(!saveDevice({...device,publicKey:config.publicKey,endpoint:subscription.toJSON().endpoint}))throw Error('Storage unavailable');
        localActive=true;needsGesture=false;
        await rpc('points_push_register',{p_device_token:device.token,p_subscription:subscription.toJSON(),p_public_key:config.publicKey,p_pairing_code:null});
        if(!same(version)||!granted()){markOff();throw Error('Identity changed');}
        confirmed=true;syncIssue=false;message('本机消息提醒已开启。以后刷新和升级会自动恢复。');
      }catch(error){
        syncIssue=true;scheduleRetry();
        message(error.message==='Storage unavailable'?'本机设置未能保存，请恢复存储后重试。':!granted()||error.code==='42501'?'设备授权或身份已变化，请确认授权后重试。':'连接暂未确认，已保存的提醒选择会自动重试同步。');
      }finally{busy=false;render();if(queued||device?.pendingRemoval){queued=false;void recover();}}
    }
    async function disable(){
      if(busy)return;markOff();message('本机提醒已关闭。');
      // Persist the off choice before waiting for an in-flight read or the network.
      if(work)try{await work;}catch(_){}
      await recover();
      if(device?.pendingRemoval)message('本机已选择关闭，关闭同步将在联网后自动重试。');
    }
    q('pointsPushEnable').addEventListener('click',()=>void enable());
    q('pointsPushDisable').addEventListener('click',()=>void disable());
    q('pointsPushInitialize').addEventListener('click',async()=>{
      if(busy||work||!state.isAdmin||!granted())return;busy=true;message('正在初始化…');render();
      try{
        const session=await db.auth.getSession(),jwt=session.data?.session?.access_token;if(!jwt)throw Error('Admin session required');
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
        try{
          const response=await fetch(backendUrl+'?action=initialize',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+jwt,...(apiKey?{apikey:apiKey}:{})},body:JSON.stringify({appUrl:scope}),signal:controller.signal});
          const data=await response.json();if(!response.ok)throw Error(data.error||'初始化失败');message('初始化完成。可以在每台设备上开启消息提醒。');
        }finally{clearTimeout(timer);}
      }catch(error){message(error.name==='AbortError'?'初始化结果待确认，可重试；不会更换现有密钥。':error.message||'初始化失败，请检查部署。');}
      finally{busy=false;await recover();render();}
    });
    q('pointsPushTest').addEventListener('click',async()=>{
      if(busy||work||!confirmed||!device?.token||!granted())return;
      busy=true;const version=epoch;render();
      try{await rpc('points_push_test',{p_device_token:device.token});if(same(version))message('测试通知已排队，请锁屏检查。');}
      catch(_){if(same(version))message('测试未确认，请稍后重试；每分钟最多测试一次。');}
      finally{busy=false;render();if(queued){queued=false;void recover();}}
    });
    function roleChanged(){
      const next=role();if(next!==currentRole){epoch++;currentRole=next;confirmed=false;localActive=false;}
      void recover();render();
    }
    els.settingsBtn.addEventListener('click',()=>void recover());
    window.addEventListener('points:auth-resolved',roleChanged);
    window.addEventListener('points:access-ready',roleChanged);
    window.addEventListener('points:access-locked',()=>{epoch++;confirmed=false;localActive=false;render();});
    window.addEventListener('online',roleChanged);window.addEventListener('pageshow',roleChanged);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)roleChanged();});
    navigator.serviceWorker?.addEventListener('controllerchange',roleChanged);
    window.addEventListener('storage',event=>{
      if(event.key!==storageKey)return;
      epoch++;device=readDevice();confirmed=false;localActive=false;void recover();
    });
    render();if(role())void recover();
    return {roleChanged,recover};
  }
})();
