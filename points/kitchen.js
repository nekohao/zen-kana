/* Same account and score, independent kitchen pages. No production mock orders. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={pending:'待制作',completed:'待评价',settled:'已结算',rejected:'已拒绝',cancelled:'已取消'};
  const delta=stars=>[0,-1,-1,0,1,2][Number(stars)] ?? 0;
  const signed=n=>`${Number(n)>0?'+':''}${n}`;
  const starIcon=()=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.85 5.78 6.38.93-4.61 4.5 1.09 6.35L12 17.36l-5.71 3 1.09-6.35-4.61-4.5 6.38-.93Z"/></svg>';
  const dateKey=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
  const stamp=value=>value && Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'—';
  const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${name==='world'?'<path d="M12 3 3 10v10h18V10L12 3Z"/><path d="M9 20v-7h6v7"/>':name==='settings'?'<circle cx="12" cy="12" r="3"/><path d="m12 3 2 3 4 .5.5 4 2.5 2-2.5 2-.5 4-4 .5-2 3-2-3-4-.5-.5-4L3 12l2.5-2 .5-4 4-.5Z"/>':'<path d="M4 3v6a3 3 0 0 0 6 0V3M7 3v18M19 3c-4 3-4 9 0 9v9M19 3v9"/>'}</svg>`;
  function attach({db,state,els,ui}) {
    const app=document.getElementById('pointsApp'); if(app.querySelector('#kitchenPage')) throw new Error('Kitchen already attached');
    app.dataset.page='world';
    app.insertAdjacentHTML('beforeend',`<section id="kitchenPage" hidden aria-label="我们的厨房"><header class="kitchen-header"><div><h1>我们的厨房</h1><p id="kitchenGreeting">把每一餐，记在这里</p></div><button class="kitchen-icon-button" data-kitchen-action="settings" aria-label="厨房设置" type="button">${icon('settings')}</button></header><nav class="kitchen-tabs" aria-label="厨房内容" role="tablist">${[['orders','订单'],['catalog','菜谱'],['overview','总览']].map(([a,t])=>`<button data-kitchen-action="tab" data-value="${a}" aria-selected="${a==='orders'}" role="tab" type="button">${t}</button>`).join('')}</nav><div id="kitchenError" role="status" hidden></div><div id="kitchenContent"></div></section><nav class="app-nav" aria-label="主导航"><button data-kitchen-action="page" data-value="world" aria-current="page" type="button">${icon('world')}<span>小世界</span></button><button data-kitchen-action="page" data-value="kitchen" type="button">${icon('kitchen')}<span>我们的厨房</span><span class="kitchen-nav-badge" id="kitchenBadge" hidden></span></button></nav><div class="modal-layer kitchen-layer" id="kitchenLayer" aria-hidden="true"><section class="kitchen-panel" role="dialog" aria-modal="true" aria-labelledby="kitchenDialogTitle" tabindex="-1"><header class="kitchen-panel-head"><h2 id="kitchenDialogTitle"></h2><button data-kitchen-action="close" aria-label="关闭厨房窗口" type="button">×</button></header><div class="kitchen-panel-body" id="kitchenDialogBody"></div><footer class="kitchen-panel-foot" id="kitchenDialogFoot" hidden></footer></section></div>`);
    document.body.insertAdjacentHTML('beforeend',`<div class="kitchen-critical-layer" id="kitchenCritical" hidden><section class="kitchen-critical" role="alertdialog" aria-modal="true" aria-labelledby="kitchenCriticalTitle" aria-describedby="kitchenCriticalCopy" tabindex="-1"><div class="kitchen-critical-icon">${icon('kitchen')}</div><h2 id="kitchenCriticalTitle">哥哥发来了点菜请求</h2><p id="kitchenCriticalCopy">查看最新菜品后，可以制作或拒绝。</p><ul id="kitchenCriticalList"></ul><div id="kitchenCriticalError" class="kitchen-error" hidden></div><div class="kitchen-actions"><button class="kitchen-button primary" data-kitchen-action="ack-view" type="button">去查看</button><button class="kitchen-button" data-kitchen-action="ack" type="button">知道了</button></div></section></div>`);
    const q=id=>document.getElementById(id), page=q('kitchenPage'), content=q('kitchenContent'), layer=q('kitchenLayer'), body=q('kitchenDialogBody'), foot=q('kitchenDialogFoot'), critical=q('kitchenCritical');
    let ready=false, role='waiting', epoch=0, response=null, deployed=false, error='', pending=null, busy=false;
    let tab='orders', history=false, category='全部', query='', month=dateKey(new Date()).slice(0,7)+'-01', selectedDay=null, noticeFocus=null;
    let dishes=window.PointsKitchenRecipes || [], orders=[], modal=null, stack=[], previousFocus=null, notifications=[], presented=[];
    let draftTimer=0,draftQueue=Promise.resolve(),draftSerial=0,modalToken=0;
    const kitchenApi=window.PointsKitchenApi.create(db);
    const admin=()=>role.startsWith('admin:');
    const sqlRequired=new Set(['create','guest-create','edit','cancel-order','complete','reject','rate','guest-edit','guest-cancel','save-order','confirm','retry']);
    const btn=(action,text,value='',kind='',disabled=false)=>`<button class="kitchen-button ${kind}" data-kitchen-action="${action}"${value!==''?` data-value="${esc(value)}"`:''} type="button"${disabled || busy || kitchenApi.legacy && sqlRequired.has(action)?' disabled':''}>${text}</button>`;
    const empty=(title,copy='')=>`<div class="kitchen-empty"><span class="kitchen-empty-mark" aria-hidden="true">${icon('kitchen')}</span><strong>${esc(title)}</strong><p>${esc(copy)}</p></div>`;
    const status=o=>`<span class="kitchen-status ${esc(o.status)}">${labels[o.status] || '待同步'}</span>`;
    const find=id=>orders.find(o=>o.id===id) || response?.month_orders?.find(o=>o.id===id);
    function failure(e) {
      if(e?.code==='KITCHEN_PENDING_OPERATION')return '上次提交的结果待确认，请先重试原操作，再提交新的内容。';
      if(/PGRST202|42883|schema cache|Could not find/i.test(`${e?.code} ${e?.message}`)) return '厨房尚未部署。请先执行厨房 SQL，菜谱做法仍可查看。';
      if(e?.code==='40001') return '订单已被修改，请查看最新菜品后再操作。';
      if(e?.code==='42501') return '身份已变化，请重新登录或使用游客模式。';
      if(/closed for editing|already processed|not awaiting review/i.test(e?.message || '')) return '订单状态已经变化，请同步后查看。';
      if(/Score object changed/i.test(e?.message || '')) return '积分对象已变化，请先核对管理员配置。';
      return window.PointsRuntime?.unknownWrite(e)?'结果尚未确认，请重试上次提交，避免重复操作。':'同步或操作失败，请检查网络后重试。';
    }
    async function rpc(name,args={}) { const r=await kitchenApi.rpc(name,args); if(r.error) throw r.error; return r.data; }
    function renderError() { q('kitchenError').className='kitchen-error'; q('kitchenError').hidden=!error; q('kitchenError').textContent=error; }
    async function refresh({before=null,append=false}={}) {
      if(!ready || ['verifying','waiting'].includes(role) || busy) return false;
      if(pending) return pending; const token=epoch;
      content.dataset.pointsSynced='false';
      const task=(async()=>{try {
        const data=await rpc('points_kitchen_v2_get_state',{p_before:before,p_month:month});
        if(token!==epoch) return false;
        if(!data || data.admin!==admin() || !Array.isArray(data.orders) || !Array.isArray(data.dishes)) throw new Error('Invalid kitchen state');
        response=data; deployed=!kitchenApi.legacy; error=kitchenApi.legacy?'厨房升级 SQL 尚未执行，目前可以查看菜谱和已有订单。':''; dishes=data.dishes.filter(d=>window.PointsKitchenRecipes?.some(x=>x.slug===d.slug)).map(d=>({...d,image:window.PointsKitchenRecipes.find(x=>x.slug===d.slug)?.image})).sort((a,b)=>window.PointsKitchenRecipes.findIndex(x=>x.slug===a.slug)-window.PointsKitchenRecipes.findIndex(x=>x.slug===b.slug));
        orders=append?[...new Map([...orders,...data.orders].map(o=>[o.id,o])).values()]:data.orders;
        notifications=kitchenApi.legacy?[]:data.notifications || []; content.dataset.pointsSynced='true';render(); showCritical(); restoreUpdateDraft(); return true;
      } catch(e) { if(token===epoch && e.code!=='APP_STALE_READ') {error=failure(e);renderError();} return false; }
      finally {if(pending===task) pending=null;} })(); pending=task; return task;
    }
    function navigate(next) {
      if(busy || !critical.hidden) return;
      if(state.wheelSpinning || state.wheelRequestInFlight) return ui.showToast('转盘正在处理，请稍后再切换');
      closeDialog(); ui.closeAllLayers(); ui.closeOverviewSheet(); app.dataset.page=next;
      page.hidden=next!=='kitchen'; app.querySelectorAll('.app-nav button').forEach(b=>{if(b.dataset.value===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
      render(); page.scrollTop=0; if(next==='kitchen') void refresh();
    }
    function render() {
      renderError();const need=orders.filter(o=>o.status===(admin()?'completed':'pending')).length;
      q('kitchenGreeting').textContent=tab==='catalog'?'把想吃的，慢慢挑出来':tab==='overview'?'一起吃过的饭，都记得':need?`有 ${need} 餐${admin()?'等你评价':'等你制作'}`:'把每一餐，记在这里';
      // Unread dots belong to notifications; pending work remains on the order cards.
      q('kitchenBadge').hidden=true;
      page.querySelectorAll('[data-kitchen-action="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===tab)));
      if(tab==='catalog') renderCatalog(); else if(tab==='overview') renderOverview(); else renderOrders();
    }
    function mealLabel(o) {return o.origin==='guest'?`${o.meal_date || dateKey(o.created_at)} · ${o.meal || '晚饭'} · 宝宝主动记录`:`订单 #${o.id}`;}
    function orderDay(o) {return o.meal_date || dateKey(o.created_at);}
    function orderCard(o,featured=false) {
      const title=o.origin==='guest'?(o.meal||'晚饭'):'哥哥的点菜';
      const day=orderDay(o)===dateKey(new Date())?'今天':orderDay(o).slice(5).replace('-','月')+'日';
      return featured?`<button class="kitchen-featured" data-kitchen-action="order" data-value="${esc(o.id)}" type="button"><div class="kitchen-meal-top"><span>${esc(day)} · ${o.items.length} 道菜</span>${status(o)}</div><h3>${esc(title)}</h3><p class="kitchen-feature-sub">${o.origin==='guest'?'宝宝做好的这一餐':admin()?'等宝宝来制作':'哥哥点的这一餐'}</p><div class="kitchen-feature-dishes">${o.items.slice(0,3).map(d=>`<div>${dishImage(d)}<span>${esc(d.name)}</span></div>`).join('')}${o.items.length>3?`<p>另有 ${o.items.length-3} 道菜</p>`:''}</div>${o.note?`<p class="kitchen-feature-note">${esc(o.note)}</p>`:''}<div class="kitchen-feature-action"><span>${o.status==='completed'&&admin()?'查看这餐与评价':'查看这餐与要求'}</span><span aria-hidden="true">↗</span></div></button>`:`<button class="kitchen-meal-row" data-kitchen-action="order" data-value="${esc(o.id)}" type="button">${dishImage(o.items[0]||{name:'餐'})}<span class="kitchen-row-copy"><span class="kitchen-row-title">${esc(title)}${status(o)}</span><span class="kitchen-row-names">${o.items.map(d=>esc(d.name)).join('、')}</span><small>${esc(day)} · ${o.items.length} 道菜${o.status==='settled'?` · ${signed(o.score_delta)} 分`:admin()&&o.status==='pending'?` · ${o.seen_version>=o.version?'已查看':'尚未查看'}`:''}</small></span><span class="kitchen-chevron" aria-hidden="true">›</span></button>`;
    }
    function renderOrders() {
      if(role==='waiting' || role==='verifying') {content.innerHTML=empty('正在确认身份','稍候即可查看厨房');return;}
      const active=orders.filter(o=>['pending','completed'].includes(o.status)), done=orders.filter(o=>!['pending','completed'].includes(o.status));
      active.sort((a,b)=>(a.status===(admin()?'completed':'pending')?-1:1)-(b.status===(admin()?'completed':'pending')?-1:1) || Number(b.id)-Number(a.id));
      const first=active[0],needs=active.filter(o=>o.status===(admin()?'completed':'pending')).length;
      content.innerHTML=`${history?`<div class="kitchen-section-head"><h2>餐桌上的回忆</h2><button class="kitchen-link" data-kitchen-action="history" type="button">返回待办</button></div><div class="kitchen-row-group">${done.map(o=>orderCard(o)).join('')||empty('还没有历史记录')}</div>`:first?`<div class="kitchen-section-head kitchen-lead-label"><h2>${needs?'需要你处理':'等待这一餐'}</h2><span>${active.length} 餐进行中</span></div>${orderCard(first,true)}${active.length>1?`<div class="kitchen-section-head"><h2>其他进行中</h2></div><div class="kitchen-row-group">${active.slice(1).map(o=>orderCard(o)).join('')}</div>`:''}`:empty('今天的厨房很安静',admin()?'挑几道想吃的菜，发给宝宝。':'记下一餐，等哥哥来评价。')}<div class="kitchen-order-tools">${admin()?btn('create','<span aria-hidden="true">＋</span> 发起点菜','','kitchen-create',!deployed):btn('guest-create','<span aria-hidden="true">＋</span> 我做好饭啦','','kitchen-create',!deployed)}${history?'':btn('history','历史记录','','kitchen-link')}</div>${history && response?.more?btn('more-orders','查看更早订单','','kitchen-full'):''}<div id="kitchenUpdatesSlot"></div><div class="kitchen-sync-row">${btn('refresh','同步厨房','','kitchen-link')}</div>${pendingOperations()}`;
    }
    function pendingOperations() {
      try {const keys=Object.keys(localStorage).filter(k=>k.startsWith(`points_kitchen_v2_operation:${role}:`));return keys.map(k=>`<div class="kitchen-error">有一次提交的结果待确认。${btn('retry','重试上次提交',k)}</div>`).join('');}catch(_){return '';}
    }
    function recipeRows(list,picking=false) {
      return list.map(d=>`<article class="kitchen-dish-card${picking?' kitchen-pick-row':''}${picking&&modal.selected.includes(d.slug)?' is-picked':''}"><button class="kitchen-dish-open" data-kitchen-action="recipe" data-value="${esc(d.slug)}" type="button">${dishImage(d)}<span class="kitchen-dish-copy"><strong>${esc(d.name)}</strong><small class="kitchen-recipe-meta"><span>${picking?esc(d.category||'自定义菜品'):d.servings?`${d.servings} 人份`:esc(d.category||'自定义菜品')}</span>${d.rating_count?`<span class="kitchen-inline-rating">${starIcon()} ${Number(d.rating_average).toFixed(1)}</span>`:''}</small></span></button>${picking?`<button class="kitchen-pick${modal.selected.includes(d.slug)?' selected':''}" data-kitchen-action="pick" data-value="${esc(d.slug)}" aria-label="${modal.selected.includes(d.slug)?'移除':'选择'}${esc(d.name)}" aria-pressed="${modal.selected.includes(d.slug)}" type="button">${modal.selected.includes(d.slug)?'✓':'＋'}</button>`:''}</article>`).join('');
    }
    function dishImage(d,hero=false) {const image=dishes.find(x=>x.slug===d.slug)?.image || window.PointsKitchenRecipes?.find(x=>x.slug===d.slug)?.image || d.image;return image && /^images\/kitchen\/[a-z0-9-]+\.(jpg|webp|png)$/.test(image)?`<img class="${hero?'kitchen-recipe-image':'kitchen-dish-image'}" src="${esc(image)}?v=20261008.6" alt="${esc(d.name)}" loading="${hero?'eager':'lazy'}" decoding="async" width="${hero?480:180}" height="${hero?320:120}"/>`:`<span class="kitchen-dish-fallback" aria-label="${esc(d.name)}">${icon('kitchen')}</span>`;}
    function matchesDish(d,text) {return [d.name,...(d.aliases || [])].some(n=>n.includes(text.trim()));}
    function filterDishes() {return dishes.filter(d=>d.active!==false && (category==='全部' || d.category===category) && matchesDish(d,query));}
    function renderCatalog() {
      content.innerHTML=`<input class="kitchen-search" id="kitchenSearch" aria-label="搜索菜品" placeholder="搜索一道想吃的菜" value="${esc(query)}"/><div class="kitchen-categories">${['全部',...new Set(dishes.filter(d=>d.active!==false).map(d=>d.category))].map(c=>`<button class="${c===category?'active':''}" data-kitchen-action="category" data-value="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div><div class="kitchen-dish-grid" id="kitchenRecipeRows">${recipeRows(filterDishes()) || empty('没有找到这道菜')}</div>`;
    }
    function renderOverview() {
      const rows=response?.month===month?response.month_orders:[], all=rows.flatMap(o=>o.reviews || []);
      const made=rows.filter(o=>['completed','settled'].includes(o.status)).reduce((n,o)=>n+o.items.length,0), avg=all.length?(all.reduce((n,r)=>n+r.stars,0)/all.length).toFixed(1):'—';
      const sum=rows.reduce((n,o)=>n+Number(o.score_delta || 0),0), [y,m]=month.split('-').map(Number), first=new Date(y,m-1,1).getDay(), days=new Date(y,m,0).getDate();
      content.innerHTML=`<div class="kitchen-month-head"><button data-kitchen-action="month" data-value="-1" aria-label="上个月" type="button">‹</button><strong>${y} 年 ${m} 月</strong><button data-kitchen-action="month" data-value="1" aria-label="下个月" type="button">›</button></div><div class="kitchen-month-summary"><div><strong>${made}</strong><span>完成菜品</span></div><div><strong>${avg}</strong><span>平均星级</span></div><div><strong>${signed(sum)}</strong><span>订单结算积分</span></div></div><div class="kitchen-calendar-surface"><div class="kitchen-calendar">${['日','一','二','三','四','五','六'].map(d=>`<div class="weekday">${d}</div>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>{const key=`${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return `<button class="${selectedDay===key?'selected ':''}${dateKey(new Date())===key?'today':''}" data-kitchen-action="day" data-value="${key}" aria-label="${m}月${i+1}日" aria-pressed="${selectedDay===key}" type="button">${i+1}${rows.some(o=>orderDay(o)===key)?'<small></small>':'<span style="height:4px"></span>'}</button>`;}).join('')}</div></div><p class="kitchen-caption">主动记录按用餐日期归档，点菜按发起日期归档</p><div id="kitchenDay">${selectedDay?dayRows(rows.filter(o=>orderDay(o)===selectedDay)):empty('选择一个日期','看看那天点了哪些菜，收到了什么评价。')}</div>`;
    }
    function dayRows(rows) {
      return `<div class="kitchen-section-head"><h2>${esc(selectedDay.slice(5).replace('-','月'))}日的订单</h2><span>${rows.length} 餐</span></div>${rows.map(o=>`<article class="kitchen-card"><div class="kitchen-order-head"><button class="kitchen-link" data-kitchen-action="order" data-value="${esc(o.id)}" type="button">${esc(o.origin==='guest'?(o.meal||'晚饭'):'哥哥的点菜')} · ${o.items.length} 道菜</button>${status(o)}</div>${o.items.map(d=>{const r=o.reviews?.find(r=>r.slug===d.slug);return `<div class="kitchen-day-dish"><div class="kitchen-day-line">${dishImage(d)}<div><strong>${esc(d.name)}</strong><span class="kitchen-rating">${r?`★ ${r.stars}`:o.status==='completed'?'待评价':'—'}</span></div></div>${r?.comment?`<p>${esc(r.comment.slice(0,70))}</p>${r.comment.length>70?`<details><summary>查看完整评价</summary><p>${esc(r.comment)}</p></details>`:''}`:''}</div>`;}).join('')}${o.status==='settled'?`<p class="kitchen-meta">本单积分 ${signed(o.score_delta)}</p>`:''}</article>`).join('') || empty('这一天没有订单')}`;
    }
    function showCritical() { hideCritical(); }
    function hideCritical() {const visible=!critical.hidden;critical.hidden=true;app.inert=false;document.body.style.overflow='';q('kitchenCriticalError').hidden=true;if(visible)(noticeFocus?.isConnected && noticeFocus.getClientRects().length?noticeFocus:app.querySelector('.app-nav [aria-current="page"]'))?.focus({preventScroll:true});noticeFocus=null;}
    async function acknowledge(view) {
      if(busy) return; busy=true; const shown=structuredClone(presented), token=epoch;
      critical.querySelectorAll('button').forEach(b=>b.disabled=true);
      try {await rpc(admin()?'points_kitchen_v2_admin_ack':'points_kitchen_v2_guest_ack',{p_versions:shown.map(n=>({id:n.id,version:n.version}))});
        if(token!==epoch)return; hideCritical();notifications=[];busy=false;
        if(view) {navigate('kitchen');tab='orders';render();if(shown.length===1)await openOrder(shown[0].id);}
        await refresh();
      } catch(e) {if(token===epoch){q('kitchenCriticalError').textContent=failure(e);q('kitchenCriticalError').hidden=false;}}
      finally {if(token===epoch){busy=false;critical.querySelectorAll('button').forEach(b=>b.disabled=false);}}
    }
    function openModal(next,push=false) {if(modal)modal.scrollTop=body.scrollTop;if(push && modal)stack.push(modal);else stack=[];if(!modal)previousFocus=document.activeElement;modal=next;ui.setLayer(layer,true);renderDialog();body.scrollTop=0;layer.querySelector('[role="dialog"]').focus({preventScroll:true});}
    function closeDialog() {if(busy)return;if(modal?.type==='rating')void saveDraft();modalToken++;modal=null;stack=[];ui.setLayer(layer,false);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
    async function openOrder(id) {
      if(!deployed)return;const token=++modalToken, identity=epoch;openModal({type:'loading',title:'订单详情'});
      try {if(admin())await draftQueue;if(token!==modalToken || identity!==epoch)return;const o=await rpc('points_kitchen_v2_get_order',{p_order_id:id});if(token!==modalToken || identity!==epoch)return;
        modal={type:'order',order:o};const target=modal;renderDialog();if(role==='guest' && o.status==='pending'){await rpc('points_kitchen_v2_guest_seen',{p_order_id:o.id,p_version:o.version});if(modal===target && identity===epoch){o.seen_version=o.version;renderDialog();}}
        if(window.PointsNotifications&&modal===target&&identity===epoch){await rpc(admin()?'points_kitchen_v2_admin_ack':'points_kitchen_v2_guest_ack',{p_versions:[{id:o.id,version:o.version}]});if(identity===epoch)await refresh();}
      }catch(e){if(token===modalToken && identity===epoch){modal={type:'error',message:failure(e)};renderDialog();}}
    }
    // Dialog renderers and mutations follow; kept separate from the page rendering.
    function renderDialog() {
      layer.dataset.dialog=modal?.type||'';
      if(modal?.type!=='rating')delete body.dataset.ratingKey;
      if(!modal)return;foot.hidden=true;foot.innerHTML='';q('kitchenDialogTitle').textContent=modal.title || ({order:'订单详情',editor:modal.guestMade?(modal.order?'编辑这餐饭':'我做好饭啦'):modal.order?'编辑订单':'发起点菜',recipe:'菜谱详情',rating:'评价这次制作',confirm:'确认操作',error:'暂未完成'}[modal.type] || '厨房');
      if(modal.type==='loading')body.innerHTML='<div class="kitchen-skeleton">正在读取…</div>';
      else if(modal.type==='error')body.innerHTML=empty('暂未完成',modal.message);
      else if(modal.type==='order')renderOrderDialog();
      else if(modal.type==='editor')renderEditor();
      else if(modal.type==='recipe')renderRecipe();
      else if(modal.type==='rating')renderRating();
      else if(modal.type==='confirm')renderConfirm();
      layer.querySelector('[data-kitchen-action="close"]').disabled=busy;
    }
    function renderOrderDialog() {
      const o=modal.order;
      body.innerHTML='<div class="kitchen-detail-title"><p>'+esc(orderDay(o))+' · '+(o.origin==='guest'?'宝宝主动记录':'点菜菜单')+'</p><h3>'+esc(o.origin==='guest'?(o.meal||'晚饭'):'哥哥的点菜')+'</h3>'+status(o)+'</div>'+(admin()&&o.origin!=='guest'&&o.status==='pending'?'<p class="kitchen-caption">'+(o.seen_version>=o.version?'宝宝已查看菜单':'宝宝尚未查看最新菜单')+'</p>':'')+(o.note?'<div class="kitchen-note"><span class="kitchen-note-label">这一餐的备注</span><p>'+esc(o.note)+'</p></div>':'')+'<div class="kitchen-list">'+o.items.map(d=>{const r=o.reviews.find(r=>r.slug===d.slug);return '<article class="kitchen-order-dish"><button class="kitchen-dish-row" data-kitchen-action="order-recipe" data-value="'+esc(d.slug)+'" type="button">'+dishImage(d)+'<span class="kitchen-dish-copy"><strong>'+esc(d.name)+'</strong><small>'+(d.no_recipe?'查看菜品与评价':'查看制作方法')+'</small></span><span class="kitchen-chevron">›</span></button>'+dishRequest(d)+(r?'<div class="kitchen-dish-review"><div><span class="kitchen-inline-rating">'+starIcon()+' '+r.stars+'</span><span>'+signed(delta(r.stars))+' 分</span></div>'+(r.comment?'<p>'+esc(r.comment)+'</p>':'')+'</div>':'')+'</article>';}).join('')+'</div>'+(o.status==='settled'?'<div class="kitchen-settled-total"><span>这餐已评价</span><strong>'+signed(o.score_delta)+' 分</strong></div>':'')+(o.resolution_note?'<p class="kitchen-note">'+esc(o.resolution_note)+'</p>':'')+'<details class="kitchen-version"><summary>时间与修改记录</summary><p>订单 #'+esc(o.id)+' · 菜单版本 '+o.version+'<br>发起：'+stamp(o.created_at)+'<br>制作完成：'+stamp(o.completed_at)+'<br>处理／结算：'+stamp(o.resolved_at)+'</p>'+(o.versions||[]).map(v=>'<p>版本 '+v.version+' · '+stamp(v.changed_at)+'<br>'+v.items.map(d=>esc(d.name)+(d.request_note?'：'+esc(d.request_note):'')).join('、')+(v.note?'<br>备注：'+esc(v.note):'')+(v.status==='cancelled'?'<br>订单已取消':'')+'</p>').join('')+'</details>';
      const actions=o.status==='pending'?(admin()?btn('edit','编辑订单',o.id,'primary')+btn('cancel-order','取消订单',o.id,'destructive'):btn('complete','制作完成',o.id,'primary',o.seen_version<o.version)+btn('reject','拒绝订单',o.id,'destructive',o.seen_version<o.version)):o.status==='completed'?(admin()?btn('rate','评价并结算',o.id,'primary'):o.origin==='guest'?btn('guest-edit','编辑这餐饭',o.id,'primary')+btn('guest-cancel','撤回记录',o.id,'destructive'):''):'';
      foot.hidden=!actions;foot.innerHTML=`<div class="kitchen-actions">${actions}</div>`;
    }
    function renderEditor() {
      modal.itemNotes ||= {};modal.pickCategory ||= '家常菜';modal.pickQuery ||= '';modal.pickView ||= 'choose';
      const available=[...dishes.filter(d=>d.active!==false || modal.selected.includes(d.slug)),...(modal.custom || [])];
      body.innerHTML=`${modal.guestMade?`<div class="kitchen-meal-fields"><label>用餐日期<input id="kitchenMealDate" type="date" value="${esc(modal.mealDate)}" max="${dateKey(new Date())}"/></label><label>餐次<select id="kitchenMeal"><option value="午饭" ${modal.meal==='午饭'?'selected':''}>午饭</option><option value="晚饭" ${modal.meal==='晚饭'?'selected':''}>晚饭</option></select></label></div>`:''}<div class="kitchen-tabs kitchen-editor-tabs" role="tablist" aria-label="${modal.guestMade?'菜品选择':'点菜步骤'}"><button data-kitchen-action="pick-view" data-value="choose" role="tab" aria-selected="${modal.pickView==='choose'}" type="button">${modal.guestMade?'添加菜品':'挑菜'}</button><button data-kitchen-action="pick-view" data-value="selected" role="tab" aria-selected="${modal.pickView==='selected'}" type="button">${modal.guestMade?'已选菜品':'已选与备注'} · ${modal.selected.length}</button></div>${modal.pickView==='choose'?`<input class="kitchen-search" id="kitchenPickSearch" aria-label="搜索要点的菜" placeholder="输入菜名，快速找到" value="${esc(modal.pickQuery)}"/><div class="kitchen-categories">${['全部',...new Set(available.map(d=>d.category))].map(c=>`<button class="${c===modal.pickCategory?'active':''}" data-kitchen-action="pick-category" data-value="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div>${modal.guestMade?'<div class="kitchen-custom-row"><input id="kitchenCustomName" aria-label="自定义菜名" maxlength="40" placeholder="没有找到？填写自己做的菜"/><button class="kitchen-button" data-kitchen-action="custom-add" type="button">添加</button></div>':''}<div class="kitchen-dish-grid" id="kitchenPickRows">${editorRows(available)}</div>`:`<p class="kitchen-caption">${modal.guestMade?'确认这一餐做好的菜品':'每道菜的要求会单独展示给宝宝'}</p>${modal.selected.map(s=>{const d=available.find(d=>d.slug===s) || modal.order?.items.find(d=>d.slug===s);return `<article class="kitchen-selected-dish"><div class="kitchen-selected-head">${dishImage(d)}<strong>${esc(d.name)}</strong>${btn('pick','移除',s,'kitchen-link')}</div>${modal.guestMade?'':`<label class="kitchen-caption" for="dish-note-${esc(s)}">哥哥的要求（可选）</label><textarea id="dish-note-${esc(s)}" class="kitchen-textarea kitchen-item-input" data-dish-note="${esc(s)}" maxlength="200" placeholder="例如：少盐、不放葱，鸡翅软一些">${esc(modal.itemNotes[s] || '')}</textarea>`}</article>`;}).join('') || empty('还没有选菜','回到挑菜页，选几道想吃的菜。')}${modal.guestMade?'':`<label class="kitchen-caption" for="kitchenNote">整单备注（可选）</label><textarea class="kitchen-textarea" id="kitchenNote" maxlength="500" placeholder="例如：今晚七点吃饭">${esc(modal.note)}</textarea>`}`}`;
      editorFooter();

    }
    function editorFooter() {
      const available=[...dishes,...(modal.custom||[])],count=modal.selected.length;
      const preview='<div class="kitchen-selection-summary"><div class="kitchen-selection-images" aria-hidden="true">'+modal.selected.slice(0,3).map(slug=>dishImage(available.find(d=>d.slug===slug)||{name:'菜'})).join('')+'</div><span>'+ (count?'已选 '+count+' 道菜':'选几道想吃的菜')+'</span></div>';
      foot.hidden=false;foot.innerHTML=preview+(modal.guestMade?btn('save-order',(modal.order?'保存修改':'告诉哥哥，饭做好啦'),'','primary kitchen-full',!count||count>24):modal.pickView==='choose'?btn('pick-view','填写要求 ›','selected','primary kitchen-full',!count):btn('save-order',modal.order?'保存修改':'发送点菜请求','','primary kitchen-full',!count||count>24));
    }
    function updateEditorSelection() {
      if(modal.pickView!=='choose'){const scroll=body.scrollTop;renderEditor();body.scrollTop=scroll;return;}
      body.querySelectorAll('.kitchen-pick-row').forEach(row=>{const b=row.querySelector('.kitchen-pick'),d=([...dishes,...(modal.custom||[])]).find(d=>d.slug===b.dataset.value),on=modal.selected.includes(b.dataset.value);row.classList.toggle('is-picked',on);b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(on?'移除':'选择')+(d?.name||''));b.textContent=on?'✓':'＋';});
      body.querySelector('[data-kitchen-action="pick-view"][data-value="selected"]').textContent=(modal.guestMade?'已选菜品':'已选与备注')+' · '+modal.selected.length;
      editorFooter();
    }
    function editorRows(available=[...dishes.filter(d=>d.active!==false || modal.selected.includes(d.slug)),...(modal.custom || [])]) {return recipeRows(available.filter(d=>(modal.pickCategory==='全部' || d.category===modal.pickCategory) && matchesDish(d,modal.pickQuery || '')),true) || empty('没有找到这道菜','试试其他菜名或分类');}
    function dishRequest(d) {return d.request_note?`<div class="kitchen-dish-request"><span>${modal?.guestMade || modal?.order?.origin==='guest'?'宝宝的备注':'哥哥的要求'}</span><p>${esc(d.request_note)}</p></div>`:'';}
    function renderRecipe() {
      const d=modal.recipe, current=dishes.find(x=>x.slug===d.slug) || d, reviewMode=modal.view==='reviews';
      const reviews=(modal.reviews || []).map(r=>`<article class="kitchen-review-row"><div class="kitchen-order-head"><span class="kitchen-rating">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span><span class="kitchen-caption">${stamp(r.reviewed_at)}</span></div>${r.comment?`<p class="kitchen-note">${esc(r.comment)}</p>`:''}<button class="kitchen-link" data-kitchen-action="order" data-value="${esc(r.order_id)}" type="button">订单 #${esc(r.order_id)} · 查看当时菜品 ›</button></article>`).join('') || empty(modal.loading?'正在读取评价':'还没有评价','制作后的评分和文字评价会保存在这里。');
      const method=d.custom?'<p class="kitchen-caption">这道菜只保存在本餐记录中，不设制作教程。</p>':d.no_recipe?'<p class="kitchen-caption">这道菜不设固定教程，按自己的口味和搭配准备。</p>':`<p class="kitchen-caption">${esc(d.description || '')}</p><div class="kitchen-card"><h4>食材与调料</h4><dl class="kitchen-ingredients">${(d.ingredients || []).map(([name,amount])=>`<div><dt>${esc(name)}</dt><dd>${esc(amount)}</dd></div>`).join('')}</dl></div><h4>制作步骤</h4><ol class="kitchen-steps">${(d.steps || []).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${d.tips?.length?`<section class="kitchen-tips"><h4>好吃的关键</h4><ul>${d.tips.map(t=>{const [label,...parts]=t.split('｜');return `<li>${parts.length?`<span>${esc(label)}</span><p>${esc(parts.join('｜'))}</p>`:`<p>${esc(t)}</p>`}</li>`;}).join('')}</ul></section>`:''}`;
      body.innerHTML=`${stack.length?btn('back','‹ 返回','','kitchen-link'):''}${dishImage(d,true)}<h3 class="kitchen-recipe-title">${esc(d.name)}</h3>${dishRequest(d)}${current.rating_count?`<div class="kitchen-recipe-summary"><span>★ ${Number(current.rating_average).toFixed(1)} · ${current.rating_count} 次评价</span></div>`:''}<div class="kitchen-tabs" role="tablist" aria-label="菜品详情"><button data-kitchen-action="recipe-tab" data-value="method" role="tab" aria-selected="${!reviewMode}" type="button">${d.no_recipe?'菜品说明':'制作方法'}</button><button data-kitchen-action="recipe-tab" data-value="reviews" role="tab" aria-selected="${reviewMode}" type="button">历史评价</button></div>${reviewMode?reviews:method}${modal.error?`<div class="kitchen-error">${esc(modal.error)}</div>`:''}${reviewMode && modal.more?btn('more-reviews','查看更早评价','','kitchen-full'):''}`;
    }
    async function loadReviews(append=false) {
      if(modal?.type!=='recipe')return;const target=modal,token=epoch;target.loading=true;
      if(!deployed){target.loading=false;renderDialog();return;}
      try {const data=await rpc('points_kitchen_v2_get_reviews',{p_slug:target.recipe.slug,p_before:append?target.reviews.at(-1)?.order_id:null});
        if(modal!==target || token!==epoch)return;target.reviews=append?[...target.reviews,...data.reviews]:data.reviews;target.more=data.more;target.error='';
      }catch(e){if(modal===target && token===epoch)target.error=failure(e);}finally{target.loading=false;if(modal===target)renderDialog();}
    }
    function ratingFooter() {
      const count=modal.ratings.filter(r=>r.stars).length,total=modal.ratings.reduce((n,r)=>n+delta(r.stars),0);
      foot.hidden=false;foot.innerHTML='<div class="kitchen-rating-progress"><span>已评价 '+count+' / '+modal.order.items.length+' 道</span><strong>合计 '+signed(total)+' 分</strong></div>'+btn(count===modal.order.items.length?'submit-review':'next-rating',count===modal.order.items.length?'提交评价并结算':'下一道未评分','','primary kitchen-full');
    }
    function renderRating() {
      const o=modal.order,selected=modal.index||0,d=o.items[selected],r=modal.ratings[selected],key=o.id+':'+selected;
      if(body.dataset.ratingKey!==key || !body.querySelector('#kitchenComment')) {
        body.dataset.ratingKey=key;
        const tabs=o.items.map((item,i)=>'<button data-kitchen-action="rating-tab" data-value="'+i+'" role="tab" aria-label="'+esc(item.name)+'" aria-selected="'+(selected===i)+'" type="button">'+dishImage(item)+'<span class="kitchen-rating-check" aria-hidden="true">'+(modal.ratings[i].stars?'✓':'')+'</span></button>').join('');
        body.innerHTML='<div class="kitchen-rating-rail" role="tablist" aria-label="选择评价菜品">'+tabs+'</div><div class="kitchen-rating-stage">'+dishImage(d,true)+'<p>第 '+(selected+1)+' 道 · 共 '+o.items.length+' 道菜</p><h3>'+esc(d.name)+'</h3></div><div class="kitchen-star-input" role="radiogroup" aria-label="'+esc(d.name)+'星级">'+[1,2,3,4,5].map(n=>'<button data-kitchen-action="star" data-value="'+n+'" aria-label="'+n+'颗星" aria-checked="false" role="radio" type="button">'+starIcon()+'</button>').join('')+'</div><p class="kitchen-rating-note"></p><label class="kitchen-caption" for="kitchenComment">给宝宝的评价（可选）</label><textarea class="kitchen-textarea" id="kitchenComment" maxlength="1000" placeholder="哪里做得好，下次想怎样调整？">'+esc(r.comment)+'</textarea><p class="kitchen-caption" id="kitchenDraftStatus">草稿自动同步 · 提交后才结算</p>';
        body.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
      }
      body.querySelectorAll('[data-kitchen-action="star"]').forEach(b=>{b.classList.toggle('selected',r.stars>=Number(b.dataset.value));b.setAttribute('aria-checked',String(r.stars===Number(b.dataset.value)));b.disabled=busy;});
      body.querySelectorAll('.kitchen-rating-check').forEach((mark,i)=>mark.textContent=modal.ratings[i].stars?'✓':'');
      body.querySelector('.kitchen-rating-note').textContent=r.stars?r.stars+' 颗星 · 本菜 '+signed(delta(r.stars))+' 分':'选择星级，记下这道菜的味道';
      ratingFooter();
    }
    function renderConfirm() {
      body.innerHTML=`<p class="kitchen-note">${esc(modal.message)}</p>${modal.reject?'<label class="kitchen-caption" for="kitchenReason">拒绝原因（可选）</label><textarea class="kitchen-textarea" id="kitchenReason" maxlength="500"></textarea>':''}`;
      foot.hidden=false;foot.innerHTML=btn('confirm','确认','','primary kitchen-full')+btn('back','返回');
    }
    function confirm(message,name,args,key,reject=false) {openModal({type:'confirm',message,name,args,key,reject},true);}
    async function saveDraft(target=modal) {
      clearTimeout(draftTimer);if(target?.type!=='rating' || !admin())return draftQueue;
      const ratings=structuredClone(target.ratings),token=epoch,id=target.order.id,serial=++draftSerial;
      if(modal===target && q('kitchenDraftStatus'))q('kitchenDraftStatus').textContent='草稿同步中…';
      draftQueue=draftQueue.catch(()=>{}).then(async()=>{if(token!==epoch || !admin())return;try {
        await rpc('points_kitchen_v2_admin_draft',{p_order_id:id,p_version:target.order.version,p_ratings:ratings});
        if(serial===draftSerial && modal===target && token===epoch)q('kitchenDraftStatus').textContent='草稿已保存 · 尚未结算';
      }catch(e){if(modal===target && token===epoch)q('kitchenDraftStatus').textContent='草稿暂未同步，当前填写仍保留；可以直接提交完整评价。';}});
      return draftQueue;
    }
    async function mutate(name,args,key,original=null) {
      if(busy || ['waiting','verifying'].includes(role))return;busy=true;const token=++epoch;pending=null;
      const storageKey=original?.key || `points_kitchen_v2_operation:${role}:${key}`;
      let op=original?.op || null;
      try {if(!op){try{op=JSON.parse(localStorage.getItem(storageKey) || 'null');}catch(_){} if(op && (op.name!==name || JSON.stringify(op.args)!==JSON.stringify(args)))throw {code:'KITCHEN_PENDING_OPERATION'};if(!op)op={name,args,uuid:crypto.randomUUID()};try{localStorage.setItem(storageKey,JSON.stringify(op));}catch(_){}}
        renderDialog();const o=await rpc(op.name,{...op.args,p_operation_id:op.uuid});
        if(token!==epoch)return;try{localStorage.removeItem(storageKey);}catch(_){}
        stack=[];modal={type:'order',order:o};orders=[o,...orders.filter(x=>x.id!==o.id)];error='';busy=false;renderDialog();
        if(o.status==='settled'){state.overviewLoadedAt=0;state.score=o.score_after;state.updatedAt=o.resolved_at;ui.renderScore();await ui.refreshScore();}ui.showToast(o.status==='settled'?`评价已结算 · ${signed(o.score_delta)} 分`:o.status==='cancelled'?'订单已取消':o.status==='rejected'?'订单已拒绝':o.status==='completed'?'制作完成，等待哥哥评价':'订单已保存');await refresh();
      }catch(e){if(token===epoch){if(e.code && e.code!=='KITCHEN_PENDING_OPERATION' && !/^(08|PGRST00|APP_)/.test(e.code)){try{localStorage.removeItem(storageKey);}catch(_){}}
        error=failure(e);ui.showToast(error);busy=false;if(e.code==='40001' && args.p_order_id)await openOrder(args.p_order_id);await refresh();}}
      finally {if(token===epoch){busy=false;render();renderDialog();}}
    }
    async function act(event) {
      const b=event.target.closest('[data-kitchen-action]');if(!b || b.disabled || busy)return;
      const a=b.dataset.kitchenAction,v=b.dataset.value;
      if(a==='ack' || a==='ack-view')return acknowledge(a==='ack-view');
      if(!critical.hidden)return;
      if(a==='page')return navigate(v);
      if(kitchenApi.legacy && sqlRequired.has(a))return ui.showToast('请先执行厨房增量 SQL，再同步厨房');
      if(a==='settings')return els.settingsBtn.click();
      if(a==='close')return closeDialog();
      if(a==='back'){modal=stack.pop() || null;if(!modal)return closeDialog();renderDialog();body.scrollTop=modal.scrollTop||0;return;}
      if(a==='tab'){tab=v;render();if(v==='overview')await refresh();return;}
      if(a==='history'){history=!history;render();return;}
      if(a==='refresh')return refresh();
      if(a==='more-orders')return refresh({before:response.cursor,append:true});
      if(a==='category'){category=v;renderCatalog();return;}
      if(a==='month'){const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+Number(v),1);month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;epoch++;pending=null;selectedDay=null;renderOverview();await refresh();renderOverview();return;}
      if(a==='day'){selectedDay=v;renderOverview();return;}
      if(a==='order')return openOrder(v);
      if(a==='recipe' || a==='order-recipe'){const d=a==='order-recipe'?modal.order.items.find(d=>d.slug===v):dishes.find(d=>d.slug===v) || modal?.custom?.find(d=>d.slug===v);if(d)openModal({type:'recipe',recipe:d,view:'method',guestMade:modal?.guestMade || modal?.order?.origin==='guest'},!!modal);return;}
      if(a==='recipe-tab'){modal.view=v;renderDialog();if(v==='reviews')await loadReviews();return;}
      if(a==='more-reviews')return loadReviews(true);
      if(a==='guest-create' && role==='guest'){openModal({type:'editor',guestMade:true,selected:[],note:'',itemNotes:{},custom:[],mealDate:dateKey(new Date()),meal:new Date().getHours()<15?'午饭':'晚饭'});return;}
      if(a==='guest-edit' && role==='guest'){const o=modal.order;openModal({type:'editor',guestMade:true,order:o,selected:o.items.map(d=>d.slug),note:o.note,itemNotes:Object.fromEntries(o.items.map(d=>[d.slug,d.request_note || ''])),custom:o.items.filter(d=>d.custom),mealDate:o.meal_date,meal:o.meal},true);return;}
      if(a==='guest-cancel' && role==='guest'){const o=modal.order;confirm('撤回这餐记录，不评价、不结算积分。','points_kitchen_v2_guest_save',{p_items:[],p_note:o.note,p_meal_date:o.meal_date,p_meal:o.meal,p_order_id:o.id,p_version:o.version,p_cancel:true},`guest-save:${o.id}`);return;}
      if(a==='custom-add' && modal?.guestMade){const name=q('kitchenCustomName').value.trim();if(!name)return ui.showToast('请填写菜名');if(modal.selected.length>=24)return ui.showToast('一餐最多添加 24 道菜');const old=[...dishes,...modal.custom].find(d=>d.name===name);const d=old || {slug:`custom-${crypto.randomUUID()}`,name,category:'自定义',no_recipe:true,custom:true};if(!old)modal.custom.push(d);if(!modal.selected.includes(d.slug))modal.selected.push(d.slug);modal.pickView='choose';modal.pickCategory=old?.category || '自定义';modal.pickQuery='';renderDialog();return;}
      if(a==='create' && admin()){openModal({type:'editor',selected:[],note:'',itemNotes:{}});return;}
      if(a==='edit' && admin()){const o=modal.order;openModal({type:'editor',order:o,selected:o.items.map(d=>d.slug),note:o.note,itemNotes:Object.fromEntries(o.items.map(d=>[d.slug,d.request_note || '']))},true);return;}
      if(a==='pick-view'){modal[modal.pickView+'Scroll']=body.scrollTop;modal.pickView=v;renderDialog();body.scrollTop=modal[v+'Scroll']||0;return;}
      if(a==='pick-category'){modal.pickCategory=v;modal.pickQuery='';renderDialog();return;}
      if(a==='pick'){if(!modal.selected.includes(v)&&modal.selected.length>=24)return ui.showToast('一餐最多添加 24 道菜');modal.selected=modal.selected.includes(v)?modal.selected.filter(s=>s!==v):[...modal.selected,v];updateEditorSelection();return;}
      if(a==='save-order'){const m=modal,items=m.selected.map(slug=>({slug,note:m.itemNotes[slug] || ''}));if(m.guestMade){if(!m.mealDate || m.mealDate>dateKey(new Date()))return ui.showToast('请选择今天或之前的用餐日期');const list=items.map(d=>({...d,...(m.custom.find(c=>c.slug===d.slug)?{name:m.custom.find(c=>c.slug===d.slug).name,custom:true}:{})}));const duplicate=orders.find(o=>o.origin!=='guest' && o.status==='pending');confirm(`${m.mealDate} ${m.meal}，共 ${items.length} 道菜。${duplicate?'你还有待制作订单；若是同一餐，请返回并完成已有订单。':''}提交后哥哥会收到提醒，并可以逐菜评价。`,'points_kitchen_v2_guest_save',{p_items:list,p_note:m.note,p_meal_date:m.mealDate,p_meal:m.meal,p_order_id:m.order?.id || null,p_version:m.order?.version || null,p_cancel:false},`guest-save:${m.order?.id || 'new'}`);return;}confirm(`${m.order?'保存菜单修改':'发送点菜请求'}：${m.selected.map(s=>dishes.find(d=>d.slug===s)?.name).join('、')}${m.note?`。整单备注：${m.note}`:''}${items.filter(d=>d.note).map(d=>`\n${dishes.find(x=>x.slug===d.slug)?.name}：${d.note}`).join('')}`, 'points_kitchen_v2_admin_save',{p_items:items,p_note:m.note,p_order_id:m.order?.id || null,p_version:m.order?.version || null,p_cancel:false},`save:${m.order?.id || 'new'}`);return;}
      if(a==='cancel-order'){const o=modal.order;confirm('取消后宝宝无需继续制作，订单将永久保留在历史中，不影响积分。','points_kitchen_v2_admin_save',{p_items:o.items.map(d=>d.slug),p_note:o.note,p_order_id:o.id,p_version:o.version,p_cancel:true},`save:${o.id}`);return;}
      if(a==='complete' || a==='reject'){const o=modal.order;confirm(a==='reject'?'拒绝整笔订单，不评分、不变动积分。':'确认这笔订单的全部菜品已经制作完成，之后菜单将固定并等待哥哥评价。','points_kitchen_v2_guest_resolve',{p_order_id:o.id,p_version:o.version,p_reject:a==='reject',p_reason:''},`resolve:${o.id}`,a==='reject');return;}
      if(a==='rate' && admin()){const o=modal.order;openModal({type:'rating',order:o,index:0,ratings:o.items.map(d=>({slug:d.slug,stars:o.draft?.find(r=>r.slug===d.slug)?.stars || null,comment:o.draft?.find(r=>r.slug===d.slug)?.comment || ''}))},true);return;}
      if(a==='rating-tab'){void saveDraft();modal.index=Number(v);modal.menu=false;renderDialog();body.scrollTop=0;return;}
      if(a==='rating-menu'){modal.menu=!modal.menu;renderDialog();return;}
      if(a==='star'){modal.ratings[modal.index].stars=Number(v);void saveDraft();renderDialog();return;}
      if(a==='next-rating'){const index=modal.ratings.findIndex(r=>!r.stars);modal.index=index<0?0:index;void saveDraft();renderDialog();body.scrollTop=0;return;}
      if(a==='submit-review'){await saveDraft();const m=modal;if(m?.type!=='rating' || m.ratings.some(r=>!r.stars))return;confirm(`提交 ${m.ratings.length} 道菜的评价，合计 ${signed(m.ratings.reduce((n,r)=>n+delta(r.stars),0))} 分。确认后自动结算。`,'points_kitchen_v2_admin_review',{p_order_id:m.order.id,p_version:m.order.version,p_ratings:structuredClone(m.ratings)},`review:${m.order.id}`);return;}
      if(a==='confirm'){const m=modal;if(m.reject)m.args.p_reason=q('kitchenReason').value;return mutate(m.name,m.args,m.key);}
      if(a==='retry'){try{const op=JSON.parse(localStorage.getItem(v));if(op)return mutate(op.name,op.args,'',{key:v,op});}catch(_){ui.showToast('无法读取待确认操作');}}
    }
    document.addEventListener('click',event=>{
      if(!critical.hidden && !critical.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();return;}
      if(event.target.closest('[data-kitchen-action]'))void act(event).catch(e=>ui.showToast(failure(e)));
    },true);
    app.addEventListener('error',event=>{if(event.target.matches?.('.kitchen-dish-image,.kitchen-recipe-image')){const fallback=document.createElement('span');fallback.className='kitchen-dish-fallback';fallback.setAttribute('aria-label',event.target.alt);fallback.innerHTML=icon('kitchen');event.target.replaceWith(fallback);}},true);
    app.addEventListener('input',event=>{
      if(event.target.id==='kitchenSearch'){query=event.target.value;q('kitchenRecipeRows').innerHTML=recipeRows(filterDishes()) || empty('没有找到这道菜');}
      if(event.target.id==='kitchenPickSearch' && modal?.type==='editor'){modal.pickQuery=event.target.value;if(modal.pickQuery.trim()){modal.pickCategory='全部';body.querySelectorAll('.kitchen-categories button').forEach(b=>b.classList.toggle('active',b.dataset.value==='全部'));}q('kitchenPickRows').innerHTML=editorRows();}
      if(event.target.dataset.dishNote && modal?.type==='editor')modal.itemNotes[event.target.dataset.dishNote]=event.target.value;
      if(event.target.id==='kitchenMealDate' && modal?.guestMade)modal.mealDate=event.target.value;
      if(event.target.id==='kitchenMeal' && modal?.guestMade)modal.meal=event.target.value;
      if(event.target.id==='kitchenNote' && modal?.type==='editor')modal.note=event.target.value;
      if(event.target.id==='kitchenComment' && modal?.type==='rating'){modal.ratings[modal.index].comment=event.target.value;draftSerial++;q('kitchenDraftStatus').textContent='等待同步…';clearTimeout(draftTimer);const target=modal;draftTimer=setTimeout(()=>void saveDraft(target),650);}
    });
    layer.addEventListener('click',e=>{if(e.target===layer)closeDialog();});
    body.addEventListener('scroll',()=>{if(modal?.type==='recipe')q('kitchenDialogTitle').textContent=body.scrollTop>200?modal.recipe.name:'菜谱详情';},{passive:true});
    const fitKitchenViewport=()=>{const viewport=window.visualViewport;if(viewport){layer.style.setProperty('--kitchen-viewport-height',viewport.height+'px');layer.style.setProperty('--kitchen-viewport-top',viewport.offsetTop+'px');if(modal?.type==='rating')requestAnimationFrame(()=>body.querySelector('.kitchen-rating-rail [aria-selected="true"]')?.scrollIntoView({block:'nearest',inline:'nearest'}));}};
    window.visualViewport?.addEventListener('resize',fitKitchenViewport);
    window.visualViewport?.addEventListener('scroll',fitKitchenViewport);fitKitchenViewport();
    document.addEventListener('keydown',e=>{
      const scope=!critical.hidden?critical:layer.classList.contains('open')?layer:null;if(!scope)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(scope===layer && !busy){if(modal?.menu){modal.menu=false;renderDialog();}else closeDialog();}return;}
      if(e.key==='Tab'){const focusable=[...scope.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,a[href]')].filter(x=>x.getClientRects().length);if(!focusable.length){e.preventDefault();return;}const index=focusable.indexOf(document.activeElement);if(e.shiftKey && index<=0 || !e.shiftKey && (index<0 || index===focusable.length-1)){e.preventDefault();focusable[e.shiftKey?focusable.length-1:0].focus();}}
      if(scope===critical)e.stopImmediatePropagation();
    },true);
    const resume=()=>{if(!document.hidden)void refresh();};
    window.addEventListener('points:before-update',()=>{try{const draft=['editor','rating'].includes(modal?.type)?modal:[...stack].reverse().find(m=>['editor','rating'].includes(m.type));if(draft && (admin() || role==='guest'))sessionStorage.setItem('points_kitchen_v2_update_draft',JSON.stringify({role,modal:draft}));}catch(_){} });
    function restoreUpdateDraft() {
      if(modal || ['waiting','verifying'].includes(role))return;let saved;
      try{saved=JSON.parse(sessionStorage.getItem('points_kitchen_v2_update_draft') || 'null');}catch(_){}
      if(!saved || saved.role!==role)return;
      sessionStorage.removeItem('points_kitchen_v2_update_draft');const m=saved.modal,o=m?.order && find(m.order.id);
      if(m?.type==='editor' && (!m.order || ['pending','completed'].includes(o?.status) && o.version===m.order.version) || m?.type==='rating' && o?.status==='completed') {navigate('kitchen');if(o)m.order=o;openModal(m);ui.showToast('已更新到新版本，填写内容已恢复');}
    }
    document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);
    let noticeFrame=0;
    new MutationObserver(()=>{if(admin() && notifications.length && critical.hidden && !noticeFrame)noticeFrame=requestAnimationFrame(()=>{noticeFrame=0;if(!busy)showCritical();});}).observe(app,{subtree:true,attributes:true,attributeFilter:['class']});
    function roleChanged(authReady=false) {
      ready=ready || authReady;const next=!ready?'waiting':state.session?state.isAdmin?`admin:${state.session.user.id}`:'verifying':'guest';
      if(next===role)return;role=next;epoch++;pending=null;response=null;deployed=false;orders=[];notifications=[];error='';dishes=window.PointsKitchenRecipes || [];
      clearTimeout(draftTimer);draftSerial++;busy=false;hideCritical();closeDialog();render();if(!['waiting','verifying'].includes(role))void refresh();
    }
    window.addEventListener('points:access-ready',()=>{if(!['waiting','verifying'].includes(role))void refresh();});
    render(); return {refresh,roleChanged};
  }
  window.PointsKitchen={attach};
})();
