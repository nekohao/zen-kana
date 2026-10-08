/* Same account and score, independent kitchen pages. No production mock orders. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={pending:'待制作',completed:'待评价',settled:'已结算',rejected:'已拒绝',cancelled:'已取消'};
  const delta=stars=>[0,-1,-1,0,1,2][Number(stars)] ?? 0;
  const signed=n=>`${Number(n)>0?'+':''}${n}`;
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
    const admin=()=>role.startsWith('admin:');
    const btn=(action,text,value='',kind='',disabled=false)=>`<button class="kitchen-button ${kind}" data-kitchen-action="${action}"${value!==''?` data-value="${esc(value)}"`:''} type="button"${disabled || busy?' disabled':''}>${text}</button>`;
    const empty=(title,copy='')=>`<div class="kitchen-empty"><strong>${esc(title)}</strong>${esc(copy)}</div>`;
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
    async function rpc(name,args={}) { const r=await db.rpc(name,args); if(r.error) throw r.error; return r.data; }
    function renderError() { q('kitchenError').className='kitchen-error'; q('kitchenError').hidden=!error; q('kitchenError').textContent=error; }
    async function refresh({before=null,append=false}={}) {
      if(!ready || ['verifying','waiting'].includes(role) || busy) return false;
      if(pending) return pending; const token=epoch;
      const task=(async()=>{try {
        const data=await rpc('points_kitchen_get_state',{p_before:before,p_month:month});
        if(token!==epoch) return false;
        if(!data || data.admin!==admin() || !Array.isArray(data.orders) || !Array.isArray(data.dishes)) throw new Error('Invalid kitchen state');
        response=data; deployed=true; error=''; dishes=data.dishes;
        orders=append?[...new Map([...orders,...data.orders].map(o=>[o.id,o])).values()]:data.orders;
        notifications=data.notifications || []; render(); showCritical(); return true;
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
      renderError(); q('kitchenGreeting').textContent=admin()?'哥哥的点菜与评价':'宝宝的制作与复盘';
      const todo=orders.filter(o=>o.status===(admin()?'completed':'pending')).length;
      q('kitchenBadge').hidden=todo===0; q('kitchenBadge').textContent=todo>99?'99+':todo;
      page.querySelectorAll('[data-kitchen-action="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===tab)));
      if(tab==='catalog') renderCatalog(); else if(tab==='overview') renderOverview(); else renderOrders();
    }
    function orderCard(o) {
      return `<button class="kitchen-card" data-kitchen-action="order" data-value="${esc(o.id)}" type="button"><div class="kitchen-order-head"><strong>订单 #${esc(o.id)}</strong>${status(o)}</div><p>${o.items.map(d=>esc(d.name)).join(' · ')}</p>${o.note?`<p class="kitchen-caption">${esc(o.note)}</p>`:''}<p class="kitchen-meta">${stamp(o.created_at)} · ${o.items.length} 道菜${admin() && o.status==='pending'?` · ${o.seen_version>=o.version?'宝宝已查看':'宝宝尚未查看最新菜单'}`:''}${o.status==='settled'?` · ${signed(o.score_delta)} 分`:''}</p></button>`;
    }
    function renderOrders() {
      if(role==='waiting' || role==='verifying') {content.innerHTML=empty('正在确认身份','稍候即可查看厨房');return;}
      const active=orders.filter(o=>['pending','completed'].includes(o.status)), done=orders.filter(o=>!['pending','completed'].includes(o.status));
      active.sort((a,b)=>(a.status===(admin()?'completed':'pending')?-1:1)-(b.status===(admin()?'completed':'pending')?-1:1) || Number(b.id)-Number(a.id));
      content.innerHTML=`${admin()?btn('create','发起点菜','','primary kitchen-full',!deployed):''}<div class="kitchen-section-head"><h2>${history?'订单历史':admin()?'待评价与进行中':'待制作与待评价'}</h2><button class="kitchen-link" data-kitchen-action="history" type="button">${history?'返回待办':'历史记录'}</button></div>${(history?done:active).map(orderCard).join('') || empty(history?'还没有历史记录':'今天的厨房很安静',admin()?'挑几道想吃的菜，发给宝宝。':'新的点菜请求会在这里出现。')}${history && response?.more?btn('more-orders','查看更早订单','','kitchen-full'):''}${btn('refresh','同步厨房','','kitchen-full')}${pendingOperations()}`;
    }
    function pendingOperations() {
      try {const keys=Object.keys(localStorage).filter(k=>k.startsWith(`points_kitchen_operation:${role}:`));return keys.map(k=>`<div class="kitchen-error">有一次提交的结果待确认。${btn('retry','重试上次提交',k)}</div>`).join('');}catch(_){return '';}
    }
    function recipeRows(list,picking=false) {
      return list.map(d=>`<div class="kitchen-dish-row"><button class="kitchen-dish-row" style="padding:0;border:0" data-kitchen-action="recipe" data-value="${esc(d.slug)}" type="button"><span class="kitchen-dish-mark" aria-hidden="true">${esc(d.name.slice(0,1))}</span><span class="kitchen-dish-copy"><strong>${esc(d.name)}</strong><small>${esc(d.category)} · ${d.minutes} 分钟 · ${d.rating_count?`★ ${Number(d.rating_average).toFixed(1)} / ${d.rating_count} 次评价`:'暂无评价'}</small></span></button>${picking?`<button class="kitchen-pick${modal.selected.includes(d.slug)?' selected':''}" data-kitchen-action="pick" data-value="${esc(d.slug)}" aria-label="${modal.selected.includes(d.slug)?'移除':'选择'}${esc(d.name)}" aria-pressed="${modal.selected.includes(d.slug)}" type="button">${modal.selected.includes(d.slug)?'✓':'＋'}</button>`:''}</div>`).join('');
    }
    function filterDishes() {return dishes.filter(d=>d.active!==false && (category==='全部' || d.category===category) && d.name.includes(query));}
    function renderCatalog() {
      content.innerHTML=`<input class="kitchen-search" id="kitchenSearch" aria-label="搜索菜品" placeholder="搜索一道想吃的菜" value="${esc(query)}"/><div class="kitchen-categories">${['全部',...new Set(dishes.filter(d=>d.active!==false).map(d=>d.category))].map(c=>`<button class="${c===category?'active':''}" data-kitchen-action="category" data-value="${esc(c)}" type="button">${esc(c)}</button>`).join('')}</div><div class="kitchen-list" id="kitchenRecipeRows">${recipeRows(filterDishes()) || empty('没有找到这道菜')}</div>`;
    }
    function renderOverview() {
      const rows=response?.month===month?response.month_orders:[], all=rows.flatMap(o=>o.reviews || []);
      const made=rows.filter(o=>['completed','settled'].includes(o.status)).reduce((n,o)=>n+o.items.length,0), avg=all.length?(all.reduce((n,r)=>n+r.stars,0)/all.length).toFixed(1):'—';
      const sum=rows.reduce((n,o)=>n+Number(o.score_delta || 0),0), [y,m]=month.split('-').map(Number), first=new Date(y,m-1,1).getDay(), days=new Date(y,m,0).getDate();
      content.innerHTML=`<div class="kitchen-month-head"><button data-kitchen-action="month" data-value="-1" aria-label="上个月" type="button">‹</button><strong>${y} 年 ${m} 月</strong><button data-kitchen-action="month" data-value="1" aria-label="下个月" type="button">›</button></div><div class="kitchen-month-summary"><div><strong>${made}</strong><span>完成菜品</span></div><div><strong>${avg}</strong><span>平均星级</span></div><div><strong>${signed(sum)}</strong><span>订单结算积分</span></div></div><div class="kitchen-card"><div class="kitchen-calendar">${['日','一','二','三','四','五','六'].map(d=>`<div class="weekday">${d}</div>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:days},(_,i)=>{const key=`${y}-${String(m).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return `<button class="${selectedDay===key?'selected ':''}${dateKey(new Date())===key?'today':''}" data-kitchen-action="day" data-value="${key}" aria-label="${m}月${i+1}日" aria-pressed="${selectedDay===key}" type="button">${i+1}${rows.some(o=>dateKey(o.created_at)===key)?'<small></small>':'<span style="height:4px"></span>'}</button>`;}).join('')}</div></div><p class="kitchen-caption">按订单发起的北京时间日期归档</p><div id="kitchenDay">${selectedDay?dayRows(rows.filter(o=>dateKey(o.created_at)===selectedDay)):empty('选择一个日期','看看那天点了哪些菜，收到了什么评价。')}</div>`;
    }
    function dayRows(rows) {
      return `<div class="kitchen-section-head"><h2>${esc(selectedDay.slice(5).replace('-','月'))}日的订单</h2><span>${rows.length} 笔</span></div>${rows.map(o=>`<article class="kitchen-card"><div class="kitchen-order-head"><button class="kitchen-link" data-kitchen-action="order" data-value="${esc(o.id)}" type="button">${stamp(o.created_at)} · #${esc(o.id)}</button>${status(o)}</div>${o.items.map(d=>{const r=o.reviews?.find(r=>r.slug===d.slug);return `<div class="kitchen-day-dish"><div><strong>${esc(d.name)}</strong><span class="kitchen-rating">${r?`★ ${r.stars}`:o.status==='completed'?'待评价':'—'}</span></div>${r?.comment?`<p>${esc(r.comment.slice(0,70))}</p>${r.comment.length>70?`<details><summary>查看完整评价</summary><p>${esc(r.comment)}</p></details>`:''}`:''}</div>`;}).join('')}${o.status==='settled'?`<p class="kitchen-meta">本单积分 ${signed(o.score_delta)}</p>`:''}</article>`).join('') || empty('这一天没有订单')}`;
    }
    function showCritical() {
      if(role!=='guest' || !notifications.length) {hideCritical();return;}
      presented=structuredClone(notifications);
      q('kitchenCriticalTitle').textContent=notifications.length>1?`厨房有 ${notifications.length} 笔订单更新`:notifications[0].status==='cancelled'?'哥哥取消了这笔订单':notifications[0].version>1?'哥哥修改了点菜订单':'哥哥发来了点菜请求';
      q('kitchenCriticalCopy').textContent='请查看最新变化。取消的订单无需继续制作。';
      q('kitchenCriticalList').innerHTML=presented.map(n=>{
        const old=n.previous?.items || [], added=n.items.filter(d=>!old.some(x=>x.slug===d.slug)), removed=old.filter(d=>!n.items.some(x=>x.slug===d.slug));
        return `<li><strong>订单 #${esc(n.id)} · ${labels[n.status]}</strong><br>${n.status==='cancelled'?'无需继续制作':n.items.map(d=>esc(d.name)).join('、')}${n.previous && n.status!=='cancelled'?`${added.length?`<br>新增：${added.map(d=>esc(d.name)).join('、')}`:''}${removed.length?`<br>移除：${removed.map(d=>esc(d.name)).join('、')}`:''}${n.note!==n.previous.note?`<br>备注：${esc(n.note) || '已清空'}`:''}`:''}</li>`;
      }).join('');
      const first=critical.hidden; if(first)noticeFocus=document.activeElement; critical.hidden=false; app.inert=true; document.body.style.overflow='hidden';
      if(first) critical.querySelector('button').focus();
    }
    function hideCritical() {const visible=!critical.hidden;critical.hidden=true;app.inert=false;document.body.style.overflow='';q('kitchenCriticalError').hidden=true;if(visible)(noticeFocus?.isConnected && noticeFocus.getClientRects().length?noticeFocus:app.querySelector('.app-nav [aria-current="page"]'))?.focus({preventScroll:true});noticeFocus=null;}
    async function acknowledge(view) {
      if(busy) return; busy=true; const shown=structuredClone(presented), token=epoch;
      critical.querySelectorAll('button').forEach(b=>b.disabled=true);
      try {await rpc('points_kitchen_guest_ack',{p_versions:shown.map(n=>({id:n.id,version:n.version}))});
        if(token!==epoch)return; hideCritical();notifications=[];busy=false;
        if(view) {navigate('kitchen');tab='orders';render();if(shown.length===1)await openOrder(shown[0].id);}
        await refresh();
      } catch(e) {if(token===epoch){q('kitchenCriticalError').textContent=failure(e);q('kitchenCriticalError').hidden=false;}}
      finally {if(token===epoch){busy=false;critical.querySelectorAll('button').forEach(b=>b.disabled=false);}}
    }
    function openModal(next,push=false) {if(push && modal)stack.push(modal);else stack=[];modal=next;previousFocus=document.activeElement;ui.setLayer(layer,true);renderDialog();layer.querySelector('[role="dialog"]').focus({preventScroll:true});}
    function closeDialog() {if(busy)return;if(modal?.type==='rating')void saveDraft();modalToken++;modal=null;stack=[];ui.setLayer(layer,false);if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});}
    async function openOrder(id) {
      if(!deployed)return;const token=++modalToken, identity=epoch;openModal({type:'loading',title:'订单详情'});
      try {if(admin())await draftQueue;if(token!==modalToken || identity!==epoch)return;const o=await rpc('points_kitchen_get_order',{p_order_id:id});if(token!==modalToken || identity!==epoch)return;
        modal={type:'order',order:o};const target=modal;renderDialog();if(role==='guest' && o.status==='pending'){await rpc('points_kitchen_guest_seen',{p_order_id:o.id,p_version:o.version});if(modal===target && identity===epoch){o.seen_version=o.version;renderDialog();}}
      }catch(e){if(token===modalToken && identity===epoch){modal={type:'error',message:failure(e)};renderDialog();}}
    }
    // Dialog renderers and mutations follow; kept separate from the page rendering.
    function renderDialog() {
      if(!modal)return;foot.hidden=true;foot.innerHTML='';q('kitchenDialogTitle').textContent=modal.title || ({order:'订单详情',editor:modal.order?'编辑订单':'发起点菜',recipe:'菜谱详情',rating:'评价这次制作',confirm:'确认操作',error:'暂未完成'}[modal.type] || '厨房');
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
      body.innerHTML=`<div class="kitchen-order-head"><strong>订单 #${esc(o.id)}</strong>${status(o)}</div><p class="kitchen-caption">${stamp(o.created_at)} · 菜单版本 ${o.version}${admin()?` · ${o.seen_version>=o.version?'宝宝已查看':'宝宝尚未查看最新版本'}`:''}</p>${o.note?`<p class="kitchen-note">${esc(o.note)}</p>`:''}<div class="kitchen-list">${o.items.map(d=>`<button class="kitchen-dish-row" data-kitchen-action="order-recipe" data-value="${esc(d.slug)}" type="button"><span class="kitchen-dish-mark">${esc(d.name.slice(0,1))}</span><span class="kitchen-dish-copy"><strong>${esc(d.name)}</strong><small>${d.minutes} 分钟 · 查看制作方法</small></span><span>›</span></button>`).join('')}</div>${o.reviews.length?`<div class="kitchen-section-head"><h2>这次的评价</h2><span>${signed(o.score_delta)} 分</span></div>${o.reviews.map(r=>`<div class="kitchen-review-row"><div class="kitchen-order-head"><strong>${esc(o.items.find(d=>d.slug===r.slug)?.name)}</strong><span class="kitchen-rating">★ ${r.stars} · ${signed(delta(r.stars))} 分</span></div>${r.comment?`<p class="kitchen-note">${esc(r.comment)}</p>`:''}</div>`).join('')}`:''}${o.resolution_note?`<p class="kitchen-note">${esc(o.resolution_note)}</p>`:''}<details class="kitchen-version"><summary>时间与修改记录</summary><p>制作完成：${stamp(o.completed_at)}<br>处理／结算：${stamp(o.resolved_at)}</p>${(o.versions || []).map(v=>`<p>版本 ${v.version} · ${stamp(v.changed_at)}<br>${v.items.map(d=>esc(d.name)).join('、')}${v.note?`<br>备注：${esc(v.note)}`:''}${v.status==='cancelled'?'<br>订单已取消':''}</p>`).join('')}</details>`;
      const actions=o.status==='pending'?(admin()?btn('edit','编辑订单',o.id,'primary')+btn('cancel-order','取消订单',o.id,'destructive'):btn('complete','制作完成',o.id,'primary',o.seen_version<o.version)+btn('reject','拒绝订单',o.id,'destructive',o.seen_version<o.version)):o.status==='completed' && admin()?btn('rate','评价并结算',o.id,'primary'):'';
      foot.hidden=!actions;foot.innerHTML=`<div class="kitchen-actions">${actions}</div>`;
    }
    function renderEditor() {
      const available=dishes.filter(d=>d.active!==false || modal.selected.includes(d.slug));
      body.innerHTML=`<p class="kitchen-caption">选择想吃的菜 · 点击菜名查看做法</p><div class="kitchen-list">${recipeRows(available,true)}</div><label class="kitchen-caption" for="kitchenNote">给宝宝的备注（可选）</label><textarea class="kitchen-textarea" id="kitchenNote" maxlength="500" placeholder="例如：少辣一点，鸡翅做软一些">${esc(modal.note)}</textarea>`;
      foot.hidden=false;foot.innerHTML=`<p>已选 ${modal.selected.length} 道菜</p>${btn('save-order',modal.order?'保存修改':'发送点菜请求','','primary kitchen-full',!modal.selected.length || modal.selected.length>24)}`;
    }
    function renderRecipe() {
      const d=modal.recipe, current=dishes.find(x=>x.slug===d.slug) || d, reviewMode=modal.view==='reviews';
      body.innerHTML=`${stack.length?btn('back','‹ 返回'):''}<h3 class="kitchen-recipe-title">${esc(d.name)}</h3><div class="kitchen-recipe-summary"><span>${d.servings || 2} 人份 · ${d.minutes} 分钟</span><span>${current.rating_count?`★ ${Number(current.rating_average).toFixed(1)} · ${current.rating_count} 次评价`:'暂无评价'}</span></div><div class="kitchen-tabs" role="tablist" aria-label="菜品详情"><button data-kitchen-action="recipe-tab" data-value="method" role="tab" aria-selected="${!reviewMode}" type="button">制作方法</button><button data-kitchen-action="recipe-tab" data-value="reviews" role="tab" aria-selected="${reviewMode}" type="button">历史评价</button></div>${reviewMode?((modal.reviews || []).map(r=>`<article class="kitchen-review-row"><div class="kitchen-order-head"><span class="kitchen-rating">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</span><span class="kitchen-caption">${stamp(r.reviewed_at)}</span></div>${r.comment?`<p class="kitchen-note">${esc(r.comment)}</p>`:''}<button class="kitchen-link" data-kitchen-action="order" data-value="${esc(r.order_id)}" type="button">订单 #${esc(r.order_id)} · 查看当时菜品 ›</button></article>`).join('') || empty(modal.loading?'正在读取评价':'还没有评价','完成制作后，哥哥的评分会保存在这里。')):`${d.description?`<p class="kitchen-caption">${esc(d.description)}</p>`:''}<div class="kitchen-card"><h4>食材与调料</h4><dl class="kitchen-ingredients">${(d.ingredients || []).map(([name,amount])=>`<div><dt>${esc(name)}</dt><dd>${esc(amount)}</dd></div>`).join('')}</dl></div><ol class="kitchen-steps">${(d.steps || []).map(s=>`<li>${esc(s)}</li>`).join('')}</ol>${d.tips?.length?`<div class="kitchen-note">${d.tips.map(esc).join('<br>')}</div>`:''}${sourceMarkup(d)}`}${modal.error?`<div class="kitchen-error">${esc(modal.error)}</div>`:''}${reviewMode && modal.more?btn('more-reviews','查看更早评价','','kitchen-full'):''}`;
    }
    function sourceMarkup(d) {
      let link='';try{const url=new URL(d.source?.url);if(url.protocol==='https:')link=`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">查看原做法 ↗</a>`;}catch(_){}
      return `<details class="kitchen-version"><summary>做法来源与整理说明</summary><p>${esc(d.source?.platform)} · ${esc(d.source?.author)}<br>${esc(d.source?.evidence || '')}<br>${link}</p><p>参考公开做法重新整理为家庭版本；份量、时间为参考，按食材大小与锅具调整。整理日期 ${esc(d.recipe_version)}。</p></details>`;
    }
    async function loadReviews(append=false) {
      if(modal?.type!=='recipe')return;const target=modal,token=epoch;target.loading=true;
      if(!deployed){target.loading=false;renderDialog();return;}
      try {const data=await rpc('points_kitchen_get_reviews',{p_slug:target.recipe.slug,p_before:append?target.reviews.at(-1)?.order_id:null});
        if(modal!==target || token!==epoch)return;target.reviews=append?[...target.reviews,...data.reviews]:data.reviews;target.more=data.more;target.error='';
      }catch(e){if(modal===target && token===epoch)target.error=failure(e);}finally{target.loading=false;if(modal===target)renderDialog();}
    }
    function renderRating() {
      const o=modal.order, selected=modal.index || 0, d=o.items[selected], r=modal.ratings.find(r=>r.slug===d.slug);
      const tabButton=(item,i)=>`<button data-kitchen-action="rating-tab" data-value="${i}" role="tab" aria-selected="${selected===i}" type="button" title="${esc(item.name)}">${esc(item.name)}${modal.ratings.find(r=>r.slug===item.slug)?.stars?' ✓':''}</button>`;
      const tabs=o.items.length<=4?o.items.map(tabButton).join(''):o.items.slice(0,3).map(tabButton).join('')+`<div class="kitchen-overflow"><button data-kitchen-action="rating-menu" aria-haspopup="menu" aria-expanded="${!!modal.menu}" aria-selected="${selected>=3}" type="button">${selected>=3?esc(d.name):'更多'} ▾</button><div class="kitchen-overflow-menu" role="menu" ${modal.menu?'':'hidden'}>${o.items.slice(3).map((item,i)=>`<button data-kitchen-action="rating-tab" data-value="${i+3}" role="menuitem" type="button"><span>${esc(item.name)}</span><small>${modal.ratings.find(r=>r.slug===item.slug)?.stars?'已评分':'未评分'}</small></button>`).join('')}</div></div>`;
      body.innerHTML=`<div class="kitchen-tabs" role="tablist" aria-label="选择评价菜品">${tabs}</div><h3 class="kitchen-recipe-title" style="text-align:center">${esc(d.name)}</h3><div class="kitchen-star-input" role="radiogroup" aria-label="${esc(d.name)}星级">${[1,2,3,4,5].map(n=>`<button class="${r.stars>=n?'selected':''}" data-kitchen-action="star" data-value="${n}" aria-label="${n}颗星" aria-checked="${r.stars===n}" role="radio" type="button">★</button>`).join('')}</div><p class="kitchen-rating-note">${r.stars?`${r.stars} 颗星 · 本菜 ${signed(delta(r.stars))} 分`:'请选择 1～5 颗星（必选）'}</p><label class="kitchen-caption" for="kitchenComment">给宝宝的评价（可选）</label><textarea class="kitchen-textarea" id="kitchenComment" maxlength="1000" placeholder="哪里做得好，下次想怎样调整？">${esc(r.comment)}</textarea><p class="kitchen-caption" id="kitchenDraftStatus">草稿自动保存 · 提交后才结算</p>`;
      const count=modal.ratings.filter(r=>r.stars).length,total=modal.ratings.reduce((n,r)=>n+delta(r.stars),0);foot.hidden=false;
      foot.innerHTML=`<p>已评分 ${count} / ${o.items.length} 道 · 预计合计 ${signed(total)} 分</p>${btn(count===o.items.length?'submit-review':'next-rating',count===o.items.length?'提交评价并结算':'下一道未评分','','primary kitchen-full')}`;
    }
    function renderConfirm() {
      body.innerHTML=`<p class="kitchen-note">${esc(modal.message)}</p>${modal.reject?'<label class="kitchen-caption" for="kitchenReason">拒绝原因（可选）</label><textarea class="kitchen-textarea" id="kitchenReason" maxlength="500"></textarea>':''}`;
      foot.hidden=false;foot.innerHTML=btn('confirm','确认','','primary kitchen-full')+btn('back','返回');
    }
    function confirm(message,name,args,key,reject=false) {openModal({type:'confirm',message,name,args,key,reject},true);}
    async function saveDraft(target=modal) {
      clearTimeout(draftTimer);if(target?.type!=='rating' || !admin())return draftQueue;
      const ratings=structuredClone(target.ratings),token=epoch,id=target.order.id,serial=++draftSerial;
      draftQueue=draftQueue.catch(()=>{}).then(async()=>{if(token!==epoch || !admin())return;try {
        await rpc('points_kitchen_admin_draft',{p_order_id:id,p_ratings:ratings});
        if(serial===draftSerial && modal===target && token===epoch)q('kitchenDraftStatus').textContent='草稿已保存 · 尚未结算';
      }catch(e){if(modal===target && token===epoch)q('kitchenDraftStatus').textContent='草稿暂未同步，当前填写仍保留；可以直接提交完整评价。';}});
      return draftQueue;
    }
    async function mutate(name,args,key,original=null) {
      if(busy || ['waiting','verifying'].includes(role))return;busy=true;const token=++epoch;pending=null;
      const storageKey=original?.key || `points_kitchen_operation:${role}:${key}`;
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
      if(a==='settings')return els.settingsBtn.click();
      if(a==='close')return closeDialog();
      if(a==='back'){modal=stack.pop() || null;if(!modal)return closeDialog();renderDialog();return;}
      if(a==='tab'){tab=v;render();if(v==='overview')await refresh();return;}
      if(a==='history'){history=!history;render();return;}
      if(a==='refresh')return refresh();
      if(a==='more-orders')return refresh({before:response.cursor,append:true});
      if(a==='category'){category=v;renderCatalog();return;}
      if(a==='month'){const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+Number(v),1);month=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;epoch++;pending=null;selectedDay=null;renderOverview();await refresh();renderOverview();return;}
      if(a==='day'){selectedDay=v;renderOverview();return;}
      if(a==='order')return openOrder(v);
      if(a==='recipe' || a==='order-recipe'){const d=a==='order-recipe'?modal.order.items.find(d=>d.slug===v):dishes.find(d=>d.slug===v);if(d)openModal({type:'recipe',recipe:d,view:'method'},!!modal);return;}
      if(a==='recipe-tab'){modal.view=v;renderDialog();if(v==='reviews')await loadReviews();return;}
      if(a==='more-reviews')return loadReviews(true);
      if(a==='create' && admin()){openModal({type:'editor',selected:[],note:''});return;}
      if(a==='edit' && admin()){const o=modal.order;openModal({type:'editor',order:o,selected:o.items.map(d=>d.slug),note:o.note},true);return;}
      if(a==='pick'){modal.selected=modal.selected.includes(v)?modal.selected.filter(s=>s!==v):[...modal.selected,v];renderDialog();return;}
      if(a==='save-order'){const m=modal;confirm(`${m.order?'保存菜单修改':'发送点菜请求'}：${m.selected.map(s=>dishes.find(d=>d.slug===s)?.name).join('、')}${m.note?`。备注：${m.note}`:''}`, 'points_kitchen_admin_save',{p_items:m.selected,p_note:m.note,p_order_id:m.order?.id || null,p_version:m.order?.version || null,p_cancel:false},`save:${m.order?.id || 'new'}`);return;}
      if(a==='cancel-order'){const o=modal.order;confirm('取消后宝宝无需继续制作，订单将永久保留在历史中，不影响积分。','points_kitchen_admin_save',{p_items:o.items.map(d=>d.slug),p_note:o.note,p_order_id:o.id,p_version:o.version,p_cancel:true},`save:${o.id}`);return;}
      if(a==='complete' || a==='reject'){const o=modal.order;confirm(a==='reject'?'拒绝整笔订单，不评分、不变动积分。':'确认这笔订单的全部菜品已经制作完成，之后菜单将固定并等待哥哥评价。','points_kitchen_guest_resolve',{p_order_id:o.id,p_version:o.version,p_reject:a==='reject',p_reason:''},`resolve:${o.id}`,a==='reject');return;}
      if(a==='rate' && admin()){const o=modal.order;openModal({type:'rating',order:o,index:0,ratings:o.items.map(d=>({slug:d.slug,stars:o.draft?.find(r=>r.slug===d.slug)?.stars || null,comment:o.draft?.find(r=>r.slug===d.slug)?.comment || ''}))},true);return;}
      if(a==='rating-tab'){void saveDraft();modal.index=Number(v);modal.menu=false;renderDialog();return;}
      if(a==='rating-menu'){modal.menu=!modal.menu;renderDialog();return;}
      if(a==='star'){modal.ratings[modal.index].stars=Number(v);void saveDraft();renderDialog();return;}
      if(a==='next-rating'){const index=modal.ratings.findIndex(r=>!r.stars);modal.index=index<0?0:index;void saveDraft();renderDialog();return;}
      if(a==='submit-review'){await saveDraft();const m=modal;if(m?.type!=='rating' || m.ratings.some(r=>!r.stars))return;confirm(`提交 ${m.ratings.length} 道菜的评价，合计 ${signed(m.ratings.reduce((n,r)=>n+delta(r.stars),0))} 分。确认后自动结算。`,'points_kitchen_admin_review',{p_order_id:m.order.id,p_ratings:structuredClone(m.ratings)},`review:${m.order.id}`);return;}
      if(a==='confirm'){const m=modal;if(m.reject)m.args.p_reason=q('kitchenReason').value;return mutate(m.name,m.args,m.key);}
      if(a==='retry'){try{const op=JSON.parse(localStorage.getItem(v));if(op)return mutate(op.name,op.args,'',{key:v,op});}catch(_){ui.showToast('无法读取待确认操作');}}
    }
    document.addEventListener('click',event=>{
      if(!critical.hidden && !critical.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();return;}
      if(event.target.closest('[data-kitchen-action]'))void act(event).catch(e=>ui.showToast(failure(e)));
    },true);
    app.addEventListener('input',event=>{
      if(event.target.id==='kitchenSearch'){query=event.target.value;q('kitchenRecipeRows').innerHTML=recipeRows(filterDishes()) || empty('没有找到这道菜');}
      if(event.target.id==='kitchenNote' && modal?.type==='editor')modal.note=event.target.value;
      if(event.target.id==='kitchenComment' && modal?.type==='rating'){modal.ratings[modal.index].comment=event.target.value;clearTimeout(draftTimer);const target=modal;draftTimer=setTimeout(()=>void saveDraft(target),650);}
    });
    layer.addEventListener('click',e=>{if(e.target===layer)closeDialog();});
    document.addEventListener('keydown',e=>{
      const scope=!critical.hidden?critical:layer.classList.contains('open')?layer:null;if(!scope)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(scope===layer && !busy){if(modal?.menu){modal.menu=false;renderDialog();}else closeDialog();}return;}
      if(e.key==='Tab'){const focusable=[...scope.querySelectorAll('button:not(:disabled),input,textarea,summary,a[href]')].filter(x=>x.getClientRects().length);if(!focusable.length){e.preventDefault();return;}const index=focusable.indexOf(document.activeElement);if(e.shiftKey && index<=0 || !e.shiftKey && (index<0 || index===focusable.length-1)){e.preventDefault();focusable[e.shiftKey?focusable.length-1:0].focus();}}
      if(scope===critical)e.stopImmediatePropagation();
    },true);
    const resume=()=>{if(!document.hidden)void refresh();};
    document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);window.addEventListener('online',resume);
    function roleChanged(authReady=false) {
      ready=ready || authReady;const next=!ready?'waiting':state.session?state.isAdmin?`admin:${state.session.user.id}`:'verifying':'guest';
      if(next===role)return;role=next;epoch++;pending=null;response=null;deployed=false;orders=[];notifications=[];error='';dishes=window.PointsKitchenRecipes || [];
      clearTimeout(draftTimer);draftSerial++;busy=false;hideCritical();closeDialog();render();if(!['waiting','verifying'].includes(role))void refresh();
    }
    render(); return {refresh,roleChanged};
  }
  window.PointsKitchen={attach};
})();
