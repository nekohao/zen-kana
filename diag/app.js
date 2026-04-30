/* Diag Tutor — App Bootstrap & Logic
 * 内容数据: window.LESSONS (来自 lessons.js)
 * 版本数据: ./version.json
 */
(function(){
  const LS = {
    view: 'dt_view',          // mobile | desktop | auto
    lastLesson: 'dt_lesson',
    localVer: 'dt_local_ver', // 客户端最近一次成功加载的版本
    localBuild: 'dt_local_build',
  };

  // ------------- DOM -------------
  const $ = (id) => document.getElementById(id);
  const sidebar = $('sidebar');
  const content = $('content');
  const toast = $('toast');

  // ------------- Toast -------------
  let toastTimer = null;
  function showToast(msg, ms=2400){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=>toast.classList.remove('show'), ms);
  }

  // ------------- View Mode -------------
  function applyView(){
    const mode = localStorage.getItem(LS.view) || 'auto';
    document.body.classList.remove('mobile','desktop');
    if (mode === 'mobile') document.body.classList.add('mobile');
    else if (mode === 'desktop') document.body.classList.add('desktop');
    $('viewBtn').textContent = (mode === 'desktop') ? '💻' : (mode === 'mobile' ? '📱' : '🔄');
    $('viewBtn').title = '当前视图：' + mode + '（点击切换）';
  }
  $('viewBtn').addEventListener('click', ()=>{
    const cur = localStorage.getItem(LS.view) || 'auto';
    const next = cur === 'auto' ? 'mobile' : (cur === 'mobile' ? 'desktop' : 'auto');
    localStorage.setItem(LS.view, next);
    applyView();
    showToast('视图：' + next);
  });
  applyView();

  // ------------- Sidebar build -------------
  function buildSidebar(activeId){
    sidebar.innerHTML = '';
    LESSONS.groups.forEach(g => {
      const h = document.createElement('h3');
      h.textContent = g.title;
      sidebar.appendChild(h);
      g.lessons.forEach((l, i) => {
        const idx = LESSONS.lessons.findIndex(x => x.id === l);
        const lesson = LESSONS.lessons[idx];
        if (!lesson) return;
        const item = document.createElement('div');
        item.className = 'nav-item' + (lesson.id === activeId ? ' active' : '');
        item.innerHTML = `<span class="num">${String(idx+1).padStart(2,'0')}</span><span>${lesson.title}</span>`;
        item.addEventListener('click', ()=>{
          location.hash = '#/' + lesson.id;
          if (document.body.classList.contains('mobile') || window.innerWidth < 900) sidebar.classList.add('collapsed');
        });
        sidebar.appendChild(item);
      });
    });
  }

  // Toggle sidebar (mobile)
  $('menuBtn').addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  // ------------- Lesson rendering -------------
  function renderLesson(id){
    const lesson = LESSONS.lessons.find(x => x.id === id) || LESSONS.lessons[0];
    if (!lesson) { content.innerHTML = '<p>暂无内容</p>'; return; }
    localStorage.setItem(LS.lastLesson, lesson.id);
    const idx = LESSONS.lessons.indexOf(lesson);
    const prev = LESSONS.lessons[idx-1];
    const next = LESSONS.lessons[idx+1];
    content.innerHTML = `
      <div style="color:var(--fg2);font-size:12px;margin-bottom:6px">第 ${idx+1} 讲 / 共 ${LESSONS.lessons.length} 讲</div>
      <h1>${lesson.title}</h1>
      ${lesson.subtitle ? `<p style="color:var(--fg2);margin-top:-2px">${lesson.subtitle}</p>` : ''}
      ${lesson.html}
      <div class="pager">
        ${prev ? `<a href="#/${prev.id}"><span class="arrow">← 上一讲</span>${prev.title}</a>` : '<span></span>'}
        ${next ? `<a href="#/${next.id}" style="text-align:right"><span class="arrow">下一讲 →</span>${next.title}</a>` : '<span></span>'}
      </div>
    `;
    buildSidebar(lesson.id);
    window.scrollTo({top:0, behavior:'instant'});
  }

  function route(){
    const hash = location.hash || '';
    const m = hash.match(/^#\/(.+)$/);
    const id = m ? decodeURIComponent(m[1]) : (localStorage.getItem(LS.lastLesson) || LESSONS.lessons[0].id);
    renderLesson(id);
  }
  window.addEventListener('hashchange', route);

  // ------------- Version Modal & Auto-update -------------
  let remoteVersion = null;
  function semverGt(a,b){
    const pa=(a||'0').split('.').map(n=>parseInt(n,10)||0);
    const pb=(b||'0').split('.').map(n=>parseInt(n,10)||0);
    for (let i=0;i<Math.max(pa.length,pb.length);i++){
      const x=pa[i]||0,y=pb[i]||0;
      if (x>y) return true; if (x<y) return false;
    }
    return false;
  }
  function showVerModal(){
    const local = localStorage.getItem(LS.localVer) || LESSONS.appVersion || '1.0.0';
    const localBuild = localStorage.getItem(LS.localBuild) || '-';
    $('verLocal').textContent = local;
    $('verLocalTime').textContent = localBuild;
    $('verRemote').textContent = remoteVersion ? remoteVersion.version : '检测失败';
    $('verRemoteTime').textContent = remoteVersion ? (remoteVersion.buildTime || '-') : '-';
    $('verNotes').textContent = remoteVersion ? (remoteVersion.notes || '-') : '-';
    const hasUpdate = remoteVersion && semverGt(remoteVersion.version, local);
    $('verUpdate').textContent = hasUpdate ? '立即更新' : '强制刷新';
    $('verMask').classList.add('show');
  }
  $('verBtn').addEventListener('click', showVerModal);
  $('verClose').addEventListener('click', ()=>$('verMask').classList.remove('show'));
  $('verMask').addEventListener('click', e => { if (e.target.id === 'verMask') $('verMask').classList.remove('show'); });
  $('verUpdate').addEventListener('click', forceUpdate);

  async function forceUpdate(){
    showToast('正在更新…');
    try {
      if ('serviceWorker' in navigator){
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs){ try{ r.active && r.active.postMessage({type:'PURGE'}); }catch(e){} await r.update(); }
      }
      if ('caches' in window){
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch(e){}
    location.reload();
  }

  async function checkVersion(){
    try {
      const r = await fetch('./version.json?ts=' + Date.now(), { cache:'no-store' });
      if (!r.ok) throw new Error('http ' + r.status);
      remoteVersion = await r.json();
      const local = localStorage.getItem(LS.localVer);
      if (!local){
        // 首次访问 — 记录当前为本地版本
        localStorage.setItem(LS.localVer, remoteVersion.version);
        localStorage.setItem(LS.localBuild, remoteVersion.buildTime || '');
      } else if (semverGt(remoteVersion.version, local)){
        $('verBtn').classList.add('has-update');
        showToast('发现新版本 v' + remoteVersion.version + '，正在静默更新…', 3200);
        // 自动更新
        try {
          if ('caches' in window){
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        } catch(e){}
        localStorage.setItem(LS.localVer, remoteVersion.version);
        localStorage.setItem(LS.localBuild, remoteVersion.buildTime || '');
        // 让 SW 接管并刷新
        setTimeout(()=>location.reload(), 1500);
      }
    } catch(e){
      remoteVersion = null;
    }
  }

  // ------------- Init -------------
  if (!localStorage.getItem(LS.localVer) && LESSONS.appVersion){
    // 安装初次：以 lessons.js 自带版本作为兜底
    localStorage.setItem(LS.localVer, LESSONS.appVersion);
  }

  route();
  checkVersion();

  // Service Worker
  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(()=>{});
    });
  }

  // Auto collapse sidebar on small screens initially
  if (window.innerWidth < 900) sidebar.classList.add('collapsed');
})();
