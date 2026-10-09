/* Updates belong to their business pages, without an inbox or interrupting banner. */
(() => {
  'use strict';
  window.PointsNotifications={attach};
  function attach({db,state,els,navigate}) {
    const q=id=>document.getElementById(id);
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const labels={score:'积分变动',kitchen:'厨房消息',withdrawal:'提现进展',assets:'道具与机会',fat:'减脂结算',service:'服务进展',security:'设备安全'};
    const routes=['score','wheel','withdrawals','assets','fat','services','devices','kitchen'];
    const prefs=document.createElement('section');prefs.id='pointsNoticeSettings';
    prefs.innerHTML=`<div class="settings-label">提醒偏好</div><div class="settings-group">${Object.entries(labels).map(([k,v])=>`<label class="settings-row static"><span>${v}</span><input type="checkbox" data-notice-category="${k}" checked aria-label="${v}推送"></label>`).join('')}<label class="settings-row static"><span>夜间静默 · 22:30–08:00</span><input type="checkbox" id="pointsNoticeQuiet" checked></label><label class="settings-row static"><span>夜间允许重要待办</span><input type="checkbox" id="pointsNoticeNight"></label></div><p class="points-push-help">新动态会在对应模块显示红点。关闭某类推送不会关闭红点；夜间静默按北京时间。</p><p id="pointsNoticePrefsStatus" class="points-push-message" role="status"></p>`;
    q('pointsPushSettings')?.after(prefs);
    let items=[],identity='',epoch=0,loading=null,prefsLoaded=false,prefsBusy=false,preference=null,pendingRoute=null;
    const pendingAcks=new Set(),hosts=new Map();
    const allowed=()=>window.PointsDeviceAccess?.verified===true;
    const currentIdentity=()=>state.isAdmin?'admin:'+state.session?.user?.id:window.PointsDeviceAccess?.credential() || 'guest';
    const routeOf=item=>routes.includes(item.route)?item.route:null;
    const visible=el=>el?.isConnected && !document.hidden && !el.closest('[hidden],[inert],[aria-hidden="true"]') && el.getClientRects().length>0;
    const observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting && entry.intersectionRatio>=.75)void acknowledge(entry.target);
    },{threshold:[.75]});
    async function rpc(name,args={}) {const result=await db.rpc(name,args);if(result.error)throw result.error;return result.data;}
    function reset() {
      epoch++;identity='';items=[];loading=null;prefsLoaded=false;preference=null;pendingAcks.clear();observer.disconnect();
      for(const host of hosts.values())host.remove();hosts.clear();badges();
    }
    function badges() {
      const has=(...args)=>items.some(i=>i.active&&i.unread&&args.includes(routeOf(i)));
      const specs=[
        ['[data-metric="score"]',has('score','assets')],['[data-metric="wheel"]',has('wheel','withdrawals')],
        ['[data-metric="fat"]',has('fat','services')],['#redeemRewardBtn,[data-shop-view="inventory"]',has('assets')],
        ['.app-nav [data-value="world"]',has('score','wheel','withdrawals','assets','fat','services','devices')],
        ['.app-nav [data-value="kitchen"],[data-kitchen-action="tab"][data-value="orders"]',has('kitchen')],
        ['#fatDiamondShopBtn',has('fat','services')],['#fatServicesBtn,#fatServiceNotice,[data-fat-reward-action="services"]',has('services')],
        ['#pointsAccessDevices',has('devices')],['#settingsBtn,[data-kitchen-action="settings"]',has('devices')],
        ['#overviewBtn',has(state.activeMetric==='wheel'?'wheel':state.activeMetric==='fat'?'fat':'score',state.activeMetric==='wheel'?'withdrawals':'')]
      ];
      for(const [selector,on] of specs)document.querySelectorAll(selector).forEach(el=>{
        if(!el.classList.contains('points-dot-anchor'))el.classList.add('points-dot-anchor');
        if(el.classList.contains('points-has-update')!==on)el.classList.toggle('points-has-update',on);
        let target=el.classList.contains('points-update-target')?el:el.querySelector('.points-update-target');
        if(!target){
          const icon=el.querySelector(':scope > svg');
          if(icon){target=document.createElement('span');target.className='points-update-target points-update-icon';el.insertBefore(target,icon);target.append(icon);}
          else {target=el.querySelector(':scope > span')||el;target.classList.add('points-update-target');}
        }
        let dot=target.querySelector(':scope > .points-update-dot');
        if(!dot){dot=document.createElement('span');dot.className='points-update-dot';dot.setAttribute('role','img');dot.setAttribute('aria-label','有新动态');target.append(dot);}
        if(dot.hidden===on)dot.hidden=!on;
      });
    }
    function mount(key,parent,routeList,enabled=true) {
      if(!parent || !enabled || parent.dataset.pointsSynced!=='true'){hosts.get(key)?.remove();hosts.delete(key);return;}
      const rows=items.filter(i=>i.active&&routeList.includes(routeOf(i)));
      const shown=[...rows.filter(i=>i.unread),...rows.filter(i=>!i.unread).slice(0,3)].slice(0,50);
      let host=hosts.get(key);
      if(!shown.length){host?.remove();hosts.delete(key);return;}
      if(!host?.isConnected){host=document.createElement('section');host.className='points-module-updates';host.dataset.updatesHost=key;parent.prepend(host);hosts.set(key,host);}
      const signature=JSON.stringify(shown.map(i=>[i.id,i.title,i.body]));
      if(host.dataset.signature!==signature){
        host.dataset.signature=signature;
        host.innerHTML=`<p class="points-updates-heading">最近动态</p>${shown.map(i=>`<article class="points-context-update" data-update-id="${escape(i.id)}" data-update-epoch="${epoch}"><div><strong>${escape(i.title)}</strong><time>${escape(new Date(i.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</time></div><p>${escape(i.body)}</p></article>`).join('')}`;
        host.querySelectorAll('[data-update-id]').forEach(row=>observer.observe(row));
      }
    }
    function render() {
      if(!allowed()){badges();return;}
      mount('score',q('scoreOverviewContent'),['score']);
      mount('wheel',q('wheelOverviewContent'),['wheel','withdrawals']);
      mount('assets',q('shopInventoryPanel'),['assets']);
      mount('kitchen',q('kitchenContent'),['kitchen'],document.querySelector('[data-kitchen-action="tab"][data-value="orders"]')?.getAttribute('aria-selected')==='true');
      const reward=q('fatRewardBody');
      mount('rewards',reward,[reward?.dataset.updatesView],!!reward?.dataset.updatesView);
      mount('devices',q('pointsAccessDeviceList'),['devices']);badges();
    }
    async function acknowledge(row) {
      if(!allowed()||!visible(row)||Number(row.dataset.updateEpoch)!==epoch)return;
      const item=items.find(i=>i.id===row.dataset.updateId && i.active && i.unread);
      if(!item || pendingAcks.has(item.id))return;
      const version=epoch;pendingAcks.add(item.id);
      try {
        await rpc('points_notifications_ack',{p_ids:[item.id],p_read:true});
        if(version!==epoch||!allowed())return;
        item.unread=false;item.presented=true;badges();
      }catch(_){}finally{if(version===epoch)pendingAcks.delete(item.id);}
    }
    function setPreferences(p) {
      prefs.querySelectorAll('[data-notice-category]').forEach(c=>c.checked=p.categories.includes(c.dataset.noticeCategory));
      q('pointsNoticeQuiet').checked=p.quiet;q('pointsNoticeNight').checked=p.nightImportant;
    }
    async function load() {
      if(!allowed()||document.hidden)return;
      const next=currentIdentity();if(next!==identity){reset();identity=next;}
      if(loading)return loading;const version=epoch;
      const task=(async()=>{
        try {
          const data=await rpc('points_notifications_get');if(version!==epoch||!allowed())return;
          items=Array.isArray(data.items)?data.items.slice(0,50):[];render();
          if(!prefsLoaded){const p=await rpc('points_notifications_preferences');if(version!==epoch||!allowed())return;preference=p;setPreferences(p);prefsLoaded=true;}
        }catch(_){}finally{if(loading===task)loading=null;}
      })();loading=task;return task;
    }
    async function savePreferences() {
      if(prefsBusy||!allowed())return;prefsBusy=true;const version=epoch;prefs.querySelectorAll('input').forEach(c=>c.disabled=true);
      try {
        const p=await rpc('points_notifications_preferences',{p_categories:[...prefs.querySelectorAll('[data-notice-category]:checked')].map(c=>c.dataset.noticeCategory),p_quiet:q('pointsNoticeQuiet').checked,p_night_important:q('pointsNoticeNight').checked});
        if(version===epoch){preference=p;q('pointsNoticePrefsStatus').textContent='已保存';}
      }catch(_){if(version===epoch){if(preference)setPreferences(preference);q('pointsNoticePrefsStatus').textContent='未能保存，请重试。';}}
      finally{prefsBusy=false;prefs.querySelectorAll('input').forEach(c=>c.disabled=false);}
    }
    function route(value) {
      if(value==='messages')value=routeOf(items.find(i=>i.active&&i.unread)||{}) || 'score';
      if(!routes.includes(value))return;
      if(!allowed()||state.wheelSpinning||state.wheelRequestInFlight){pendingRoute=value;return;}
      navigate(value);
    }
    function wake() {
      if(!allowed()){reset();return;}
      void load().then(()=>{if(pendingRoute){const r=pendingRoute;pendingRoute=null;route(r);}});
    }
    prefs.addEventListener('change',()=>void savePreferences());els.settingsBtn.addEventListener('click',()=>void load());
    window.addEventListener('points:access-ready',wake);window.addEventListener('points:access-locked',wake);
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
    let frame=0;
    const mutation=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();if(pendingRoute&&allowed()&&!state.wheelSpinning&&!state.wheelRequestInFlight){const r=pendingRoute;pendingRoute=null;route(r);}});});
    mutation.observe(q('pointsApp'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-selected','data-points-synced','data-updates-view']});
    const timer=setInterval(()=>{void load();for(const host of hosts.values())host.querySelectorAll('[data-update-id]').forEach(row=>{observer.unobserve(row);observer.observe(row);});},15000);
    navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='points:open-notification'){try{const u=new URL(e.data.url,location.href);if(u.origin===location.origin&&u.pathname.startsWith(new URL('./',document.baseURI).pathname))route(u.searchParams.get('open'));}catch(_){}}else if(e.data?.type==='points:open-kitchen')route('kitchen');});
    const initial=new URL(location.href),requested=initial.searchParams.get('open');if(requested){pendingRoute=requested;initial.searchParams.delete('open');history.replaceState(history.state,'',initial.href);}
    return {roleChanged:wake,refresh:load,stop(){clearInterval(timer);observer.disconnect();mutation.disconnect();}};
  }
})();
