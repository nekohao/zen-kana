if(window.PointsStartup.canStart()){try{
/* Unread dots stay on business pages; the notification center contains live todos only. */
(() => {
  'use strict';
  window.PointsNotifications={attach};
  function attach({db,state,els,ui,navigate}) {
    const q=id=>document.getElementById(id);
    const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const labels={score:'积分变动',kitchen:'家庭消息',withdrawal:'提现进展',assets:'道具与机会',fat:'减脂结算',service:'服务进展',security:'设备安全'};
    const routes=['score','wheel','withdrawals','assets','fat','services','devices','kitchen'];
    const bell='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
    for(const setting of [els.settingsBtn,document.querySelector('[data-family-action="settings"]')].filter(Boolean)){
      const actions=document.createElement('div');actions.className='points-top-actions';setting.before(actions);
      const button=document.createElement('button');button.type='button';button.className=setting.className+' points-todo-button';button.dataset.todoAction='open';button.setAttribute('aria-label','通知中心');
      button.innerHTML=bell+'<span class="points-todo-count" hidden></span>';actions.append(button,setting);
    }
    q('pointsApp').insertAdjacentHTML('beforeend',`<div id="pointsMessagesLayer" class="modal-layer points-todo-layer" aria-hidden="true"><section class="points-todo-panel" role="dialog" aria-modal="true" aria-labelledby="pointsTodoTitle" tabindex="-1"><header><div><p>把需要处理的事，放在一起</p><h2 id="pointsTodoTitle">通知中心 <span id="pointsTodoTotal"></span></h2></div><button type="button" data-todo-action="close" aria-label="关闭通知中心">×</button></header><div id="pointsTodoBody" class="points-todo-body"></div><footer><span>只显示待办 · 处理后自动移除</span><button type="button" data-todo-action="refresh">同步</button></footer></section></div>`);
    const todoLayer=q('pointsMessagesLayer'),todoBody=q('pointsTodoBody');
    let todos=[],todoTotal=0,todoCursor=null,todoMore=false,todoLoading=null,todoError='',todoOpen=false,todoFocus=null,todoLoaded=false;
    const prefs=document.createElement('section');prefs.id='pointsNoticeSettings';
    prefs.innerHTML=`<div class="settings-label">提醒偏好</div><div class="settings-group">${Object.entries(labels).map(([k,v])=>`<label class="settings-row static"><span>${v}</span><input type="checkbox" data-notice-category="${k}" checked aria-label="${v}推送"></label>`).join('')}<label class="settings-row static"><span>夜间静默 · 22:30–08:00</span><input type="checkbox" id="pointsNoticeQuiet" checked></label><label class="settings-row static"><span>夜间允许重要待办</span><input type="checkbox" id="pointsNoticeNight"></label></div><p class="points-push-help">新动态会在对应模块显示红点。关闭某类推送不会关闭红点；夜间静默按北京时间。</p><p id="pointsNoticePrefsStatus" class="points-push-message" role="status"></p>`;
    q('pointsPushSettings')?.after(prefs);
    let items=[],identity='',epoch=0,loading=null,prefsLoaded=false,prefsBusy=false,preference=null,pendingRoute=null,pendingTask=null;
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
      todos=[];todoTotal=0;todoCursor=null;todoMore=false;todoLoading=null;todoError='';todoLoaded=false;todoOpen=false;ui.setLayer(todoLayer,false);renderTodos();
    }
    function renderTodos(){
      document.querySelectorAll('.points-todo-count').forEach(el=>{el.hidden=!todoTotal;el.textContent=todoTotal>99?'99+':String(todoTotal);});
      q('pointsTodoTotal').textContent=todoLoaded?`${todoTotal} 项待办`:'';
      if(!todoOpen)return;
      const scroll=todoBody.scrollTop,signature=JSON.stringify([todos,todoError,todoMore,!!todoLoading,todoLoaded]);
      if(todoBody.dataset.signature===signature)return;todoBody.dataset.signature=signature;
      todoBody.innerHTML=`${todoError?`<p class="points-todo-error" role="status">${escape(todoError)}</p>`:''}${todos.map(t=>`<button class="points-todo-row" data-todo-action="item" data-todo-id="${escape(t.id)}"><span class="points-todo-symbol" aria-hidden="true">${t.route==='kitchen'?'⌂':t.route==='withdrawals'?'¥':'◇'}</span><span class="points-todo-copy"><span><strong>${escape(t.title)}</strong><small>${escape(t.status)}</small></span><p>${escape(t.body)}</p><time>${escape(new Date(t.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))} · ${escape(t.category)}</time></span><span aria-hidden="true">›</span></button>`).join('')}${!todos.length?`<div class="points-todo-empty">${bell}<strong>${todoLoading?'正在同步待办…':!todoLoaded||todoError?'待办暂未同步':'暂时没有需要处理的事情'}</strong><p>${todoLoading?'稍候就好':todoError?'请同步重试':todoLoaded?'有新的待办时，会出现在这里。':'正在确认当前状态。'}</p></div>`:''}${todoMore?`<button class="points-todo-more" data-todo-action="more"${todoLoading?' disabled':''}>${todoLoading?'正在读取…':'查看更多待办'}</button>`:''}`;
      todoBody.scrollTop=scroll;
    }
    async function loadTodos(append=false){
      if(!allowed()||document.hidden)return false;
      if(todoLoading)return todoLoading;const version=epoch,previous=todoCursor,keep=Math.max(30,todos.length);
      const work=(async()=>{try{
        let data=await rpc('points_notifications_get_todos',{p_before:append?previous:null});
        if(version!==epoch||!allowed())return false;
        if(data.admin!==state.isAdmin||!Array.isArray(data.items))throw Error('Invalid todos');
        if(!append){
          const rows=[...data.items];
          while(data.more&&rows.length<keep){
            const cursor=data.cursor;data=await rpc('points_notifications_get_todos',{p_before:cursor});
            if(version!==epoch||!allowed())return false;
            if(data.admin!==state.isAdmin||!Array.isArray(data.items)||data.more&&data.cursor===cursor)throw Error('Invalid todos');
            rows.push(...data.items);
          }
          data.items=[...new Map(rows.map(t=>[t.id,t])).values()];
        }
        todos=append?[...new Map([...todos,...data.items].map(t=>[t.id,t])).values()]:data.items;todoTotal=data.total;todoCursor=data.cursor;todoMore=data.more;todoLoaded=true;todoError='';return true;
      }catch(e){if(version===epoch)todoError=/PGRST202|42883/.test(e.code||'')?'待办中心需要安装本次配套 SQL，原有模块仍可使用。':'暂时无法同步待办，请稍后重试。';return false;}
      finally{if(todoLoading===work)todoLoading=null;if(version===epoch)renderTodos();}})();todoLoading=work;renderTodos();return work;
    }
    async function openTodos(){
      if(!allowed()||state.wheelSpinning||state.wheelRequestInFlight)return;
      todoFocus=document.activeElement;ui.closeAllLayers();ui.closeOverviewSheet();todoOpen=true;ui.setLayer(todoLayer,true);renderTodos();todoLayer.querySelector('[role="dialog"]').focus({preventScroll:true});await loadTodos();
    }
    function closeTodos(){todoOpen=false;ui.setLayer(todoLayer,false);if(todoFocus?.isConnected)todoFocus.focus({preventScroll:true});}
    async function goTodo(id){
      const selected=todos.find(t=>t.id===id);if(!selected)return;
      if(state.wheelSpinning||state.wheelRequestInFlight)return;
      // Re-read all required pages so a stale notification cannot open an obsolete action.
      if(!await loadTodos())return;
      while(!todos.some(t=>t.id===id)&&todoMore){if(!await loadTodos(true))return;}
      const current=todos.find(t=>t.id===id);if(!current)return;
      closeTodos();navigate(current.route,current.target);
      if(current.route==='kitchen')window.dispatchEvent(new CustomEvent('points:open-family-task',{detail:{id:current.target}}));
    }
    q('pointsApp').addEventListener('click',e=>{const b=e.target.closest('[data-todo-action]');if(!b||b.disabled)return;const action=b.dataset.todoAction;
      if(action==='open')void openTodos();else if(action==='close')closeTodos();else if(action==='more')void loadTodos(true);else if(action==='refresh')void loadTodos();else if(action==='item')void goTodo(b.dataset.todoId);
    });
    todoLayer.addEventListener('click',e=>{if(e.target===todoLayer)closeTodos();});
    document.addEventListener('keydown',e=>{if(!todoOpen||!todoLayer.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeTodos();}if(e.key==='Tab'){const buttons=[...todoLayer.querySelectorAll('button:not(:disabled)')].filter(b=>b.getClientRects().length);const n=buttons.indexOf(document.activeElement);if(e.shiftKey&&n<=0||!e.shiftKey&&(n<0||n===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0]?.focus();}}},true);
    window.addEventListener('points:todos-changed',()=>{void loadTodos();void load();});
    function badges() {
      const has=(...args)=>items.some(i=>i.active&&i.unread&&args.includes(routeOf(i)));
      const specs=[
        ['[data-metric="score"]',has('score','assets')],['[data-metric="wheel"]',has('wheel','withdrawals')],
        ['[data-metric="fat"]',has('fat','services')],['#redeemRewardBtn,[data-shop-view="inventory"]',has('assets')],
        ['.app-nav [data-value="world"]',has('score','wheel','withdrawals','assets','fat','services','devices')],
        ['.app-nav [data-value="kitchen"],[data-kitchen-action="tab"][data-value="orders"]',has('kitchen')],
        ['[data-fat-section="settlement"]',has('fat')],['#fatDiamondShopBtn',has('services')],['#fatServicesBtn,#fatServiceNotice,[data-fat-reward-action="services"]',has('services')],
        ['#pointsAccessDevices',has('devices')],['#settingsBtn,[data-family-action="settings"]',has('devices')],
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
        const rowsHtml=shown.map(i=>`<article class="points-context-update" data-update-id="${escape(i.id)}" data-update-epoch="${epoch}"><div><strong>${escape(i.title)}</strong><time>${escape(new Date(i.at).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</time></div><p>${escape(i.body)}</p></article>`).join('');
        const wasOpen=host.querySelector('details')?.open;
        host.innerHTML=key==='kitchen'?`<details class="kitchen-updates"${wasOpen?' open':''}><summary><span>最近动态 · ${shown.length} 条</span><strong>${escape(shown[0].title)}</strong><span aria-hidden="true">⌄</span></summary><div class="kitchen-updates-list">${rowsHtml}</div></details>`:parent.id==='fatSettlementUpdatesSlot'?`<details class="fat-context-updates"${wasOpen?' open':''}><summary>最近动态 · ${shown.length} 条</summary>${rowsHtml}</details>`:`<p class="points-updates-heading">最近动态</p>${rowsHtml}`;
        host.querySelectorAll('[data-update-id]').forEach(row=>observer.observe(row));
      }
    }
    function render() {
      if(!allowed()){badges();return;}
      mount('score',q('scoreOverviewContent'),['score']);
      mount('wheel',q('wheelOverviewContent'),['wheel','withdrawals']);
      mount('assets',q('shopInventoryPanel'),['assets']);
      const kitchen=q('kitchenUpdatesSlot')||q('kitchenContent');
      if(kitchen?.id==='kitchenUpdatesSlot')kitchen.dataset.pointsSynced=q('kitchenContent')?.dataset.pointsSynced;
      mount('kitchen',kitchen,['kitchen'],document.querySelector('[data-kitchen-action="tab"][data-value="orders"]')?.getAttribute('aria-selected')==='true');
      const reward=q('fatRewardBody');
      const settlement=q('fatSettlementUpdatesSlot');
      mount('fat-settlement',settlement,['fat']);
      mount('rewards',reward,['services'],reward?.dataset.updatesView==='services');
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
          items=Array.isArray(data.items)?data.items.slice(0,50):[];render();void loadTodos();
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
    function route(value,taskId=null) {
      if(value==='messages')value=routeOf(items.find(i=>i.active&&i.unread)||{}) || 'score';
      if(!routes.includes(value))return;
      if(!allowed()||state.wheelSpinning||state.wheelRequestInFlight){pendingRoute=value;pendingTask=taskId;return;}
      pendingRoute=null;pendingTask=null;
      navigate(value);
      if(value==='kitchen'&&/^[1-9][0-9]*$/.test(String(taskId||'')))window.dispatchEvent(new CustomEvent('points:open-family-task',{detail:{id:String(taskId)}}));
    }
    function wake() {
      if(!allowed()){reset();return;}
      void load().then(()=>{if(pendingRoute){const r=pendingRoute,t=pendingTask;pendingRoute=null;pendingTask=null;route(r,t);}});
    }
    prefs.addEventListener('change',()=>void savePreferences());els.settingsBtn.addEventListener('click',()=>void load());
    window.addEventListener('points:access-ready',wake);window.addEventListener('points:access-locked',wake);
    window.addEventListener('online',wake);document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();});
    let frame=0;
    const mutation=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;render();if(pendingRoute&&allowed()&&!state.wheelSpinning&&!state.wheelRequestInFlight){const r=pendingRoute,t=pendingTask;pendingRoute=null;pendingTask=null;route(r,t);}});});
    mutation.observe(q('pointsApp'),{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-selected','data-points-synced','data-updates-view']});
    const timer=setInterval(()=>{void load();for(const host of hosts.values())host.querySelectorAll('[data-update-id]').forEach(row=>{observer.unobserve(row);observer.observe(row);});},15000);
    navigator.serviceWorker?.addEventListener('message',e=>{if(e.data?.type==='points:open-notification'){try{const u=new URL(e.data.url,location.href);if(u.origin===location.origin&&u.pathname.startsWith(new URL('./',document.baseURI).pathname))route(u.searchParams.get('open'),u.searchParams.get('family_task'));}catch(_){}}else if(e.data?.type==='points:open-kitchen')route('kitchen');});
    const initial=new URL(location.href),requested=initial.searchParams.get('open');if(requested){pendingRoute=requested;pendingTask=initial.searchParams.get('family_task');initial.searchParams.delete('open');initial.searchParams.delete('family_task');history.replaceState(history.state,'',initial.href);}
    return {roleChanged:wake,refresh:load,stop(){clearInterval(timer);observer.disconnect();mutation.disconnect();}};
  }
})();

}catch(error){window.PointsStartup.fail("notifications",error,false);}}
