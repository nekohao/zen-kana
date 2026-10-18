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
 const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 function attach({db,state,els,ui}) {
  const app=document.getElementById('pointsApp'),q=id=>document.getElementById(id);
  app.dataset.page='world';
  app.insertAdjacentHTML('beforeend',`<section id="kitchenPage" class="family-page" hidden aria-label="小家庭"><header class="kitchen-header"><div class="app-brand"><img alt="" aria-hidden="true" class="app-brand-icon" src="./ICON/apple-touch-icon.png"/><div class="app-brand-copy"><h1 class="app-brand-title">小家庭</h1><p class="app-brand-caption">一起照顾我们的日常</p></div></div><button class="icon-button pressable" data-family-action="settings" aria-label="设置" type="button">${els.settingsBtn.innerHTML}</button></header><div id="familyDayHeader" class="family-day-header"><div class="family-day-copy"><span id="familyDayTitle">今天的小事</span><strong id="familyDayCount" aria-live="polite">正在读取…</strong></div><nav class="family-day-nav" aria-label="家事日期"><button data-family-action="day-step" data-value="-1" aria-label="前一天" type="button">‹</button><button data-family-action="today" aria-label="回到今天" type="button">今天</button><button data-family-action="day-step" data-value="1" aria-label="后一天" type="button">›</button></nav></div><div id="familyError" class="family-error" role="status" hidden></div><div id="kitchenContent"></div><div class="family-home-footer"><div class="family-primary-actions"><button id="familyCreateBtn" class="kitchen-button primary pressable" data-family-action="create" type="button" disabled><span class="family-action-label">我做完了</span><span class="family-swipe-hint" aria-hidden="true">左右滑动切日</span></button></div></div></section>
  <nav class="app-nav" aria-label="主导航"><button data-kitchen-action="page" data-value="world" aria-current="page">${worldIcon}<span>小世界</span></button><button data-kitchen-action="page" data-value="kitchen">${homeIcon}<span>小家庭</span></button></nav>
  <div id="kitchenLayer" class="modal-layer kitchen-layer family-layer" aria-hidden="true"><section class="kitchen-panel" role="dialog" aria-modal="true" aria-labelledby="familyTitle" tabindex="-1"><header class="kitchen-panel-head"><button data-family-action="back" aria-label="返回上一页" hidden>‹</button><h2 id="familyTitle"></h2><button data-family-action="close" aria-label="关闭家庭窗口">×</button></header><div class="kitchen-panel-body" id="familyBody"></div><footer class="kitchen-panel-foot" id="familyFoot" hidden></footer></section></div>`);
  const setting=document.createElement('section');setting.id='familyScoreSettings';
  setting.innerHTML='<div class="settings-label">小家庭</div><div class="settings-group"><button id="familyScoreSettingsBtn" class="settings-row pressable" type="button"><span id="familyScoreSettingsLabel">家务分值表</span><span class="chevron">›</span></button></div>';
  q('fatUnitSettings')?.after(setting);if(!setting.isConnected)q('settingsSheet').querySelector('.settings-sheet-content').append(setting);
  const page=q('kitchenPage'),content=q('kitchenContent'),layer=q('kitchenLayer'),body=q('familyBody'),foot=q('familyFoot');
  const createButton=q('familyCreateBtn');
  let role='waiting',epoch=0,ready=false,available=false,types=[],tasks=[],loading=null,busy=false,error='',modal=null,stack=[],focus=null;
  let recordDay=today(),viewingToday=true,dayLoaded=false,dayApi=null,homeSignature='';
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
  async function readDay(token,day){
   const collect=async(name,extra={})=>{
    const rows=[];let before=null,result;const cursors=new Set();
    do{
     if(token!==epoch)return null;
     result=await rpc(name,{...extra,p_before:before});
     if(token!==epoch)return null;
     if(!Array.isArray(result.tasks)||result.admin!==admin())throw Error('Invalid family state');
     rows.push(...result.tasks);const next=result.tasks.at(-1)?.id;
     if(result.more&&(!next||cursors.has(next)))throw Error('Invalid family cursor');
     cursors.add(next);before=result.more?next:null;
    }while(before);
    return {...result,tasks:rows};
   };
   if(dayApi!==false)try{const result=await collect('points_family_get_day',{p_date:day});if(result)dayApi=true;return result;}
   catch(e){if(!/PGRST202|42883/.test(e.code||''))throw e;dayApi=false;window.PointsRuntime?.clear('points_family_get_day');}
   // Older deployments must exhaust both partitions, including records beyond page one.
   const active=await collect('points_family_get_state',{p_history:false});if(!active)return null;
   const history=await collect('points_family_get_state',{p_history:true});if(!history)return null;
   return {...active,tasks:[...active.tasks,...history.tasks].filter(t=>t.task_date===day)};
  }
  async function refresh({feedback=false}={}){
   if(!ready||['waiting','verifying'].includes(role)||busy)return false;
   if(viewingToday&&recordDay!==today()){recordDay=today();epoch++;loading=null;tasks=[];dayLoaded=false;content.scrollTop=0;render();}
   if(loading)return loading;const token=epoch,day=recordDay;
   if(!dayLoaded)content.dataset.pointsSynced='false';setSyncing(true);
   const work=(async()=>{try{
    const result=await readDay(token,day);if(token!==epoch||day!==recordDay||!result)return false;
    types=result.types;tasks=[...new Map(result.tasks.map(t=>[t.id,t])).values()];available=true;dayLoaded=true;error='';content.dataset.pointsSynced='true';render();if(feedback)ui.showToast('家事已刷新');return true;
   }catch(e){if(token!==epoch)return false;error=/PGRST202|42883/.test(e.code||'')?'小家庭尚未配置，请哥哥安装家庭升级。':'家事同步失败，已保留当前内容，请再次点击底部小家庭重试。';render();if(feedback)ui.showToast('同步失败，请再次点击底部小家庭重试');return false;}
   finally{if(loading===work){loading=null;setSyncing(false);}}})();loading=work;return work;
  }
  function setSyncing(value){content.setAttribute('aria-busy',String(value));}
  function renderHomeAction(){
   const label=admin()?'发起家事':'我做完了';createButton.querySelector('.family-action-label').textContent=label;createButton.setAttribute('aria-label',label);createButton.setAttribute('aria-description','点击'+label+'；向右滑查看前一天，向左滑查看后一天。');createButton.disabled=busy||!available;
   page.querySelectorAll('[data-family-action="day-step"]').forEach(b=>{b.disabled=busy||!ready||role==='verifying'||b.dataset.value==='1'&&recordDay>=today();});
   const current=page.querySelector('[data-family-action="today"]');current.disabled=busy||!ready||role==='verifying';current.setAttribute('aria-pressed',String(recordDay===today()));current.textContent=recordDay===today()?'今天':recordDay.slice(5).replace('-','.');current.title=recordDay+' · 点击回到今天';current.setAttribute('aria-description','当前选择 '+recordDay+'，点击回到今天。');
  }
  function render(){
   renderHomeAction();q('familyDayHeader').dataset.date=recordDay;
   q('familyDayTitle').textContent=recordDay===today()?'今天的小事':recordDay.replaceAll('-','.')+' 的家事';
   q('familyDayCount').textContent=dayLoaded?tasks.filter(t=>['pending','review','rework'].includes(t.status)).length+' 件进行中':error?'暂未读取':'正在读取…';
   q('familyError').hidden=!error;q('familyError').textContent=error;
   q('familyScoreSettingsLabel').textContent=admin()?'管理家务分值':'家务分值表';
   const scroll=content.scrollTop,ranked=[...tasks].sort((a,b)=>{const rank=t=>admin()?(t.status==='review'?0:t.status==='rework'?1:t.status==='pending'?2:3):(t.status==='rework'?0:t.status==='pending'?1:t.status==='review'?2:3);return rank(a)-rank(b)||Number(b.id)-Number(a.id);});
   const signature=JSON.stringify([recordDay,dayLoaded,admin(),ranked,pendingHtml(),error]);if(signature===homeSignature&&content.querySelector('.family-task-list'))return;homeSignature=signature;
   content.innerHTML=`<div class="family-task-list">${ranked.map(card).join('')||(dayLoaded?empty('这一天没有家事记录',recordDay===today()?(admin()?'发起一件小事，一起照顾这个家。':'做完家务或饭菜，可以主动记下来。'):'点击右侧箭头查看其他日期，或回到今天。'):error?'':'<p class="family-day-loading" role="status">正在读取这一天的家事…</p>')}</div><div id="kitchenUpdatesSlot"${recordDay!==today()?' hidden':''}></div>${pendingHtml()}`;
   content.scrollTop=scroll;
  }
  function selectDay(value){
   if(busy||!validDay(value)||value>today())return;
   viewingToday=value===today();content.scrollTop=0;
   if(value===recordDay)return void refresh();
   recordDay=value;epoch++;loading=null;tasks=[];dayLoaded=false;error='';content.dataset.pointsSynced='false';setSyncing(false);render();void refresh();
  }
  function card(t){return `<button class="family-task-card" data-family-action="task" data-value="${t.id}"><span class="family-task-symbol ${esc(t.type_code)}" aria-hidden="true">${icons[t.type_code]||'◌'}</span><span class="family-task-copy"><span class="family-task-heading"><strong>${esc(t.title)}</strong>${badge(t)}</span><small>${esc(t.origin==='guest'?'宝宝自主登记':'哥哥发起')} · ${esc(stamp(t.created_at))}</small>${t.status==='rework'?`<p>${esc(t.comment||'请重新完成后，再提交哥哥验收。')}</p>`:t.note?`<p>${esc(t.note)}</p>`:''}<span class="family-task-points">${t.status==='cancelled'?'已取消 · 不结算':t.points===null?'待设置分值':t.status==='settled'?`已获得 +${t.points} 分`:`合格后 +${t.points} 分`}${t.attempt>1?` · 第 ${t.attempt} 次提交`:''}</span></span><span class="family-chevron">›</span></button>`;}
  function pendingHtml(){try{return Object.keys(localStorage).filter(k=>k.startsWith('points_family_operation:'+role+':')).map(k=>`<div class="family-error">有一次操作结果待确认。${btn('retry','核对上次操作',k)}</div>`).join('');}catch(_){return '';}}
  function navigate(next){if(busy||state.wheelSpinning||state.wheelRequestInFlight)return;close();ui.closeAllLayers();ui.closeOverviewSheet();app.dataset.page=next;page.hidden=next!=='kitchen';app.querySelectorAll('.app-nav button').forEach(b=>{if(b.dataset.value===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(next==='kitchen')void refresh({feedback:true});}
  function show(next,push=false){if(modal)modal.scroll=body.scrollTop;if(push&&modal)stack.push(modal);else stack=[];if(!modal)focus=document.activeElement;modal=next;ui.setLayer(layer,true);renderDialog();body.scrollTop=0;layer.querySelector('[role="dialog"]').focus({preventScroll:true});}
  function close(){if(busy)return;modal=null;stack=[];ui.setLayer(layer,false);if(focus?.isConnected)focus.focus({preventScroll:true});else createButton.focus({preventScroll:true});}
  function renderDialog(){
   if(!modal)return;layer.dataset.dialog=modal.kind;foot.hidden=true;foot.innerHTML='';layer.querySelector('[data-family-action="close"]').disabled=busy;layer.querySelector('[data-family-action="back"]').hidden=!stack.length;
   q('familyTitle').textContent={create:admin()?'发起一件家事':'记录做完的家事',task:'这件家事',review:'验收这件家事',types:'家务分值表',price:'调整家务分值',confirm:'确认操作',loading:'正在读取'}[modal.kind]||'小家庭';
   if(modal.kind==='create')renderCreate();else if(modal.kind==='task')renderTask();else if(modal.kind==='review')renderReview();else if(modal.kind==='types')renderTypes();else if(modal.kind==='price')renderPrice();
   else if(modal.kind==='confirm'){body.innerHTML=`<p class="family-copy">${esc(modal.text)}</p>`;foot.hidden=false;foot.innerHTML=`<div class="kitchen-confirm-actions">${btn('back','暂不处理')}${btn('confirm',modal.label,'',true)}</div>`;}
   else body.innerHTML='<p class="family-copy">正在读取，请稍候…</p>';
   if(modal.error)body.insertAdjacentHTML('beforeend',`<p class="family-error" role="alert">${esc(modal.error)}</p>`);
  }
  function renderCreate(){
   const ty=types.find(t=>t.code===modal.type);body.innerHTML=`<p class="family-copy">${admin()?'选择要请宝宝做的事，完成后由你验收。':'记下已经做完的事，等哥哥验收后结算。'}</p><div class="family-type-grid">${types.map(t=>`<button class="family-type${modal.type===t.code?' selected':''}" data-family-action="choose-type" data-value="${t.code}" aria-pressed="${modal.type===t.code}"${t.points===null?' disabled':''}><span aria-hidden="true">${icons[t.code]||'◌'}</span><strong>${esc(t.label)}</strong><small>${t.points===null?'待设置':`+${t.points} 分`}</small></button>`).join('')}</div>${types.some(t=>t.points===null)?'<p class="family-hint">未设置分值的家务，请哥哥先在设置里配置。</p>':''}<label class="family-field">${admin()?'具体要求（可选）':'完成说明（可选）'}<textarea id="familyNote" maxlength="500" placeholder="写下需要留意的小细节">${esc(modal.note)}</textarea></label>`;
   foot.hidden=false;foot.innerHTML=btn('save-create',admin()?'发起这件家事':'提交完成记录','',true,!ty||ty.points===null);
  }
  function renderTask(){const t=modal.task;
   body.innerHTML=`<div class="family-detail-head"><span class="family-task-symbol">${icons[t.type_code]||'◌'}</span><div><h3>${esc(t.title)}</h3>${badge(t)}</div><strong>${t.points===null?'待设置':`+${t.points} 分`}</strong></div><p class="family-copy">${t.status==='settled'?'积分已到账':t.status==='review'?'宝宝已提交完成，等待哥哥验收':t.status==='rework'?'验收未通过，请返工后再次提交':'完成后提交哥哥验收，合格才结算'}</p>${t.note?`<section class="family-record"><span>${t.origin==='guest'?'完成说明':'哥哥的要求'}</span><p>${esc(t.note)}</p></section>`:''}${t.items?.length?`<section class="family-record"><span>这次的饭菜</span><p>${t.items.map(d=>esc(d.name)+(d.request_note?' · '+esc(d.request_note):'')).join('<br>')}</p></section>`:''}${t.comment||t.status==='rework'?`<section class="family-record ${t.status==='rework'?'family-rework':''}"><span>哥哥的最新评价</span><p>${esc(t.comment||'请重新完成后再次提交。')}</p></section>`:''}<details class="family-timeline"><summary>提交与评价记录 · ${t.events.length} 条</summary>${t.events.map(e=>`<div><strong>${({create:t.origin==='guest'?'宝宝自主登记':'哥哥发起',submit:`第 ${e.attempt} 次完成提交`,qualified:'验收合格',rework:'验收未通过',cancel:'取消任务',imported:'由原餐次保留'})[e.action]||e.action}</strong><time>${esc(stamp(e.at))}</time>${e.comment?`<p>${esc(e.comment)}</p>`:''}</div>`).join('')}</details>`;
   const withdrawal=!admin()&&t.origin==='guest'&&!t.events.some(e=>e.action==='imported')&&['review','rework'].includes(t.status)?btn('withdraw-task','撤回登记'):'';
   const a=(admin()?t.status==='review'?btn('review','验收与评价','',true,t.points===null):t.status==='pending'&&t.attempt===0?btn('cancel-task','取消请求'):'' :['pending','rework'].includes(t.status)?btn('submit-task',t.status==='rework'?'返工已完成':'我已完成','',true):'')+withdrawal;
   if(t.points===null)body.insertAdjacentHTML('beforeend','<p class="family-hint">请哥哥先设置做饭分值，再验收结算。</p>');foot.hidden=!a;foot.innerHTML=a;
  }
  function renderReview(){const t=modal.task;body.innerHTML=`<div class="family-detail-head"><div><h3>${esc(t.title)}</h3><p>第 ${t.attempt} 次提交 · ${esc(stamp(t.submitted_at))}</p></div><strong>+${t.points} 分</strong></div>${t.note?`<section class="family-record"><span>原要求 / 说明</span><p>${esc(t.note)}</p></section>`:''}<div class="family-verdict" role="group" aria-label="验收结果">${[['yes','合格'],['no','不合格']].map(([v,l])=>`<button data-family-action="verdict" data-value="${v}" aria-pressed="${modal.verdict===v}" class="${modal.verdict===v?'selected':''}">${l}</button>`).join('')}</div><label class="family-field">文字评价（可选）<textarea id="familyComment" maxlength="1000" placeholder="告诉宝宝哪里做得好，或需要怎样返工">${esc(modal.comment)}</textarea></label><p class="family-hint">${modal.verdict==='no'?'不合格不扣分，宝宝返工后可以再次提交。':'合格后自动结算这项任务的固定分值，只结算一次。'}</p>`;foot.hidden=false;foot.innerHTML=btn('save-review',modal.verdict==='no'?'退回返工':`合格并结算 ${t.points} 分`,'',true,!modal.verdict);}
  function renderTypes(){body.innerHTML=`<p class="family-copy">${admin()?'这里的分值用于新发起或自主登记的任务。已有任务保持原分值。':'这是哥哥设置的最新分值，已发起任务按当时的分值结算。'}</p><div class="family-price-list">${types.map(t=>`<${admin()?'button':'div'} class="family-price-row"${admin()?` data-family-action="price" data-value="${t.code}"`:''}><span>${esc(t.label)}</span><strong>${t.points===null?'待设置':`${t.points} 分`}</strong>${admin()?'<span class="family-chevron">›</span>':''}</${admin()?'button':'div'}>`).join('')}</div><p class="family-hint">后续确认完整家务分值表时，更新这里即可。</p>`;}
  function renderPrice(){body.innerHTML=`<div class="family-detail-head"><h3>${esc(modal.type.label)}</h3></div><label class="family-field">每次合格获得的分数<input id="familyPriceInput" type="number" inputmode="decimal" min="0.5" max="1000" step="0.5" value="${modal.points??''}" placeholder="例如 0.5、1、1.5"/></label><p class="family-hint">新任务使用最新分值；已发起任务不会随之改变。尚未设置分值的原餐次会补齐本次设置。</p>`;foot.hidden=false;foot.innerHTML=btn('save-price','保存分值','',true);}
  async function openTask(id,followDay=false){const token=epoch;show({kind:'loading'});const target=modal;try{const t=await rpc('points_family_get_task',{p_task_id:id});if(token!==epoch||modal!==target)return;if(followDay&&validDay(t.task_date)&&t.task_date!==recordDay)selectDay(t.task_date);modal={kind:'task',task:t};renderDialog();}catch(e){if(token===epoch&&modal===target){modal.error=describe(e);renderDialog();}}}
  function operationKey(action){return 'points_family_operation:'+role+':'+action;}
  async function mutate(action,payload,retry=null){
   if(busy||!available)return;const token=++epoch;loading=null;setSyncing(false);busy=true;renderHomeAction();let op=retry,key=operationKey(action);
   try{
    if(!op){try{op=JSON.parse(localStorage.getItem(key)||'null');}catch(_){}if(op&&(op.action!==action||JSON.stringify(op.payload)!==JSON.stringify(payload)))throw Error('Unresolved operation');}
    op ||= {action,payload,uuid:crypto.randomUUID()};localStorage.setItem(key,JSON.stringify(op));renderDialog();
    let result=await rpc('points_family_write',{p_action:op.action,p_payload:op.payload,p_operation_id:op.uuid});
    localStorage.removeItem(key);if(token!==epoch)return;
    if(result.removed){tasks=tasks.filter(t=>t.id!==result.id);busy=false;close();ui.showToast('已撤回登记，不保留记录');window.dispatchEvent(new Event('points:todos-changed'));await refresh();return;}
    if(action!=='price')try{result=await rpc('points_family_get_task',{p_task_id:result.id});}catch(_){}if(token!==epoch)return;
    if(action==='price'){types=result;modal={kind:'types'};}else{if(action==='create'){recordDay=result.task_date||today();viewingToday=true;tasks=[];dayLoaded=false;content.scrollTop=0;}tasks=tasks.filter(t=>t.id!==result.id);if(result.task_date===recordDay)tasks.unshift(result);modal={kind:'task',task:result};if(result.status==='settled'){state.score=result.score_after;state.overviewLoadedAt=0;ui.renderScore();await ui.refreshScore();}}
    if(token!==epoch)return;busy=false;renderDialog();ui.showToast(action==='price'?'分值已保存':result.status==='settled'?`合格，已结算 +${result.points} 分`:result.status==='rework'?'已退回返工，积分不变':'家事已保存');window.dispatchEvent(new Event('points:todos-changed'));await refresh();
   }catch(e){if(token===epoch){if(e.code&&!/^(08|PGRST00|APP_)/.test(e.code))localStorage.removeItem(key);error=e.message==='Unresolved operation'?'请先核对上次提交，再提交新的内容。':describe(e);if(modal)modal.error=error;renderDialog();}}
   finally{if(token===epoch){busy=false;render();renderDialog();}}
  }
  function savedDraft(){try{const d=JSON.parse(sessionStorage.getItem('points_family_draft:'+role)||'null');return d?.kind==='create'?{kind:'create',type:d.type,note:d.note||''}:null;}catch(_){return null;}}
  function preserve(){const draft=modal?.kind==='create'?modal:[...stack].reverse().find(m=>m.kind==='create');if(draft)try{sessionStorage.setItem('points_family_draft:'+role,JSON.stringify({kind:'create',type:draft.type,note:draft.note||''}));}catch(_){}}
  const rawClose=close;close=()=>{preserve();rawClose();};
  async function act(e){
   const b=e.target.closest('[data-family-action],[data-kitchen-action]');if(!b||b.disabled||busy)return;const a=b.dataset.familyAction||b.dataset.kitchenAction,v=b.dataset.value;
   if(a==='page')return navigate(v);
   if(a==='day-step')return selectDay(shiftDay(recordDay,Number(v)));
   if(a==='today')return selectDay(today());
   if(a==='settings')return els.settingsBtn.click();
   if(a==='close')return close();
   if(a==='back'){modal=stack.pop();if(!modal)return close();renderDialog();body.scrollTop=modal.scroll||0;return;}
   if(a==='refresh')return refresh();
   if(a==='task')return openTask(v);
   if(a==='types'){try{types=await rpc('points_family_get_types');show({kind:'types'});}catch(e){error=describe(e);render();}return;}
   if(a==='price'&&admin()){const ty=types.find(t=>t.code===v);return show({kind:'price',type:ty,points:ty.points},true);}
   if(a==='save-price'){const p=Number(q('familyPriceInput').value);if(!Number.isFinite(p)||!Number.isInteger(p*2)||p<0.5||p>1000){modal.error='请输入 0.5 至 1000 的分值，且必须是 0.5 的倍数。';renderDialog();return;}return mutate('price',{type:modal.type.code,version:modal.type.version,points:p});}
   if(a==='create'&&available){const saved=savedDraft();return show(saved?.kind==='create'?saved:{kind:'create',type:types.find(t=>t.points!==null)?.code,note:''});}
   if(a==='choose-type'){modal.type=v;renderDialog();preserve();return;}
   if(a==='save-create'){const m=modal;await mutate('create',{type:m.type,note:m.note,items:[]});if(modal?.kind==='task')sessionStorage.removeItem('points_family_draft:'+role);return;}
   if(a==='withdraw-task'){show({kind:'confirm',task:modal.task,action:'cancel',text:'撤回后不保留这条家事记录，哥哥无需再验收，积分保持不变。',label:'撤回登记'},true);return;}
   if(a==='submit-task'||a==='cancel-task'){const t=modal.task;show({kind:'confirm',task:t,action:a==='submit-task'?'submit':'cancel',text:a==='submit-task'?'提交后等待哥哥验收，合格再结算分数。':'取消这项尚未提交完成的请求，不影响积分。',label:a==='submit-task'?'确认已完成':'取消请求'},true);return;}
   if(a==='confirm')return mutate(modal.action,{id:modal.task.id,version:modal.task.version});
   if(a==='review'&&admin())return show({kind:'review',task:modal.task,verdict:null,comment:''},true);
   if(a==='verdict'){modal.verdict=v;renderDialog();return;}
   if(a==='save-review')return mutate('review',{id:modal.task.id,version:modal.task.version,qualified:modal.verdict==='yes',comment:modal.comment});
   if(a==='retry'){const op=JSON.parse(localStorage.getItem(v)||'null');if(op)return mutate(op.action,op.payload,op);}
  }
  // Keep the shortcut local to the primary action; the task list still scrolls normally.
  let dayDrag=null,suppressCreateUntil=0;
  const swipeBlocked=()=>busy||!available||app.inert||app.dataset.page!=='kitchen'||!!app.querySelector('.modal-layer.open');
  const swipeHint=createButton.querySelector('.family-swipe-hint');
  function resetDaySwipe(){
   const previous=dayDrag;dayDrag=null;createButton.classList.remove('family-swipe-dragging','family-swipe-ready');
   createButton.style.removeProperty('--family-swipe-x');swipeHint.textContent='左右滑动切日';
   if(previous)try{createButton.releasePointerCapture(previous.id);}catch(_){}
  }
  createButton.addEventListener('pointerdown',e=>{
   if(swipeBlocked()||dayDrag||e.button!==0||e.isPrimary===false)return;
   suppressCreateUntil=0;
   dayDrag={id:e.pointerId,x:e.clientX,y:e.clientY,day:recordDay,version:epoch,axis:null,moved:false,threshold:Math.max(64,createButton.getBoundingClientRect().width*.2)};
   try{createButton.setPointerCapture(e.pointerId);}catch(_){}
  });
  createButton.addEventListener('pointermove',e=>{
   const d=dayDrag;if(!d||d.id!==e.pointerId)return;
   if(swipeBlocked()||d.day!==recordDay||d.version!==epoch){suppressCreateUntil=performance.now()+400;resetDaySwipe();return;}
   const dx=e.clientX-d.x,dy=e.clientY-d.y;
   if(!d.axis){if(Math.hypot(dx,dy)<10)return;d.moved=true;d.axis=Math.abs(dx)>Math.abs(dy)*1.5?'x':'y';}
   if(d.axis!=='x')return;e.preventDefault();
   const target=shiftDay(d.day,dx<0?1:-1),allowed=target<=today(),ready=allowed&&Math.abs(dx)>=d.threshold&&Math.abs(dx)>Math.abs(dy)*1.5;
   createButton.classList.add('family-swipe-dragging');createButton.classList.toggle('family-swipe-ready',ready);
   createButton.style.setProperty('--family-swipe-x',Math.max(-14,Math.min(14,dx*.1))+'px');
   swipeHint.textContent=!allowed?'已是今天':ready?(dx<0?'松开看后一天':'松开看前一天'):'左右滑动切日';
  },{passive:false});
  const endDaySwipe=e=>{
   const d=dayDrag;if(!d||d.id!==e.pointerId)return;
   const dx=e.clientX-d.x,dy=e.clientY-d.y,target=shiftDay(d.day,dx<0?1:-1);
   const commit=e.type==='pointerup'&&!swipeBlocked()&&d.day===recordDay&&d.version===epoch&&d.axis==='x'&&Math.abs(dx)>=d.threshold&&Math.abs(dx)>Math.abs(dy)*1.5&&target<=today();
   if(d.moved||Math.hypot(dx,dy)>=10||e.type==='pointercancel')suppressCreateUntil=performance.now()+400;
   resetDaySwipe();if(commit){navigator.vibrate?.(8);selectDay(target);}
  };
  createButton.addEventListener('pointerup',endDaySwipe);createButton.addEventListener('pointercancel',endDaySwipe);
  createButton.addEventListener('lostpointercapture',()=>{if(dayDrag){suppressCreateUntil=performance.now()+400;resetDaySwipe();}});
  createButton.addEventListener('click',e=>{
   if(e.detail!==0&&performance.now()<suppressCreateUntil){suppressCreateUntil=0;e.preventDefault();e.stopImmediatePropagation();}
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&dayDrag){suppressCreateUntil=performance.now()+400;resetDaySwipe();}});
  app.addEventListener('click',e=>void act(e).catch(issue=>{if(modal){modal.error=describe(issue);renderDialog();}else{error=describe(issue);render();}}));
  app.addEventListener('input',e=>{
   if(e.target.id==='familyNote'&&modal?.kind==='create'){modal.note=e.target.value;preserve();}
   if(e.target.id==='familyComment'&&modal?.kind==='review')modal.comment=e.target.value;
   if(e.target.id==='familyPriceInput'&&modal?.kind==='price')modal.points=e.target.value;
  });
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  q('familyScoreSettingsBtn').addEventListener('click',async()=>{ui.setLayer(els.settingsLayer,false);try{types=await rpc('points_family_get_types');show({kind:'types'});}catch(e){ui.showToast(available?describe(e):'小家庭分值表尚未配置。');}});
  document.addEventListener('keydown',e=>{
   const active=layer.classList.contains('open')?layer:null;if(!active)return;
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();}
   if(e.key==='Tab'){const items=[...active.querySelectorAll('button:not(:disabled),input,textarea,summary,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(!items.length)return;const n=items.indexOf(document.activeElement);if(e.shiftKey&&n<=0||!e.shiftKey&&(n<0||n===items.length-1)){e.preventDefault();items[e.shiftKey?items.length-1:0].focus();}}
  },true);
  const fit=()=>{if(window.visualViewport){layer.style.setProperty('--kitchen-viewport-height',visualViewport.height+'px');layer.style.setProperty('--kitchen-viewport-top',visualViewport.offsetTop+'px');}};window.visualViewport?.addEventListener('resize',fit);window.visualViewport?.addEventListener('scroll',fit);fit();
  window.addEventListener('points:open-family-task',e=>{const id=String(e.detail?.id||'');if(!/^[1-9][0-9]*$/.test(id))return;preserve();void refresh().then(ok=>{if(ok)return openTask(id,true);}).catch(()=>ui.showToast('暂时无法读取这件家事，请重试。'));});
  window.addEventListener('points:before-update',preserve);
  window.addEventListener('points:access-ready',()=>void refresh());window.addEventListener('online',()=>void refresh());document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
  function roleChanged(authReady=false){ready=ready||authReady;const next=!ready?'waiting':state.session?state.isAdmin?'admin:'+state.session.user.id:'verifying':'guest';if(next===role)return;preserve();role=next;epoch++;loading=null;busy=false;modal=null;stack=[];tasks=[];types=[];available=false;dayLoaded=false;recordDay=today();viewingToday=true;error='';homeSignature='';content.innerHTML='';content.scrollTop=0;setSyncing(false);ui.setLayer(layer,false);render();if(!['waiting','verifying'].includes(role))void refresh();}
  render();return {refresh,roleChanged};
 }
 window.PointsKitchen={attach};
})();

}catch(error){window.PointsStartup.fail("family",error,false);}}
