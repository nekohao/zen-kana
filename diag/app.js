/* Diag Tutor — App Shell, routing, progress and PWA update logic */
(function(){
  const LS = {
    view: 'dt_view',
    lastLesson: 'dt_lesson',
    completed: 'dt_completed_lessons',
    localVer: 'dt_local_ver',
    localBuild: 'dt_local_build',
  };

  const $ = (id) => document.getElementById(id);
  const sidebar = $('sidebar');
  const content = $('content');
  const toast = $('toast');
  const scrollMeter = $('scrollMeter');
  const topProgress = $('topProgress');

  const lessons = Array.isArray(LESSONS.lessons) ? LESSONS.lessons : [];
  const groups = Array.isArray(LESSONS.groups) ? LESSONS.groups : [];
  let activeLessonId = null;
  let sidebarFilter = '';
  let remoteVersion = null;
  let toastTimer = null;

  function readCompleted(){
    try {
      const value = JSON.parse(localStorage.getItem(LS.completed) || '[]');
      return new Set(Array.isArray(value) ? value : []);
    } catch(e){
      return new Set();
    }
  }

  function writeCompleted(done){
    localStorage.setItem(LS.completed, JSON.stringify(Array.from(done)));
  }

  function showToast(msg, ms=2400){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function escapeHTML(value){
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[ch]));
  }

  function lessonIndex(id){
    return lessons.findIndex((item) => item.id === id);
  }

  function findLesson(id){
    return lessons.find((item) => item.id === id) || lessons[0];
  }

  function findLessonStrict(id){
    return lessons.find((item) => item.id === id);
  }

  function groupForLesson(id){
    return groups.find((group) => group.lessons.includes(id));
  }

  function getNextOpenLesson(){
    const done = readCompleted();
    return lessons.find((lesson) => !done.has(lesson.id)) || lessons[lessons.length - 1];
  }

  function completionText(){
    const done = readCompleted();
    return `${done.size} / ${lessons.length}`;
  }

  function completionPercent(){
    if (!lessons.length) return 0;
    return Math.round((readCompleted().size / lessons.length) * 100);
  }

  function applyView(){
    const mode = localStorage.getItem(LS.view) || 'auto';
    document.body.classList.remove('mobile','desktop');
    if (mode === 'mobile') document.body.classList.add('mobile');
    if (mode === 'desktop') document.body.classList.add('desktop');
    $('viewBtn').textContent = mode === 'desktop' ? '▭' : (mode === 'mobile' ? '▯' : '◧');
    $('viewBtn').title = '当前视图：' + mode + '（点击切换）';
  }

  $('viewBtn').addEventListener('click', () => {
    const cur = localStorage.getItem(LS.view) || 'auto';
    const next = cur === 'auto' ? 'mobile' : (cur === 'mobile' ? 'desktop' : 'auto');
    localStorage.setItem(LS.view, next);
    applyView();
    showToast('视图已切换为 ' + next);
  });

  $('menuBtn').addEventListener('click', () => sidebar.classList.toggle('collapsed'));

  function buildSidebar(activeId){
    const done = readCompleted();
    const percent = completionPercent();
    const normalizedFilter = sidebarFilter.trim().toLowerCase();
    let renderedCount = 0;

    const shell = document.createElement('div');
    shell.className = 'sidebar-shell glass';
    shell.innerHTML = `
      <div class="sidebar-head">
        <span>学习路线</span>
        <strong>${completionText()}</strong>
      </div>
      <label class="search-box">
        <span>⌕</span>
        <input id="lessonSearch" type="search" value="${escapeHTML(sidebarFilter)}" placeholder="搜索 SID / DID / DTC">
      </label>
      <div class="progress-card">
        <div class="progress-row"><span>总进度</span><span>${percent}%</span></div>
        <div class="meter"><span style="width:${percent}%"></span></div>
      </div>
      <button class="continue-btn" id="continueBtn">继续学习</button>
    `;

    groups.forEach((group) => {
      const groupLessons = group.lessons.map(findLessonStrict).filter(Boolean);
      const visible = normalizedFilter
        ? groupLessons.filter((lesson) => {
            const text = `${lesson.title} ${lesson.subtitle || ''} ${lesson.html || ''}`.toLowerCase();
            return text.includes(normalizedFilter);
          })
        : groupLessons;
      if (!visible.length) return;

      const groupDone = groupLessons.filter((lesson) => done.has(lesson.id)).length;
      const groupEl = document.createElement('section');
      groupEl.className = 'group';
      groupEl.innerHTML = `
        <div class="group-title">
          <b>${escapeHTML(group.title)}</b>
          <span>${groupDone}/${groupLessons.length}</span>
        </div>
      `;

      visible.forEach((lesson) => {
        const idx = lessonIndex(lesson.id);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'nav-item' + (lesson.id === activeId ? ' active' : '') + (done.has(lesson.id) ? ' done' : '');
        item.innerHTML = `
          <span class="nav-num">${String(idx + 1).padStart(2,'0')}</span>
          <span class="nav-title">${escapeHTML(lesson.title)}</span>
          <span class="nav-state" aria-hidden="true"></span>
        `;
        item.addEventListener('click', () => {
          location.hash = '#/' + encodeURIComponent(lesson.id);
          if (document.body.classList.contains('mobile') || window.innerWidth < 920) {
            sidebar.classList.add('collapsed');
          }
        });
        groupEl.appendChild(item);
        renderedCount += 1;
      });

      shell.appendChild(groupEl);
    });

    if (!renderedCount) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '没有匹配的课程';
      shell.appendChild(empty);
    }

    sidebar.innerHTML = '';
    sidebar.appendChild(shell);
    topProgress.textContent = completionText();

    const search = $('lessonSearch');
    search.addEventListener('input', (event) => {
      sidebarFilter = event.target.value;
      buildSidebar(activeLessonId);
      const nextSearch = $('lessonSearch');
      nextSearch.focus();
      nextSearch.setSelectionRange(nextSearch.value.length, nextSearch.value.length);
    });

    $('continueBtn').addEventListener('click', () => {
      const next = getNextOpenLesson();
      if (next) location.hash = '#/' + encodeURIComponent(next.id);
    });
  }

  function renderLearningCards(lesson, index, group, done){
    const percentByOrder = lessons.length ? Math.round(((index + 1) / lessons.length) * 100) : 0;
    const state = done.has(lesson.id) ? '已完成' : '学习中';
    return `
      <div class="learning-grid">
        <div class="learning-card"><span>当前位置</span><strong>${escapeHTML(group ? group.title : '课程')}</strong></div>
        <div class="learning-card"><span>章节进度</span><strong>第 ${index + 1} / ${lessons.length} 讲 · ${percentByOrder}%</strong></div>
        <div class="learning-card"><span>状态</span><strong>${state}</strong></div>
      </div>
    `;
  }

  function renderLesson(id){
    const lesson = findLesson(id);
    if (!lesson) {
      content.innerHTML = '<p>暂无内容</p>';
      return;
    }

    activeLessonId = lesson.id;
    localStorage.setItem(LS.lastLesson, lesson.id);

    const idx = lessonIndex(lesson.id);
    const prev = lessons[idx - 1];
    const next = lessons[idx + 1];
    const group = groupForLesson(lesson.id);
    const done = readCompleted();
    const isDone = done.has(lesson.id);
    const orderPercent = lessons.length ? Math.round(((idx + 1) / lessons.length) * 100) : 0;

    content.innerHTML = `
      <section class="lesson-hero glass">
        <div class="kicker">
          <span class="pill">第 ${idx + 1} 讲</span>
          <span class="pill">共 ${lessons.length} 讲</span>
          <span class="pill">${escapeHTML(group ? group.title : '诊断课程')}</span>
        </div>
        <h1>${escapeHTML(lesson.title)}</h1>
        ${lesson.subtitle ? `<p class="lesson-subtitle">${escapeHTML(lesson.subtitle)}</p>` : ''}
        <div class="meter"><span style="width:${orderPercent}%"></span></div>
        <div class="lesson-actions">
          <button class="action-btn ${isDone ? 'done' : 'primary'}" id="completeBtn">${isDone ? '已完成本讲' : '标记完成'}</button>
          ${next ? `<button class="action-btn" id="nextBtn">下一讲</button>` : ''}
        </div>
      </section>
      ${renderLearningCards(lesson, idx, group, done)}
      <section class="lesson-body glass">
        ${lesson.html}
      </section>
      <nav class="pager ${(!prev || !next) ? 'single' : ''}">
        ${prev ? `<a href="#/${prev.id}"><span class="arrow">上一讲</span>${escapeHTML(prev.title)}</a>` : ''}
        ${next ? `<a href="#/${next.id}" style="text-align:right"><span class="arrow">下一讲</span>${escapeHTML(next.title)}</a>` : ''}
      </nav>
    `;

    $('completeBtn').addEventListener('click', () => {
      const latest = readCompleted();
      if (latest.has(lesson.id)) {
        latest.delete(lesson.id);
        showToast('已取消完成状态');
      } else {
        latest.add(lesson.id);
        showToast(next ? '本讲已完成，可以进入下一讲' : '全部课程已完成');
      }
      writeCompleted(latest);
      renderLesson(lesson.id);
    });

    const nextBtn = $('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        location.hash = '#/' + encodeURIComponent(next.id);
      });
    }

    buildSidebar(lesson.id);
    window.scrollTo({top:0, behavior:'instant'});
    updateScrollMeter();
  }

  function route(){
    const hash = location.hash || '';
    const match = hash.match(/^#\/(.+)$/);
    const fallback = localStorage.getItem(LS.lastLesson) || (lessons[0] && lessons[0].id);
    const id = match ? decodeURIComponent(match[1]) : fallback;
    renderLesson(id);
  }

  function updateScrollMeter(){
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const value = Math.min(100, Math.max(0, (window.scrollY / max) * 100));
    scrollMeter.style.width = value + '%';
  }

  function semverGt(a,b){
    const pa = (a || '0').split('.').map((n) => parseInt(n,10) || 0);
    const pb = (b || '0').split('.').map((n) => parseInt(n,10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
      const x = pa[i] || 0;
      const y = pb[i] || 0;
      if (x > y) return true;
      if (x < y) return false;
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

  async function forceUpdate(){
    showToast('正在更新...');
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try { if (reg.active) reg.active.postMessage({type:'PURGE'}); } catch(e) {}
          await reg.update();
        }
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch(e) {}
    location.reload();
  }

  async function checkVersion(){
    try {
      const response = await fetch('./version.json?ts=' + Date.now(), { cache:'no-store' });
      if (!response.ok) throw new Error('http ' + response.status);
      remoteVersion = await response.json();
      const local = localStorage.getItem(LS.localVer);
      if (!local) {
        localStorage.setItem(LS.localVer, remoteVersion.version);
        localStorage.setItem(LS.localBuild, remoteVersion.buildTime || '');
      } else if (semverGt(remoteVersion.version, local)) {
        $('verBtn').classList.add('has-update');
        showToast('发现新版本 v' + remoteVersion.version + '，正在静默更新...', 3200);
        try {
          if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((key) => caches.delete(key)));
          }
        } catch(e) {}
        localStorage.setItem(LS.localVer, remoteVersion.version);
        localStorage.setItem(LS.localBuild, remoteVersion.buildTime || '');
        setTimeout(() => location.reload(), 1500);
      }
    } catch(e) {
      remoteVersion = null;
    }
  }

  $('verBtn').addEventListener('click', showVerModal);
  $('verClose').addEventListener('click', () => $('verMask').classList.remove('show'));
  $('verMask').addEventListener('click', (event) => {
    if (event.target.id === 'verMask') $('verMask').classList.remove('show');
  });
  $('verUpdate').addEventListener('click', forceUpdate);
  window.addEventListener('hashchange', route);
  window.addEventListener('scroll', updateScrollMeter, { passive:true });
  window.addEventListener('resize', updateScrollMeter);

  if (!localStorage.getItem(LS.localVer) && LESSONS.appVersion) {
    localStorage.setItem(LS.localVer, LESSONS.appVersion);
  }

  applyView();
  route();
  checkVersion();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  if (window.innerWidth < 920) sidebar.classList.add('collapsed');
})();
