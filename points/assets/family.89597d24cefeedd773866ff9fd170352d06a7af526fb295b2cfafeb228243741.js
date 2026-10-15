if(window.PointsStartup.canStart()){try{
/* Unified household presentation and tasks; point and meal history primitives remain separate. */
(() => {
 'use strict';
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={pending:'待完成',review:'待验收',rework:'需返工',settled:'已完成',cancelled:'已取消'};
 const icons={dishes:'◌',cooking:'♨',floor:'↗',laundry:'≈',tidying:'▧',trash:'▱'};
 const homeIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/></svg>';
 const worldIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="6.5"/><ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-28 12 12)"/></svg>';
 const stamp=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
 const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const shiftDay=(value,days)=>{const d=new Date(value+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
 const dayLabel=value=>`${value.replaceAll('-','.')} 周${'日一二三四五六'[new Date(value+'T00:00:00Z').getUTCDay()]}${value===today()?' · 今天':''}`;
 const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 function attach({db,state,els,ui}) {
  const app=document.getElementById('pointsApp'),q=id=>document.getElementById(id);
  app.dataset.page='world';
  app.insertAdjacentHTML('beforeend',`<section id="kitchenPage" class="family-page" hidden aria-label="小家庭"><header class="kitchen-header"><div class="app-brand"><img alt="" aria-hidden="true" class="app-brand-icon" src="./ICON/apple-touch-icon.png"/><div class="app-brand-copy"><h1 class="app-brand-title">小家庭</h1><p class="app-brand-caption">一起照顾我们的日常</p></div></div><button class="icon-button pressable" data-family-action="settings" aria-label="设置" type="button">${els.settingsBtn.innerHTML}</button></header><p id="familyGreeting" class="family-greeting"></p><nav class="kitchen-tabs" role="tablist" aria-label="家庭内容">${[['orders','家事'],['catalog','菜谱'],['overview','记录']].map(([v,l])=>`<button role="tab" data-kitchen-action="tab" data-value="${v}" aria-selected="${v==='orders'}">${l}</button>`).join('')}</nav><div id="familyError" class="family-error" role="status" hidden></div><div id="kitchenContent"></div></section>
  <nav class="app-nav" aria-label="主导航"><button data-kitchen-action="page" data-value="world" aria-current="page">${worldIcon}<span>小世界</span></button><button data-kitchen-action="page" data-value="kitchen">${homeIcon}<span>小家庭</span></button></nav>
  <div id="kitchenLayer" class="modal-layer kitchen-layer family-layer" aria-hidden="true"><section class="kitchen-panel" role="dialog" aria-modal="true" aria-labelledby="familyTitle" tabindex="-1"><header class="kitchen-panel-head"><button data-family-action="back" aria-label="返回上一页" hidden>‹</button><h2 id="familyTitle"></h2><button data-family-action="close" aria-label="关闭家庭窗口">×</button></header><div class="kitchen-panel-body" id="familyBody"></div><footer class="kitchen-panel-foot" id="familyFoot" hidden></footer></section></div>`);
  const setting=document.createElement('section');setting.id='familyScoreSettings';
  setting.innerHTML='<div class="settings-label">小家庭</div><div class="settings-group"><button id="familyScoreSettingsBtn" class="settings-row pressable" type="button"><span id="familyScoreSettingsLabel">家务分值表</span><span class="chevron">›</span></button></div>';
  q('fatUnitSettings')?.after(setting);if(!setting.isConnected)q('settingsSheet').querySelector('.settings-sheet-content').append(setting);
  const page=q('kitchenPage'),content=q('kitchenContent'),layer=q('kitchenLayer'),body=q('familyBody'),foot=q('familyFoot');
  let role='waiting',epoch=0,ready=false,available=false,types=[],tasks=[],more=false,tab='orders',loading=null,busy=false,error='',modal=null,stack=[],focus=null;
  let recordDay=today(),dayLoading=false,dayApi=null,swipe=null,suppressPickerClickUntil=0;
  const admin=()=>role.startsWith('admin:');
  const btn=(a,label,v='',primary=false,disabled=false)=>`<button class="kitchen-button${primary?' primary':''}" data-family-action="${a}" data-value="${esc(v)}" type="button"${disabled||busy?' disabled':''}>${label}</button>`;
  const empty=(title,copy)=>`<div class="family-empty">${homeIcon}<h3>${esc(title)}</h3><p>${esc(copy)}</p></div>`;
  const badge=t=>`<span class="family-status ${t.status}">${labels[t.status]}</span>`;
  function describe(e){
   if(e?.code==='P0002')return '这件家事已撤回或已不存在。';
   if(e?.code==='40001')return '这项内容已经更新，请查看最新状态后再操作。';
   if(e?.code==='42501')return '当前身份或任务状态不允许这项操作，请重新同步。';
   if(/Points not configured/.test(e?.message||''))return '这项家务还没有设置分值，请哥哥先在设置中配置。';
   if(/Invalid points/.test(e?.message||''))return '请输入 0.5 至 1000 的分值，且必须是 0.5 的倍数。';
   if(/Score object changed/.test(e?.message||''))return '积分对象已变化，请哥哥核对账户配置。';
   return '结果暂未确认。请重试原操作，系统会避免重复提交和结算。';
  }

  async function rpc(name,args={}){const r=await db.rpc(name,args);if(r.error)throw r.error;return r.data;}
  async function readDay(token,append){
   if(dayApi!==false)try{
    const result=await rpc('points_family_get_day',{p_date:recordDay,p_before:append?tasks.at(-1)?.id:null});dayApi=true;return result;
   }catch(e){if(!/PGRST202|42883/.test(e.code||''))throw e;dayApi=false;window.PointsRuntime?.clear('points_family_get_day');}
   // Older deployments remain complete: exhaust both existing state partitions before filtering.
   const rows=[];let result;
   for(const history of [false,true]){
    let before=null;
    do{
     if(token!==epoch)return null;
     result=await rpc('points_family_get_state',{p_history:history,p_before:before});
     if(!Array.isArray(result.tasks)||result.admin!==admin())throw Error('Invalid family state');
     rows.push(...result.tasks);const next=result.tasks.at(-1)?.id;
     if(result.more&&(!next||next===before))throw Error('Invalid family cursor');
     before=result.more?next:null;
    }while(before);
   }
   return {...result,tasks:[...new Map(rows.map(t=>[t.id,t])).values()].filter(t=>t.task_date===recordDay).sort((a,b)=>BigInt(b.id)>BigInt(a.id)?1:-1),more:false};
  }
  async function refresh({append=false}={}){
   if(!ready||role==='waiting'||role==='verifying'||busy)return false;
   if(loading)return loading;const token=epoch;content.dataset.pointsSynced='false';dayLoading=tab==='overview';if(dayLoading)render();
   const work=(async()=>{try{
    const result=tab==='overview'?await readDay(token,append):await rpc('points_family_get_state',{p_history:false,p_before:append?tasks.at(-1)?.id:null});
    if(token!==epoch)return false;if(result.admin!==admin()||!Array.isArray(result.tasks))throw Error('Invalid family state');
    types=result.types;tasks=append?[...tasks,...result.tasks]:result.tasks;more=result.more;available=true;error='';content.dataset.pointsSynced='true';render();return true;
   }catch(e){if(token!==epoch)return false;available=false;error=/PGRST202|42883/.test(e.code||'')?'小家庭尚未配置，菜谱和原餐次记录仍可查看。请哥哥安装本次家庭升级。':describe(e);render();return false;}
   finally{if(loading===work)loading=null;if(token===epoch){dayLoading=false;render();}}})();loading=work;return work;
  }
  function render(){
   q('familyError').hidden=!error;q('familyError').textContent=error;
   page.querySelectorAll('[role="tab"]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.value===tab)));
   q('familyScoreSettingsLabel').textContent=admin()?'管理家务分值':'家务分值表';
   const work=tasks.filter(t=>admin()?t.status==='review':['pending','rework'].includes(t.status));
   q('familyGreeting').textContent=tab==='catalog'?'挑几道想吃的菜':tab==='overview'?'每一份用心，都记在这里':work.length?`${work.length} 件家事${admin()?'等你验收':'等你照顾'}`:'把小日子，慢慢过好';
   if(tab==='catalog')return renderRecipes();
   const ranked=tab==='overview'?tasks:[...tasks].sort((a,b)=>{const rank=t=>admin()?(t.status==='review'?0:t.status==='rework'?1:2):(t.status==='rework'?0:t.status==='pending'?1:2);return rank(a)-rank(b)||Number(b.id)-Number(a.id);});
   content.innerHTML=`${tab==='orders'?`<div class="family-action-bar"><div><span>今天的小事</span><strong>${tasks.length} 件进行中</strong></div>${btn('create',admin()?'发起家事':'我做完了','','true',!available)}</div>`:dateNavigation()}
   <div class="family-task-list" aria-busy="${dayLoading}">${dayLoading?'<p class="family-day-loading" role="status">正在读取这一天的家事…</p>':ranked.map(card).join('')||empty(tab==='overview'?(error?'这一天的记录暂未读取':'这一天没有家事记录'):'家里暂时没有待办',tab==='overview'?(error?'请同步重试。':'按家事日期归档，提交与验收时间保留在详情中。'):admin()?'发起一件小事，一起照顾这个家。':'做完家务或饭菜，可以主动记下来。')}</div>
   ${more&&!dayLoading?btn('more',tab==='overview'?'查看更多当天记录':'查看更多家事'):''}<div id="kitchenUpdatesSlot"></div><div class="family-bottom-tools">${btn('types','家务分值表')}${btn('refresh','同步家事')}</div>${pendingHtml()}`;
  }
  function dateNavigation(){return `<nav class="family-day-nav" aria-label="家事记录日期"><button data-family-action="day-step" data-value="-1" aria-label="前一天">‹<span>前一天</span></button><button class="family-day-current" data-family-action="calendar" aria-label="选择记录日期"><strong>${esc(dayLabel(recordDay))}</strong><span aria-hidden="true">▾</span></button><button data-family-action="day-step" data-value="1" aria-label="后一天"${recordDay>=today()?' disabled':''}><span>后一天</span>›</button></nav>${recordDay!==today()?`<button class="family-today" data-family-action="today">回到今天</button>`:''}<p class="family-day-caption">${dayLoading?'正在同步':`${tasks.length}${more?'＋':''} 件家事 · 按家事日期归档`}</p>`;}
  function selectDay(value){if(!validDay(value)||value>today())return;recordDay=value;epoch++;loading=null;tasks=[];more=false;dayLoading=true;page.scrollTop=0;render();void refresh();}
  function card(t){return `<button class="family-task-card" data-family-action="task" data-value="${t.id}"><span class="family-task-symbol ${esc(t.type_code)}" aria-hidden="true">${icons[t.type_code]||'◌'}</span><span class="family-task-copy"><span class="family-task-heading"><strong>${esc(t.title)}</strong>${badge(t)}</span><small>${esc(t.origin==='guest'?'宝宝自主登记':'哥哥发起')} · ${esc(stamp(t.created_at))}</small>${t.status==='rework'?`<p>${esc(t.comment||'请重新完成后，再提交哥哥验收。')}</p>`:t.note?`<p>${esc(t.note)}</p>`:''}<span class="family-task-points">${t.points===null?'待设置分值':t.status==='settled'?`已获得 +${t.points} 分`:`合格后 +${t.points} 分`}${t.attempt>1?` · 第 ${t.attempt} 次提交`:''}</span></span><span class="family-chevron">›</span></button>`;}
  function pendingHtml(){try{return Object.keys(localStorage).filter(k=>k.startsWith('points_family_operation:'+role+':')).map(k=>`<div class="family-error">有一次操作结果待确认。${btn('retry','核对上次操作',k)}</div>`).join('');}catch(_){return '';}}
  function navigate(next){if(busy||state.wheelSpinning||state.wheelRequestInFlight)return;close();ui.closeAllLayers();ui.closeOverviewSheet();app.dataset.page=next;page.hidden=next!=='kitchen';app.querySelectorAll('.app-nav button').forEach(b=>{if(b.dataset.value===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(next==='kitchen')void refresh();}
  function show(next,push=false){if(modal)modal.scroll=body.scrollTop;if(push&&modal)stack.push(modal);else stack=[];if(!modal)focus=document.activeElement;modal=next;ui.setLayer(layer,true);renderDialog();body.scrollTop=0;layer.querySelector('[role="dialog"]').focus({preventScroll:true});}
  function close(){if(busy)return;modal=null;stack=[];ui.setLayer(layer,false);if(focus?.isConnected)focus.focus({preventScroll:true});}
  function renderDialog(){
   if(!modal)return;layer.dataset.dialog=modal.kind;foot.hidden=true;foot.innerHTML='';layer.querySelector('[data-family-action="close"]').disabled=busy;layer.querySelector('[data-family-action="back"]').hidden=!stack.length;
   q('familyTitle').textContent={create:admin()?'发起一件家事':'记录做完的家事',picker:'选几道想吃的菜',selected:'这次的菜单',calendar:'选择记录日期',task:'这件家事',review:'验收这件家事',types:'家务分值表',price:'调整家务分值',recipe:'菜谱详情',confirm:'确认操作',loading:'正在读取'}[modal.kind]||'小家庭';
   if(modal.kind==='create')renderCreate();else if(modal.kind==='picker')renderPicker();else if(modal.kind==='selected')renderSelected();else if(modal.kind==='calendar')renderCalendar();else if(modal.kind==='task')renderTask();else if(modal.kind==='review')renderReview();else if(modal.kind==='types')renderTypes();else if(modal.kind==='price')renderPrice();else if(modal.kind==='recipe')renderRecipe();
   else if(modal.kind==='confirm'){body.innerHTML=`<p class="family-copy">${esc(modal.text)}</p>`;foot.hidden=false;foot.innerHTML=`<div class="kitchen-confirm-actions">${btn('back','暂不处理')}${btn('confirm',modal.label,'',true)}</div>`;}
   else body.innerHTML='<p class="family-copy">正在读取，请稍候…</p>';
   if(modal.error)body.insertAdjacentHTML('beforeend',`<p class="family-error" role="alert">${esc(modal.error)}</p>`);
  }
  function renderCreate(){
   const ty=types.find(t=>t.code===modal.type);body.innerHTML=`<p class="family-copy">${admin()?'选择要请宝宝做的事，完成后由你验收。':'记下已经做完的事，等哥哥验收后结算。'}</p><div class="family-type-grid">${types.map(t=>`<button class="family-type${modal.type===t.code?' selected':''}" data-family-action="choose-type" data-value="${t.code}" aria-pressed="${modal.type===t.code}"${t.points===null?' disabled':''}><span aria-hidden="true">${icons[t.code]||'◌'}</span><strong>${esc(t.label)}</strong><small>${t.points===null?'待设置':`+${t.points} 分`}</small></button>`).join('')}</div>${types.some(t=>t.points===null)?'<p class="family-hint">未设置分值的家务，请哥哥先在设置里配置。</p>':''}${ty?.code==='cooking'?`<div class="family-menu-entry"><div><strong>这次想吃什么</strong><small>${modal.items.length?`已选 ${modal.items.length} 道`:'看图挑菜 · 可选'}</small></div>${btn('open-picker',modal.items.length?'继续选菜':'选择菜品')}</div>${selectedRows(modal,true)}`:''}<label class="family-field">${admin()?'具体要求（可选）':'完成说明（可选）'}<textarea id="familyNote" maxlength="500" placeholder="写下需要留意的小细节">${esc(modal.note)}</textarea></label>`;
   foot.hidden=false;foot.innerHTML=btn('save-create',admin()?'发起这件家事':'提交完成记录','',true,!ty||ty.points===null);
  }
  const recipes=()=>window.PointsKitchenRecipes||[];
  function dishImage(d,className=''){return d?.image?`<img class="family-food-image ${className}" src="${esc(d.image)}" alt="" loading="lazy" decoding="async" draggable="false"/>`:`<span class="family-food-fallback ${className}" aria-hidden="true">♨</span>`;}
  function selectedRows(draft,editable){return `<div class="family-menu-list">${draft.items.map(slug=>{const d=recipes().find(r=>r.slug===slug);return d?`<div class="family-menu-row"><button class="family-menu-recipe" data-family-action="recipe" data-value="${esc(slug)}" aria-label="查看${esc(d.name)}做法">${dishImage(d)}<span><strong>${esc(d.name)}</strong><small>${esc(d.category)}</small></span></button>${editable?`<button class="family-menu-remove" data-family-action="remove-dish" data-value="${esc(slug)}" aria-label="移除${esc(d.name)}">×</button>`:''}</div>`:'';}).join('')}</div>`;}
  function pickerList(){const m=modal,query=m.browser.query.trim().toLocaleLowerCase();return recipes().filter(d=>query?[d.name,...(d.aliases||[])].some(s=>s.toLocaleLowerCase().includes(query)):m.browser.category==='全部'||d.category===m.browser.category);}
  function renderPicker(){
   const m=modal,b=m.browser;body.innerHTML=`<div class="family-picker-tools"><input id="familyPickerSearch" class="kitchen-search" type="search" aria-label="搜索要选的菜" placeholder="搜索菜名" value="${esc(b.query)}"/><nav class="family-picker-categories" aria-label="菜品分类">${['全部',...new Set(recipes().map(d=>d.category))].map(c=>`<button data-family-action="dish-category" data-value="${esc(c)}" aria-pressed="${!b.query&&b.category===c}">${esc(c)}<small>${c==='全部'?recipes().length:recipes().filter(d=>d.category===c).length}</small></button>`).join('')}</nav></div><div class="family-picker-grid" id="familyPickerGrid" aria-label="菜品选择" tabindex="0"></div><nav class="family-picker-pages" id="familyPickerPages" aria-label="菜品分页"></nav>`;
   renderPickerPage();renderPickerFoot();
  }
  function renderPickerPage(){
   const m=modal,list=pickerList(),pages=Math.max(1,Math.ceil(list.length/4));m.browser.page=Math.max(0,Math.min(pages-1,m.browser.page));
   q('familyPickerGrid').innerHTML=list.slice(m.browser.page*4,m.browser.page*4+4).map(d=>{const selected=m.draft.items.includes(d.slug);return `<article class="family-picker-card${selected?' selected':''}"><button class="family-picker-recipe" data-family-action="recipe" data-value="${esc(d.slug)}" aria-label="查看${esc(d.name)}做法">${dishImage(d)}<span><strong>${esc(d.name)}</strong><small>${esc(d.category)}</small></span></button><button class="family-picker-select" data-family-action="pick" data-value="${esc(d.slug)}" aria-label="${selected?'移除':'选择'}${esc(d.name)}" aria-pressed="${selected}"><span aria-hidden="true">${selected?'✓':'＋'}</span><span>${selected?'已选':'选择'}</span></button></article>`;}).join('')||'<p class="family-picker-empty">没有找到这道菜，试试其他菜名。</p>';
   q('familyPickerPages').innerHTML=`<button data-family-action="dish-page" data-value="-1" aria-label="上一页菜品"${m.browser.page===0?' disabled':''}>‹</button><span aria-live="polite">第 ${m.browser.page+1} / ${pages} 页<small>${list.length} 道菜 · 左右滑动翻页</small></span><button data-family-action="dish-page" data-value="1" aria-label="下一页菜品"${m.browser.page>=pages-1?' disabled':''}>›</button>`;
  }
  function renderPickerFoot(){const d=modal.draft;foot.hidden=false;foot.innerHTML=`<div class="family-picker-footer"><button class="family-picked-summary" data-family-action="selected-menu" aria-label="查看已选菜单"><span class="family-picked-images">${d.items.slice(0,3).map(s=>dishImage(recipes().find(r=>r.slug===s))).join('')}</span><span><strong>已选 ${d.items.length} 道</strong><small>${d.items.length?'查看菜单':'慢慢挑，选你想吃的'}</small></span></button>${btn('finish-picking','选好了','',true)}</div>`;}
  function renderSelected(){body.innerHTML=`<p class="family-copy">已选 ${modal.draft.items.length} 道菜，点菜名查看做法。</p>${modal.draft.items.length?selectedRows(modal.draft,true):empty('菜单还是空的','回去挑几道想吃的菜。')}`;foot.hidden=false;foot.innerHTML=`<div class="family-selected-actions">${btn('back','继续挑菜')}${btn('finish-picking','选好了','',true)}</div>`;}
  function renderCalendar(){
   const [year,month]=modal.month.split('-').map(Number),first=new Date(Date.UTC(year,month-1,1)).getUTCDay(),count=new Date(Date.UTC(year,month,0)).getUTCDate();
   body.innerHTML=`<div class="family-calendar-head"><button data-family-action="calendar-month" data-value="-1" aria-label="上个月">‹</button><strong>${year} 年 ${month} 月</strong><button data-family-action="calendar-month" data-value="1" aria-label="下个月"${modal.month>=today().slice(0,7)?' disabled':''}>›</button></div><div class="family-calendar-grid">${[...'日一二三四五六'].map(d=>`<span class="family-calendar-week">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:count},(_,i)=>{const value=`${modal.month}-${String(i+1).padStart(2,'0')}`;return `<button class="${value===recordDay?'selected ':''}${value===today()?'is-today':''}" data-family-action="calendar-day" data-value="${value}" aria-label="${value}" aria-pressed="${value===recordDay}"${value>today()?' disabled':''}>${i+1}</button>`;}).join('')}</div>`;
   foot.hidden=false;foot.innerHTML=btn('calendar-today','回到今天');
  }
  function renderTask(){const t=modal.task;
   body.innerHTML=`<div class="family-detail-head"><span class="family-task-symbol">${icons[t.type_code]||'◌'}</span><div><h3>${esc(t.title)}</h3>${badge(t)}</div><strong>${t.points===null?'待设置':`+${t.points} 分`}</strong></div><p class="family-copy">${t.status==='settled'?'积分已到账':t.status==='review'?'宝宝已提交完成，等待哥哥验收':t.status==='rework'?'验收未通过，请返工后再次提交':'完成后提交哥哥验收，合格才结算'}</p>${t.note?`<section class="family-record"><span>${t.origin==='guest'?'完成说明':'哥哥的要求'}</span><p>${esc(t.note)}</p></section>`:''}${t.items.length?`<section class="family-record"><span>这次的饭菜</span>${t.items.map(d=>`<button class="family-dish-link" data-family-action="recipe" data-value="${esc(d.slug)}">${dishImage(d.image?d:recipes().find(r=>r.slug===d.slug))}<span>${esc(d.name)}<small>${esc(d.request_note||'查看菜谱')}</small></span><span aria-hidden="true">›</span></button>`).join('')}</section>`:''}${t.comment||t.status==='rework'?`<section class="family-record ${t.status==='rework'?'family-rework':''}"><span>哥哥的最新评价</span><p>${esc(t.comment||'请重新完成后再次提交。')}</p></section>`:''}<details class="family-timeline"><summary>提交与评价记录 · ${t.events.length} 条</summary>${t.events.map(e=>`<div><strong>${({create:t.origin==='guest'?'宝宝自主登记':'哥哥发起',submit:`第 ${e.attempt} 次完成提交`,qualified:'验收合格',rework:'验收未通过',cancel:'取消任务',imported:'由原餐次保留'})[e.action]||e.action}</strong><time>${esc(stamp(e.at))}</time>${e.comment?`<p>${esc(e.comment)}</p>`:''}</div>`).join('')}</details>`;
   const withdrawal=!admin()&&t.origin==='guest'&&!t.events.some(e=>e.action==='imported')&&['review','rework'].includes(t.status)?btn('withdraw-task','撤回登记'):'';
   const a=(admin()?t.status==='review'?btn('review','验收与评价','',true,t.points===null):t.status==='pending'&&t.attempt===0?btn('cancel-task','取消请求'):'' :['pending','rework'].includes(t.status)?btn('submit-task',t.status==='rework'?'返工已完成':'我已完成','',true):'')+withdrawal;
   if(t.points===null)body.insertAdjacentHTML('beforeend','<p class="family-hint">请哥哥先设置做饭分值，再验收结算。</p>');foot.hidden=!a;foot.innerHTML=a;
  }
  function renderReview(){const t=modal.task;body.innerHTML=`<div class="family-detail-head"><div><h3>${esc(t.title)}</h3><p>第 ${t.attempt} 次提交 · ${esc(stamp(t.submitted_at))}</p></div><strong>+${t.points} 分</strong></div>${t.note?`<section class="family-record"><span>原要求 / 说明</span><p>${esc(t.note)}</p></section>`:''}<div class="family-verdict" role="group" aria-label="验收结果">${[['yes','合格'],['no','不合格']].map(([v,l])=>`<button data-family-action="verdict" data-value="${v}" aria-pressed="${modal.verdict===v}" class="${modal.verdict===v?'selected':''}">${l}</button>`).join('')}</div><label class="family-field">文字评价（可选）<textarea id="familyComment" maxlength="1000" placeholder="告诉宝宝哪里做得好，或需要怎样返工">${esc(modal.comment)}</textarea></label><p class="family-hint">${modal.verdict==='no'?'不合格不扣分，宝宝返工后可以再次提交。':'合格后自动结算这项任务的固定分值，只结算一次。'}</p>`;foot.hidden=false;foot.innerHTML=btn('save-review',modal.verdict==='no'?'退回返工':`合格并结算 ${t.points} 分`,'',true,!modal.verdict);}
  function renderTypes(){body.innerHTML=`<p class="family-copy">${admin()?'这里的分值用于新发起或自主登记的任务。已有任务保持原分值。':'这是哥哥设置的最新分值，已发起任务按当时的分值结算。'}</p><div class="family-price-list">${types.map(t=>`<${admin()?'button':'div'} class="family-price-row"${admin()?` data-family-action="price" data-value="${t.code}"`:''}><span>${esc(t.label)}</span><strong>${t.points===null?'待设置':`${t.points} 分`}</strong>${admin()?'<span class="family-chevron">›</span>':''}</${admin()?'button':'div'}>`).join('')}</div><p class="family-hint">后续确认完整家务分值表时，更新这里即可。</p>`;}
  function renderPrice(){body.innerHTML=`<div class="family-detail-head"><h3>${esc(modal.type.label)}</h3></div><label class="family-field">每次合格获得的分数<input id="familyPriceInput" type="number" inputmode="decimal" min="0.5" max="1000" step="0.5" value="${modal.points??''}" placeholder="例如 0.5、1、1.5"/></label><p class="family-hint">新任务使用最新分值；已发起任务不会随之改变。尚未设置分值的原餐次会补齐本次设置。</p>`;foot.hidden=false;foot.innerHTML=btn('save-price','保存分值','',true);}
  function renderRecipes(){content.innerHTML=`<input id="familySearch" class="kitchen-search" aria-label="搜索菜谱" placeholder="找一道想吃的菜"/><div class="kitchen-dish-grid" id="familyRecipes">${recipeRows(window.PointsKitchenRecipes||[])}</div>`;}
  function recipeRows(list){return list.map(d=>`<article class="kitchen-dish-card"><button class="kitchen-dish-open" data-family-action="recipe" data-value="${d.slug}"><img class="kitchen-dish-image" src="${d.image}" width="180" height="120" loading="lazy" alt="${esc(d.name)}"/><span class="kitchen-dish-copy"><strong>${esc(d.name)}</strong><small class="kitchen-recipe-meta">${esc(d.category)} · ${d.servings||2} 人份</small></span></button></article>`).join('');}
  function renderRecipe(){const d=modal.recipe;body.innerHTML=`${d.image?`<img class="kitchen-recipe-image family-recipe-hero" src="${d.image}" alt="${esc(d.name)}"/>`:''}<h3 class="kitchen-recipe-title">${esc(d.name)}</h3><p class="family-copy">${esc(d.description||'这道菜按自己的口味准备。')}</p>${d.ingredients?.length?`<section class="family-record"><span>食材与调料</span><dl class="kitchen-ingredients">${d.ingredients.map(([a,b])=>`<div><dt>${esc(a)}</dt><dd>${esc(b)}</dd></div>`).join('')}</dl></section><ol class="kitchen-steps">${d.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`:''}${d.tips?.length?`<section class="family-record"><span>好吃的关键</span>${d.tips.map(t=>`<p>${esc(t)}</p>`).join('')}</section>`:''}`;}
  const renderRecipeDetail=renderRecipe;
  renderRecipe=()=>{renderRecipeDetail();if(modal.draft){foot.hidden=false;foot.innerHTML=btn('recipe-pick',modal.draft.items.includes(modal.recipe.slug)?'已选 · 移除这道菜':'选择这道菜','',true);}};
  async function openTask(id){const token=epoch;show({kind:'loading'});const target=modal;try{const t=await rpc('points_family_get_task',{p_task_id:id});if(token!==epoch||modal!==target)return;modal={kind:'task',task:t};renderDialog();}catch(e){if(token===epoch&&modal===target){modal.error=describe(e);renderDialog();}}}
  function operationKey(action){return 'points_family_operation:'+role+':'+action;}
  async function mutate(action,payload,retry=null){
   if(busy||!available)return;const token=++epoch;loading=null;busy=true;let op=retry,key=operationKey(action);
   try{
    if(!op){try{op=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}if(op&&(op.action!==action||JSON.stringify(op.payload)!==JSON.stringify(payload)))throw Error('Unresolved operation');}
    op ||= {action,payload,uuid:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(op));renderDialog();
    let result=await rpc('points_family_write',{p_action:op.action,p_payload:op.payload,p_operation_id:op.uuid});
    localStorage.removeItem(key);if(token!==epoch)return;
    if(result.removed){tasks=tasks.filter(t=>t.id!==result.id);busy=false;close();ui.showToast('已撤回登记，不保留记录');window.dispatchEvent(new Event('points:todos-changed'));await refresh();return;}
    if(action!=='price')try{result=await rpc('points_family_get_task',{p_task_id:result.id});}catch(_){}if(token!==epoch)return;
    if(action==='price'){types=result;modal={kind:'types'};}else{tasks=[result,...tasks.filter(t=>t.id!==result.id)];modal={kind:'task',task:result};if(result.status==='settled'){state.score=result.score_after;state.overviewLoadedAt=0;ui.renderScore();await ui.refreshScore();}}
    if(token!==epoch)return;busy=false;renderDialog();ui.showToast(action==='price'?'分值已保存':result.status==='settled'?`合格，已结算 +${result.points} 分`:result.status==='rework'?'已退回返工，积分不变':'家事已保存');window.dispatchEvent(new Event('points:todos-changed'));await refresh();
   }catch(e){if(token===epoch){if(e.code&&!/^(08|PGRST00|APP_)/.test(e.code))localStorage.removeItem(key);error=e.message==='Unresolved operation'?'请先核对上次提交，再提交新的内容。':describe(e);if(modal)modal.error=error;renderDialog();}}
   finally{if(token===epoch){busy=false;render();renderDialog();}}
  }
  function savedDraft(){try{return JSON.parse(sessionStorage.getItem('points_family_draft:'+role)||'null');}catch(_){return null;}}
  function preserve(){const draft=modal?.kind==='create'?modal:[...stack].reverse().find(m=>m.kind==='create');if(draft)try{sessionStorage.setItem('points_family_draft:'+role,JSON.stringify(draft));}catch(_){}}
  const rawClose=close;close=()=>{preserve();rawClose();};
  async function act(e){
   if(performance.now()<suppressPickerClickUntil&&e.target.closest('#familyPickerGrid'))return;
   const b=e.target.closest('[data-family-action],[data-kitchen-action]');if(!b||b.disabled||busy)return;const a=b.dataset.familyAction||b.dataset.kitchenAction,v=b.dataset.value;
   if(a==='page')return navigate(v);
   if(a==='tab'){tab=v;epoch++;loading=null;tasks=[];render();return refresh();}
   if(a==='day-step')return selectDay(shiftDay(recordDay,Number(v)));
   if(a==='today')return selectDay(today());
   if(a==='calendar')return show({kind:'calendar',month:recordDay.slice(0,7)});
   if(a==='calendar-month'){const d=new Date(modal.month+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+Number(v));modal.month=d.toISOString().slice(0,7);renderDialog();return;}
   if(a==='calendar-day'||a==='calendar-today'){close();return selectDay(a==='calendar-today'?today():v);}
   if(a==='settings')return els.settingsBtn.click();
   if(a==='close')return close();
   if(a==='back'){modal=stack.pop();if(!modal)return close();renderDialog();body.scrollTop=modal.scroll||0;return;}
   if(a==='refresh')return refresh();if(a==='more')return refresh({append:true});
   if(a==='task')return openTask(v);
   if(a==='types'){try{types=await rpc('points_family_get_types');show({kind:'types'});}catch(e){error=describe(e);render();}return;}
   if(a==='price'&&admin()){const ty=types.find(t=>t.code===v);return show({kind:'price',type:ty,points:ty.points},true);}
   if(a==='save-price'){const p=Number(q('familyPriceInput').value);if(!Number.isFinite(p)||!Number.isInteger(p*2)||p<0.5||p>1000){modal.error='请输入 0.5 至 1000 的分值，且必须是 0.5 的倍数。';renderDialog();return;}return mutate('price',{type:modal.type.code,version:modal.type.version,points:p});}
   if(a==='create'&&available){const saved=savedDraft();return show(saved?.kind==='create'?saved:{kind:'create',type:types.find(t=>t.points!==null)?.code,note:'',items:[]});}
   if(a==='choose-type'){modal.type=v;modal.items=[];renderDialog();preserve();return;}
   if(a==='open-picker'){modal.dishBrowser||={category:'全部',query:'',page:0};return show({kind:'picker',draft:modal,browser:modal.dishBrowser},true);}
   if(a==='dish-category'){modal.browser.category=v;modal.browser.query='';modal.browser.page=0;renderDialog();return;}
   if(a==='dish-page'){modal.browser.page+=Number(v);renderPickerPage();return;}
   if(a==='selected-menu')return show({kind:'selected',draft:modal.draft,browser:modal.browser},true);
   if(a==='finish-picking'){const index=stack.findIndex(m=>m.kind==='create');if(index<0)return;modal=stack[index];stack=stack.slice(0,index);renderDialog();body.scrollTop=modal.scroll||0;preserve();return;}
   if(a==='pick'||a==='remove-dish'||a==='recipe-pick'){
    const draft=modal.kind==='create'?modal:modal.draft,slug=a==='recipe-pick'?modal.recipe.slug:v;
    if(!draft||!recipes().some(d=>d.slug===slug))return;
    draft.items=draft.items.includes(slug)?draft.items.filter(x=>x!==slug):[...draft.items,slug];
    if(modal.kind==='picker'){renderPickerPage();renderPickerFoot();}else renderDialog();preserve();return;
   }
   if(a==='save-create'){const m=modal;await mutate('create',{type:m.type,note:m.note,items:m.type==='cooking'?m.items.map(slug=>({slug,note:''})):[]});if(modal?.kind==='task')sessionStorage.removeItem('points_family_draft:'+role);return;}
   if(a==='withdraw-task'){show({kind:'confirm',task:modal.task,action:'cancel',text:'撤回后不保留这条家事记录，哥哥无需再验收，积分保持不变。',label:'撤回登记'},true);return;}
   if(a==='submit-task'||a==='cancel-task'){const t=modal.task;show({kind:'confirm',task:t,action:a==='submit-task'?'submit':'cancel',text:a==='submit-task'?'提交后等待哥哥验收，合格再结算分数。':'取消这项尚未提交完成的请求，不影响积分。',label:a==='submit-task'?'确认已完成':'取消请求'},true);return;}
   if(a==='confirm')return mutate(modal.action,{id:modal.task.id,version:modal.task.version});
   if(a==='review'&&admin())return show({kind:'review',task:modal.task,verdict:null,comment:''},true);
   if(a==='verdict'){modal.verdict=v;renderDialog();return;}
   if(a==='save-review')return mutate('review',{id:modal.task.id,version:modal.task.version,qualified:modal.verdict==='yes',comment:modal.comment});
   if(a==='recipe'){const d=recipes().find(d=>d.slug===v)||modal?.task?.items.find(d=>d.slug===v);if(d)show({kind:'recipe',recipe:d,draft:modal?.kind==='create'?modal:modal?.draft},!!modal);return;}
   if(a==='retry'){const op=JSON.parse(localStorage.getItem(v)||'null');if(op)return mutate(op.action,op.payload,op);}
  }
  app.addEventListener('click',e=>void act(e).catch(issue=>{if(modal){modal.error=describe(issue);renderDialog();}else{error=describe(issue);render();}}));
  app.addEventListener('input',e=>{
   if(e.target.id==='familyPickerSearch'&&modal?.kind==='picker'){modal.browser.query=e.target.value;modal.browser.page=0;renderPickerPage();return;}
   if(e.target.id==='familyNote'&&modal?.kind==='create'){modal.note=e.target.value;preserve();}
   if(e.target.id==='familyComment'&&modal?.kind==='review')modal.comment=e.target.value;
   if(e.target.id==='familyPriceInput'&&modal?.kind==='price')modal.points=e.target.value;
   if(e.target.id==='familySearch')q('familyRecipes').innerHTML=recipeRows((window.PointsKitchenRecipes||[]).filter(d=>[d.name,...(d.aliases||[])].some(t=>t.includes(e.target.value.trim()))));
  });
  body.addEventListener('error',e=>{if(e.target.matches?.('.family-food-image')){const fallback=document.createElement('span');fallback.className='family-food-fallback';fallback.textContent='♨';fallback.setAttribute('aria-hidden','true');e.target.replaceWith(fallback);}},true);
  body.addEventListener('pointerdown',e=>{if(modal?.kind==='picker'&&e.target.closest('#familyPickerGrid')&&e.isPrimary!==false&&e.button===0)swipe={id:e.pointerId,x:e.clientX,y:e.clientY};});
  body.addEventListener('pointermove',e=>{const s=swipe;if(!s||s.id!==e.pointerId||modal?.kind!=='picker')return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.5){e.preventDefault();q('familyPickerGrid').setPointerCapture?.(e.pointerId);}},{passive:false});
  body.addEventListener('pointerup',e=>{const s=swipe;swipe=null;if(!s||s.id!==e.pointerId||modal?.kind!=='picker')return;const dx=e.clientX-s.x,dy=e.clientY-s.y;if(Math.abs(dx)>=60&&Math.abs(dx)>Math.abs(dy)*1.5){suppressPickerClickUntil=performance.now()+250;modal.browser.page+=dx<0?1:-1;renderPickerPage();}});
  body.addEventListener('pointercancel',()=>{swipe=null;});
  body.addEventListener('keydown',e=>{if(modal?.kind==='picker'&&e.target.id==='familyPickerGrid'&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();modal.browser.page+=e.key==='ArrowRight'?1:-1;renderPickerPage();}});
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  q('familyScoreSettingsBtn').addEventListener('click',async()=>{ui.setLayer(els.settingsLayer,false);try{types=await rpc('points_family_get_types');show({kind:'types'});}catch(e){ui.showToast(available?describe(e):'小家庭分值表尚未配置。');}});
  document.addEventListener('keydown',e=>{if(!layer.classList.contains('open'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}if(e.key==='Tab'){const items=[...layer.querySelectorAll('button:not(:disabled),input,textarea,summary')].filter(x=>x.getClientRects().length);if(!items.length)return;const n=items.indexOf(document.activeElement);if(e.shiftKey&&n<=0||!e.shiftKey&&(n<0||n===items.length-1)){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}}},true);
  const fit=()=>{if(window.visualViewport){layer.style.setProperty('--kitchen-viewport-height',visualViewport.height+'px');layer.style.setProperty('--kitchen-viewport-top',visualViewport.offsetTop+'px');}};window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);fit();
  window.addEventListener('points:open-family-task',e=>{const id=String(e.detail?.id||'');if(!/^[1-9][0-9]*$/.test(id))return;preserve();void refresh().then(ok=>{if(ok)return openTask(id);}).catch(()=>ui.showToast('暂时无法读取这件家事，请重试。'));});
  window.addEventListener('points:before-update',preserve);
  window.addEventListener('points:access-ready',()=>void refresh());window.addEventListener('online',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  function roleChanged(authReady=false){ready=ready||authReady;const next=!ready?'waiting':state.session?state.isAdmin?'admin:'+state.session.user.id:'verifying':'guest';if(next===role)return;preserve();role=next;epoch++;loading=null;busy=false;modal=null;stack=[];tasks=[];types=[];available=false;ui.setLayer(layer,false);render();if(!['waiting','verifying'].includes(role))void refresh();}
  render();return {refresh,roleChanged};
 }
 window.PointsKitchen={attach};
})();

}catch(error){window.PointsStartup.fail("family",error,false);}}
