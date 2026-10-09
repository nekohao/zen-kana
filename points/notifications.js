/* Durable inbox; optional, and never a startup dependency. */
(() => {
  'use strict';
  window.PointsNotifications={attach};
  function attach({db,state,els,ui,navigate}) {
    const q=id=>document.getElementById(id),escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const labels={score:'积分变动',kitchen:'厨房消息',withdrawal:'提现进展',assets:'道具与机会',fat:'减脂结算',service:'服务进展',security:'设备安全'};
    const bell='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
    for(const parent of [els.settingsBtn?.parentElement,document.querySelector('.kitchen-header')].filter(Boolean)) {
      const button=document.createElement('button');button.type='button';button.className='icon-button pressable points-message-bell';button.setAttribute('aria-label','消息');button.innerHTML=bell+'<span hidden></span>';
      parent.insertBefore(button,parent.lastElementChild);button.addEventListener('click',()=>void open());
    }
    document.body.insertAdjacentHTML('beforeend',`<div class="modal-layer points-messages-layer" id="pointsMessagesLayer" aria-hidden="true"><section class="points-messages-panel" role="dialog" aria-modal="true" aria-labelledby="pointsMessagesTitle" tabindex="-1"><header><div><p>小世界</p><h2 id="pointsMessagesTitle">消息</h2></div><button type="button" aria-label="关闭消息" data-notice="close">×</button></header><div class="points-messages-toolbar"><div role="tablist" aria-label="消息筛选"><button type="button" role="tab" aria-selected="true" data-notice="all">全部</button><button type="button" role="tab" aria-selected="false" data-notice="pending">待处理</button></div><button type="button" data-notice="read">全部已读</button></div><p id="pointsMessagesStatus" role="status"></p><div id="pointsMessagesList"></div><button class="points-messages-more" type="button" data-notice="more" hidden>查看更早消息</button></section></div><aside class="points-message-banner" id="pointsMessageBanner" hidden role="status" aria-live="polite"><button type="button" data-banner="open"><span class="points-message-banner-icon">${bell}</span><span><strong></strong><small></small></span></button><button type="button" data-banner="dismiss" aria-label="收起提醒">×</button></aside>`);
    const prefs=document.createElement('section');prefs.id='pointsNoticeSettings';prefs.innerHTML=`<div class="settings-label">消息偏好</div><div class="settings-group"><button class="settings-row pressable" type="button" id="pointsMessagesOpen"><span>消息中心</span><span class="chevron">›</span></button>${Object.entries(labels).map(([k,v])=>`<label class="settings-row static"><span>${v}</span><input type="checkbox" data-notice-category="${k}" checked aria-label="${v}推送"></label>`).join('')}<label class="settings-row static"><span>夜间静默 · 22:30–08:00</span><input type="checkbox" id="pointsNoticeQuiet" checked></label><label class="settings-row static"><span>夜间允许重要待办</span><input type="checkbox" id="pointsNoticeNight"></label></div><p class="points-push-help">关闭某类提醒后，消息仍保留在消息中心。锁屏只显示简要提示；夜间时间按北京时间。</p><p id="pointsNoticePrefsStatus" class="points-push-message" role="status"></p>`;
    q('pointsPushSettings')?.after(prefs);
    const layer=q('pointsMessagesLayer'),banner=q('pointsMessageBanner');
    let items=[],unread=0,filter='all',loading=false,more=false,available=false,identity='',epoch=0,prefsLoaded=false,prefsBusy=false,preference=null,bannerItems=[],bannerTimer,lastBanner=0,focusBefore=null,pendingRoute=null;
    const allowed=()=>window.PointsDeviceAccess?.verified===true;
    const currentIdentity=()=>state.isAdmin?'admin:'+state.session?.user?.id:window.PointsDeviceAccess?.credential() || 'guest';
    const opened=()=>layer.classList.contains('open');
    async function rpc(name,args={}){const result=await db.rpc(name,args);if(result.error)throw result.error;return result.data;}
    function badges(){document.querySelectorAll('.points-message-bell').forEach(b=>{const n=b.querySelector('span');n.hidden=!unread;n.textContent=unread>99?'99+':unread;b.setAttribute('aria-label',unread?`消息，${unread} 条未读`:'消息');});}
    function date(at){const d=new Date(at);return Number.isFinite(d.getTime())?d.toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'';}
    function render(){
      badges();const rows=items.filter(i=>filter!=='pending'||i.pending);
      q('pointsMessagesList').innerHTML=rows.length?rows.map(i=>`<button class="points-message-row ${i.unread?'unread':''}" type="button" data-message-id="${escape(i.id)}"><span class="points-message-category" data-category="${escape(i.category)}">${escape(labels[i.category]||'消息')}</span><time>${escape(date(i.at))}</time><strong>${escape(i.title)}${i.pending?'<em>待处理</em>':''}</strong><p>${escape(i.body)}</p>${!i.active?'<small>状态已有更新</small>':''}</button>`).join(''):`<div class="points-messages-empty">${loading?'正在读取消息…':available?filter==='pending'?'暂时没有待处理事项':'消息会安静地留在这里':'消息服务尚未连接'}<p>${available?'厨房、积分和其他进展，都可以在这里查看。':'请先完成整合 SQL 部署，再重试。'}</p></div>`;
      layer.querySelector('[data-notice="more"]').hidden=!more;layer.querySelector('[data-notice="more"]').disabled=loading;
      layer.querySelector('[data-notice="read"]').disabled=!unread||loading;
      layer.querySelectorAll('[role="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.notice===filter)));
    }
    async function ack(rows,read=false){if(!allowed()||!rows.length)return;const version=epoch;for(let i=0;i<rows.length;i+=50)await rpc('points_notifications_ack',{p_ids:rows.slice(i,i+50).map(r=>r.id),p_read:read});if(version!==epoch)return;rows.forEach(r=>{r.presented=true;if(read&&r.unread){r.unread=false;unread=Math.max(0,unread-1);}});render();}
    function quietNow(){const n=new Date(),minutes=(n.getUTCHours()*60+n.getUTCMinutes()+480)%1440;return preference?.quiet&&(minutes>=1350||minutes<480);}
    function dismiss(){banner.hidden=true;clearTimeout(bannerTimer);bannerItems=[];}
    function maybeBanner(){
      if(!available||opened()||!document.visibilityState.includes('visible')||document.querySelector('.modal-layer.open')||els.home?.inert||state.wheelSpinning||!allowed())return;
      const fresh=items.filter(i=>i.active&&i.alert&&!i.presented&&Date.now()-Date.parse(i.at)<120000&&preference?.categories.includes(i.category)&&(!quietNow()||i.priority===1&&preference?.nightImportant));
      if(!fresh.length || Date.now()-lastBanner<120000&&!fresh.some(i=>i.priority===1))return;
      if(!banner.hidden)return;
      bannerItems=fresh;banner.querySelector('strong').textContent=fresh.length>1?`小世界有 ${fresh.length} 项更新`:fresh[0].title;
      banner.querySelector('small').textContent=fresh.length>1?'点开消息中心查看详情':labels[fresh[0].category]+' · 点开查看';banner.hidden=false;lastBanner=Date.now();
      void ack(fresh).catch(()=>{});bannerTimer=setTimeout(dismiss,6500);
    }
    async function load(older=false){
      if(loading||!allowed()||document.hidden)return;
      const next=currentIdentity();if(next!==identity){identity=next;epoch++;items=[];unread=0;prefsLoaded=false;preference=null;dismiss();}
      const version=epoch;loading=true;render();
      try{const data=await rpc('points_notifications_get',older?{p_before:items.at(-1)?.id}:{});if(version!==epoch||!allowed())return;
        items=older?[...items,...data.items.filter(i=>!items.some(j=>j.id===i.id))]:[...data.items,...items.filter(i=>!data.items.some(j=>j.id===i.id)&&BigInt(i.id)<BigInt(data.items.at(-1)?.id||'0'))];
        unread=Number(data.unread)||0;more=data.items.length===50;available=true;q('pointsMessagesStatus').textContent='';
        if(!prefsLoaded){preference=await rpc('points_notifications_preferences');if(version!==epoch)return;setPreferences(preference);prefsLoaded=true;}
        render();if(opened())await acknowledgeVisible();else maybeBanner();
      }catch(_){if(version===epoch){q('pointsMessagesStatus').textContent='消息暂时未更新，请稍后重试。';}}
      finally{loading=false;render();}
    }
    function setPreferences(p){prefs.querySelectorAll('[data-notice-category]').forEach(c=>c.checked=p.categories.includes(c.dataset.noticeCategory));q('pointsNoticeQuiet').checked=p.quiet;q('pointsNoticeNight').checked=p.nightImportant;}
    async function acknowledgeVisible(){if(!opened()||document.hidden)return;const box=layer.querySelector('section').getBoundingClientRect(),ids=[...q('pointsMessagesList').querySelectorAll('[data-message-id]')].filter(row=>{const r=row.getBoundingClientRect();return r.bottom>box.top&&r.top<box.bottom;}).map(row=>row.dataset.messageId);await ack(items.filter(i=>!i.presented&&ids.includes(i.id)));}
    async function savePreferences(){if(prefsBusy||!allowed())return;prefsBusy=true;const version=epoch;prefs.querySelectorAll('input').forEach(c=>c.disabled=true);try{const p=await rpc('points_notifications_preferences',{p_categories:[...prefs.querySelectorAll('[data-notice-category]:checked')].map(c=>c.dataset.noticeCategory),p_quiet:q('pointsNoticeQuiet').checked,p_night_important:q('pointsNoticeNight').checked});if(version===epoch){preference=p;q('pointsNoticePrefsStatus').textContent='已保存';}}catch(_){if(preference)setPreferences(preference);q('pointsNoticePrefsStatus').textContent='未能保存，请重试。';}finally{prefsBusy=false;prefs.querySelectorAll('input').forEach(c=>c.disabled=false);}}
    async function open(){if(!allowed())return;focusBefore=document.activeElement;ui.closeAllLayers();ui.closeOverviewSheet();dismiss();ui.setLayer(layer,true);layer.querySelector('[data-notice="close"]').focus();render();await load();}
    function close(){ui.setLayer(layer,false);focusBefore?.isConnected&&focusBefore.focus({preventScroll:true});}
    async function route(value){const routes=['messages','kitchen','score','wheel','withdrawals','assets','fat','services','devices'];if(!routes.includes(value))return;if(!allowed()){pendingRoute=value;return;}if(value==='messages')await open();else{close();dismiss();navigate(value);}}
    layer.addEventListener('click',event=>{const b=event.target.closest('button');if(!b){if(event.target===layer)close();return;}const a=b.dataset.notice;
      if(a==='close')close();if(a==='all'||a==='pending'){filter=a;render();void acknowledgeVisible().catch(()=>{});}if(a==='more')void load(true);
      if(a==='read')void (async()=>{b.disabled=true;try{let page={items};for(;;){await ack(page.items,true);if(page.items.length<50)break;page=await rpc('points_notifications_get',{p_before:page.items.at(-1).id});}await load();}catch(_){q('pointsMessagesStatus').textContent='未能标记已读，请重试。';b.disabled=false;}})();
      const item=items.find(i=>i.id===b.dataset.messageId);if(item)void ack([item],true).then(()=>route(item.route)).catch(()=>q('pointsMessagesStatus').textContent='操作未完成，请重试。');
    });
    banner.querySelector('[data-banner="dismiss"]').addEventListener('click',dismiss);
    banner.querySelector('[data-banner="open"]').addEventListener('click',()=>{const rows=bannerItems.slice();dismiss();void ack(rows,true).then(()=>rows.length===1?route(rows[0].route):open()).catch(()=>void open());});
    layer.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...layer.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons.at(-1)?.focus();}else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0]?.focus();}}});
    q('pointsMessagesOpen').addEventListener('click',()=>void open());prefs.addEventListener('change',()=>void savePreferences());els.settingsBtn.addEventListener('click',()=>void load());
    let scrollTimer;layer.querySelector('section').addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>void acknowledgeVisible().catch(()=>{}),150);},{passive:true});
    function wake(){if(!allowed()){epoch++;identity='';items=[];unread=0;available=false;dismiss();close();render();return;}void load();if(pendingRoute){const r=pendingRoute;pendingRoute=null;void route(r);}}
    window.addEventListener('points:access-ready',wake);window.addEventListener('online',wake);document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss();else wake();});
    const timer=setInterval(()=>void load(),10000);window.addEventListener('pagehide',()=>{dismiss();},{passive:true});
    navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='points:open-notification'){try{const url=new URL(e.data.url,location.href);if(url.origin===location.origin)void route(url.searchParams.get('open'));}catch(_){}}else if(e.data?.type==='points:open-kitchen')void route('kitchen');});
    const initial=new URL(location.href),requested=initial.searchParams.get('open');if(requested){pendingRoute=requested;initial.searchParams.delete('open');history.replaceState(history.state,'',initial.href);}
    render();return {roleChanged:wake,refresh:load,open,stop:()=>clearInterval(timer)};
  }
})();
