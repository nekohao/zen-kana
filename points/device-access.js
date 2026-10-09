/* Permanent per-install credential in IndexedDB; only its hash lives on the server. */
(() => {
  'use strict';
  let token=null,allowed=false,controller=null;
  const adminKey='points-access-admin-v1';
  const permitted=new Set(['points_is_admin','points_access_redeem','points_access_get_device','points_push_remove']);
  window.PointsDeviceAccess={attach,credential:()=>token,allowsRpc:name=>allowed || permitted.has(name),
    lock:()=>controller?.lock('此设备的授权已失效，请使用新的验证码重新授权。',true),get verified(){return allowed;},apiOrigin:null};
  function database(){return new Promise((resolve,reject)=>{const r=indexedDB.open('points-device-access-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('credential');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function storage(write){
    const db=await database();try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction('credential',write?'readwrite':'readonly'),store=tx.objectStore('credential');
      const request=write?store.put(write,'installation'):store.get('installation');let result;
      request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(write || result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });}finally{db.close();}
  }
  function attach({db,state,els,ui,readAuth,onUnlocked,apiOrigin}){
    const q=id=>document.getElementById(id),app=document.getElementById('pointsApp');
    window.PointsDeviceAccess.apiOrigin=apiOrigin;
    const gate=document.createElement('section');gate.id='pointsAccessGate';gate.setAttribute('aria-label','小世界接入验证');
    gate.innerHTML=`<div class="points-access-card"><img src="ICON/icon-192.png" alt=""/><h1>进入我们的小世界</h1><p class="points-access-intro">管理员登录，或使用哥哥给的一次性验证码。</p>
      <button id="pointsAccessLogin" type="button" class="points-access-primary">管理员登录</button>
      <div class="points-access-divider">游客设备验证</div><label for="pointsAccessCode">一次性验证码</label><input id="pointsAccessCode" inputmode="numeric" maxlength="8" autocomplete="one-time-code" placeholder="输入 8 位验证码"/>
      <button id="pointsAccessVerify" type="button" class="points-access-primary">验证并进入</button>
      <button id="pointsAccessRetry" type="button" hidden>重新检查设备</button><p class="points-access-message" id="pointsAccessMessage" role="status" aria-live="polite">正在确认设备…</p>
      <p class="points-access-note">验证完成后，本机刷新和版本更新无需再次输入。</p></div>`;
    app.append(gate);
    const settings=document.createElement('section');settings.id='pointsAccessSettings';
    settings.innerHTML=`<div class="settings-label">游客设备接入</div><div class="settings-group"><button class="settings-row pressable" id="pointsAccessCreateCode" type="button"><span>生成一次性验证码</span><span class="chevron">›</span></button>
      <div class="points-access-code-result" id="pointsAccessCodeResult" hidden><strong id="pointsAccessGeneratedCode"></strong><p id="pointsAccessExpires"></p><button id="pointsAccessCopyCode" type="button">复制验证码</button></div>
      <button class="settings-row pressable" id="pointsAccessDevices" type="button"><span>查看已验证设备</span><span class="chevron">›</span></button><div id="pointsAccessDeviceList" hidden></div></div><p class="points-access-settings-message" id="pointsAccessSettingsMessage" role="status"></p>`;
    els.adminSettings.append(settings);
    let device=null,busy=false,checking=null,identity=null,codeTimer=0,restoring=true,revision=0;
    function key(){return state.isAdmin?'admin:'+state.session?.user?.id:state.session?'unavailable':device?.id?'guest:'+device.id:'locked';}
    function say(text){q('pointsAccessMessage').textContent=text;}
    function render(){
      gate.hidden=allowed||restoring;app.classList.toggle('points-access-locked',!allowed&&!restoring);
      app.classList.toggle('points-access-restoring',restoring&&!allowed);
      q('pointsAccessVerify').disabled=busy;q('pointsAccessLogin').disabled=busy;
      if(allowed){q('pointsAccessCode').value='';q('pointsAccessRetry').hidden=true;}
    }
    function lock(message='请验证设备后再进入。',invalidate=false){
      const wasAllowed=allowed;revision++;allowed=false;restoring=false;identity=null;
      if(invalidate&&device){device={...device,authorized:false};void storage(device).catch(()=>{});}
      render();say(message);
      // Keep a stored credential for retry; revocation is checked server-side.
      if(wasAllowed)ui.closeAllLayers();
      app.inert=false;const critical=q('kitchenCritical');if(critical)critical.hidden=true;
      window.dispatchEvent(new Event('points:access-locked'));
    }
    function unlock(){
      const next=key(),changed=!allowed || identity!==next;allowed=true;restoring=false;identity=next;render();
      if(changed){onUnlocked();window.dispatchEvent(new Event('points:access-ready'));}
    }
    async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
    async function check(){
      if(checking)return checking;
      const version=revision;
      checking=(async()=>{
        if(state.isAdmin){unlock();return;}
        if(state.session){lock('此账号没有管理员权限，请使用管理员账号登录。');return;}
        say('正在确认设备…');
        try{
          device=await storage();if(version!==revision)return;
          token=/^[a-f0-9]{64}$/.test(device?.token || '')?device.token:null;
          if(state.isAdmin){unlock();return;}
          if(!token){lock();return;}
          const receipt=await rpc('points_access_get_device');
          if(version!==revision)return;
          if(state.isAdmin){unlock();return;}
          if(state.session){lock('请使用管理员账号登录。');return;}
          if(receipt.ok && receipt.deviceId===device.id){device={...device,authorized:true};await storage(device);if(version!==revision)return;unlock();void navigator.storage?.persist?.().catch(()=>{});}
          else lock('此设备的授权已失效，请使用新的验证码重新授权。',true);
        }catch(error){
          if(version!==revision)return;
          if(state.isAdmin){unlock();return;}
          if(error.code==='APP_STALE_READ' || allowed && error.code!=='42501')return;
          lock(error.code==='42501'?'此设备尚未验证或已被撤销，请输入新的验证码。':/PGRST202|42883/.test(error.code || '')?'接入功能尚未配置，管理员可以登录。':'暂时无法确认设备，请检查网络后重试。',error.code==='42501');
          q('pointsAccessRetry').hidden=!token;
        }
      })().finally(()=>{checking=null;});return checking;
    }
    async function verify(){
      if(busy)return;const code=q('pointsAccessCode').value.trim();
      if(!/^[0-9]{8}$/.test(code)){say('请输入完整的 8 位验证码。');return;}
      busy=true;render();say('正在验证…');
      try{
        if(state.session && !state.isAdmin){await db.auth.signOut();state.session=null;}
        device=device || await storage();
        if(!/^[a-f0-9]{64}$/.test(device?.token || ''))device={id:crypto.randomUUID(),token:[...crypto.getRandomValues(new Uint8Array(32))].map(v=>v.toString(16).padStart(2,'0')).join('')};
        // Save before the request so a lost response cannot orphan a consumed code.
        await storage(device);token=device.token;
        const receipt=await rpc('points_access_redeem',{p_code:code,p_device_id:device.id,p_device_token:device.token,p_label:/iPhone|iPad/.test(navigator.userAgent)?'宝宝的 iPhone / iPad':'游客设备'});
        if(state.isAdmin){unlock();return;}
        if(state.session)throw Error('Identity changed');
        if(!receipt.ok){say(receipt.reason==='rate_limit'?'尝试较多，请一分钟后重试。':'验证码无效、已使用或已过期，请让哥哥重新生成。');return;}
        if(receipt.deviceId!==device.id)throw Error('Invalid receipt');
        device={...device,authorized:true};await storage(device);
        unlock();void navigator.storage?.persist?.().catch(()=>{});
      }catch(error){say(/PGRST202|42883/.test(error.code || '')?'请先部署设备接入增量 SQL。':'验证结果暂未确认，请联网后重试；不要清除本机数据。');q('pointsAccessRetry').hidden=!token;}
      finally{busy=false;render();}
    }
    q('pointsAccessVerify').addEventListener('click',()=>void verify());q('pointsAccessCode').addEventListener('keydown',event=>{if(event.key==='Enter')void verify();});
    q('pointsAccessRetry').addEventListener('click',()=>void check());
    q('pointsAccessLogin').addEventListener('click',()=>{ui.setLayer(els.loginLayer,true);els.emailInput.focus();});
    q('pointsAccessCreateCode').addEventListener('click',async()=>{
      const button=q('pointsAccessCreateCode');if(button.disabled)return;button.disabled=true;
      try{
        const value=await rpc('points_access_admin_code');q('pointsAccessGeneratedCode').textContent=value.code;q('pointsAccessCodeResult').hidden=false;
        clearInterval(codeTimer);const tick=()=>{const seconds=Math.max(0,Math.ceil((Date.parse(value.expiresAt)-Date.now())/1000));q('pointsAccessExpires').textContent=seconds?`单次有效 · 剩余 ${Math.ceil(seconds/60)} 分钟`:'已过期，请重新生成';};tick();codeTimer=setInterval(tick,1000);
        q('pointsAccessSettingsMessage').textContent='给宝宝输入此验证码。新码会使你之前未使用的码失效。';
      }catch(_){q('pointsAccessSettingsMessage').textContent='生成失败，请确认管理员登录及设备接入 SQL 已部署。';}
      finally{button.disabled=false;}
    });
    q('pointsAccessCopyCode').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(q('pointsAccessGeneratedCode').textContent);q('pointsAccessSettingsMessage').textContent='验证码已复制。';}catch(_){q('pointsAccessSettingsMessage').textContent='请长按上面的验证码复制。';}});
    async function listDevices(){
      const list=q('pointsAccessDeviceList');
      list.dataset.pointsSynced='false';
      try{
        const rows=await rpc('points_access_admin_devices');list.replaceChildren();list.hidden=false;
        if(!rows.length)list.textContent='还没有已验证的游客设备。';
        for(const row of rows){
          const card=document.createElement('div');card.className='points-access-device';
          const label=document.createElement('span');label.textContent=`${row.label} · ${row.revoked?'已撤销':new Date(row.verifiedAt).toLocaleDateString('zh-CN')+'验证'}`;card.append(label);
          if(!row.revoked){const button=document.createElement('button');button.type='button';button.textContent='撤销';button.addEventListener('click',async()=>{button.disabled=true;try{await rpc('points_access_admin_revoke',{p_device_id:row.id});await listDevices();}catch(_){button.disabled=false;q('pointsAccessSettingsMessage').textContent='撤销未确认，请刷新设备列表后核对。';}});card.append(button);}
          list.append(card);
        }
        list.dataset.pointsSynced='true';
      }catch(_){q('pointsAccessSettingsMessage').textContent='读取失败，请检查网络或增量 SQL。';}
    }
    q('pointsAccessDevices').addEventListener('click',()=>void listDevices());
    function authChanged(){
      if(state.isAdmin){try{localStorage.setItem(adminKey,state.session.user.id);}catch(_){}unlock();return;}
      if(state.session || identity?.startsWith('admin:')){try{localStorage.removeItem(adminKey);}catch(_){} }
      if(allowed && (identity?.startsWith('admin:') || state.session)){q('pointsAccessCodeResult').hidden=true;clearInterval(codeTimer);lock();void check();}
      else if(!allowed && !state.session && token)void check();
    }
    window.addEventListener('online',()=>void check());
    document.addEventListener('visibilitychange',()=>{if(!document.hidden && allowed && !state.isAdmin)void check();});
    controller={lock,authChanged,check,start:async()=>{
      // Read local credentials first. A credential saved before a failed enrollment is not authorization.
      const [stored,sessionResult]=await Promise.allSettled([storage(),db.auth.getSession()]);
      if(stored.status==='fulfilled'){device=stored.value;token=/^[a-f0-9]{64}$/.test(device?.token||'')?device.token:null;}
      const session=sessionResult.status==='fulfilled'?sessionResult.value.data?.session:null;
      let previousAdmin=null;try{previousAdmin=localStorage.getItem(adminKey);}catch(_){}
      if(session?.user?.id&&previousAdmin===session.user.id){state.session=session;state.isAdmin=true;ui.renderAdminState?.();unlock();}
      else if(!session&&token&&device?.authorized===true){unlock();}
      await readAuth();await check();
    }};render();return controller;
  }
})();
