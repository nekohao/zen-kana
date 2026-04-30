/* Diag Tutor — iOS-like learning flow */
(function(){
  const LS = {
    lastLesson: 'dt_lesson',
    completed: 'dt_completed_lessons',
    localVer: 'dt_local_ver',
    localBuild: 'dt_local_build',
  };

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const toast = $('toast');
  const scrollMeter = $('scrollMeter');
  const versionText = $('versionText');

  const lessons = Array.isArray(LESSONS.lessons) ? LESSONS.lessons : [];
  const groups = Array.isArray(LESSONS.groups) ? LESSONS.groups : [];
  const serviceData = window.DFXY_SERVICE_DATA || { services: [], dids: [], routines: [], sequences: [] };
  const lessonMap = new Map(lessons.map((lesson) => [lesson.id, lesson]));
  let activeRoute = 'home';
  let courseFilter = '';
  let serviceFilter = '';
  let serviceTab = 'services';
  let remoteVersion = null;
  let toastTimer = null;

  const icons = {
    home: '<svg class="nav-icon tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 10l7-6 7 6v9a1 1 0 0 1-1 1h-4v-6h-4v6H6a1 1 0 0 1-1-1v-9Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    courses: '<svg class="nav-icon tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v13H7a1.5 1.5 0 0 0 0 3h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 4v11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    learn: '<svg class="nav-icon tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6c2.5 0 5 .6 7 1.8 2-1.2 4.5-1.8 7-1.8v11c-2.5 0-5 .6-7 1.8-2-1.2-4.5-1.8-7-1.8V6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 7.8v11.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    services: '<svg class="nav-icon tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 4v4M14 10v4M10 16v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    quiz: '<svg class="nav-icon tab-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 11h6m-9 4h3m-3-8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M15 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    search: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m20 20-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    arrow: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-5.5-5.5L18 12l-4.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  function diagnosticOrb(){
    return `
      <div class="diag-art" role="img" aria-label="诊断协议可视化">
        <div class="diag-ring o"></div>
        <div class="diag-ring i"></div>
        <div class="diag-line h"></div>
        <div class="diag-line v"></div>
        <div class="diag-point"></div>
        <div class="diag-point"></div>
        <div class="diag-point"></div>
        <div class="diag-point"></div>
        <div class="diag-core"></div>
      </div>
    `;
  }

  function routeIllustration(){
    return `
      <div class="route-art" role="img" aria-label="学习路线图">
        <div class="route-track"></div>
        <div class="route-progress"></div>
        <div class="route-stop"></div>
        <div class="route-stop"></div>
        <div class="route-stop"></div>
        <div class="route-stop"></div>
      </div>
    `;
  }

  function courseSvg(index){
    const colors = ['#0A84FF','#16C7C7','#5856D6','#34C759','#FF9F0A','#FF3B30'];
    const c = colors[index % colors.length];
    return `
      <div class="course-art-el" style="--cc:${c}" role="img" aria-label="课程图形">
        <div class="course-halo"></div>
        <div class="course-ring"></div>
      </div>
    `;
  }

  function readCompleted(){
    try {
      const parsed = JSON.parse(localStorage.getItem(LS.completed) || '[]');
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch(e) {
      return new Set();
    }
  }

  function writeCompleted(done){
    localStorage.setItem(LS.completed, JSON.stringify(Array.from(done)));
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

  function showToast(message, ms=2300){
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
  }

  function getLesson(id){
    return lessonMap.get(id) || lessons[0];
  }

  function getLessonIndex(id){
    return lessons.findIndex((lesson) => lesson.id === id);
  }

  function getGroupForLesson(id){
    return groups.find((group) => group.lessons.includes(id));
  }

  function completionPercent(){
    return lessons.length ? Math.round((readCompleted().size / lessons.length) * 100) : 0;
  }

  function getNextOpenLesson(){
    const done = readCompleted();
    return lessons.find((lesson) => !done.has(lesson.id)) || lessons[lessons.length - 1];
  }

  function getCurrentLearnLesson(){
    return getLesson(localStorage.getItem(LS.lastLesson) || (getNextOpenLesson() && getNextOpenLesson().id));
  }

  function applyDeviceMode(){
    const mode = window.innerWidth >= 900 ? 'desktop' : 'mobile';
    document.body.classList.toggle('desktop', mode === 'desktop');
    document.body.classList.toggle('mobile', mode === 'mobile');
  }

  function navItem(id, label, icon){
    return `${icon}<span>${label}</span>`;
  }

  function setNavMarkup(){
    $('navHome').innerHTML = navItem('home', '首页', icons.home);
    $('navCourses').innerHTML = navItem('courses', '课程', icons.courses);
    $('navLearn').innerHTML = navItem('learn', '学习', icons.learn);
    $('navServices').innerHTML = navItem('services', '服务表', icons.services);
    $('navQuiz').innerHTML = navItem('quiz', '测验', icons.quiz);
    $('bottomHome').innerHTML = navItem('home', '首页', icons.home);
    $('bottomCourses').innerHTML = navItem('courses', '课程', icons.courses);
    $('bottomLearn').innerHTML = navItem('learn', '学习', icons.learn);
    $('bottomServices').innerHTML = navItem('services', '服务表', icons.services);
    $('bottomQuiz').innerHTML = navItem('quiz', '测验', icons.quiz);
  }

  function setActiveNav(route){
    const ids = ['Home','Courses','Learn','Services','Quiz'];
    ids.forEach((name) => {
      const key = name.toLowerCase();
      $(`nav${name}`).classList.toggle('active', key === route);
      $(`bottom${name}`).classList.toggle('active', key === route);
    });
  }

  function updateScrollMeter(){
    const isMobile = document.body.classList.contains('mobile');
    const scrollTop = isMobile ? stage.scrollTop : window.scrollY;
    const max = isMobile
      ? Math.max(1, stage.scrollHeight - stage.clientHeight)
      : Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percent = Math.min(100, Math.max(0, (scrollTop / max) * 100));
    scrollMeter.style.width = percent + '%';
  }

  function renderHome(){
    const done = readCompleted();
    const next = getNextOpenLesson();
    const last = getCurrentLearnLesson();
    const percent = completionPercent();
    activeRoute = 'home';
    setActiveNav('home');

    stage.innerHTML = `
      <section class="page home-page">
        <div class="home-hero glass">
          <div class="hero-copy">
            <span class="eyebrow">${icons.learn} 诊断学习路径</span>
            <h1 class="hero-title">像使用 iOS 系统应用一样学习 UDS 诊断</h1>
            <p class="hero-subtitle">首页负责总览，课程页负责选课，学习页专注阅读。你可以从课程开始，也可以直接继续上次进度。</p>
            <div class="hero-actions">
              <a class="primary-cta" href="#/courses">开始学习 ${icons.arrow}</a>
              <a class="secondary-cta" href="#/learn/${last.id}">继续上次</a>
            </div>
          </div>
          <div class="hero-art">${diagnosticOrb()}</div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card"><span>总课程</span><strong>${lessons.length}</strong></div>
          <div class="metric-card"><span>已完成</span><strong>${done.size}</strong></div>
          <div class="metric-card"><span>学习进度</span><strong>${percent}%</strong></div>
          <div class="metric-card"><span>下一讲</span><strong>${String(getLessonIndex(next.id) + 1).padStart(2,'0')}</strong></div>
        </div>

        <div class="home-grid">
          <section class="route-card">
            <h2>学习流程</h2>
            <p class="section-subtitle">按 App 的方式拆开：先选择课程，再进入阅读，完成后自然推进到下一讲。</p>
            <div class="route-steps">
              <div class="route-step"><span class="step-dot">1</span><div><b>首页</b><span>看进度、继续学习、进入课程</span></div></div>
              <div class="route-step"><span class="step-dot">2</span><div><b>课程</b><span>按模块选择 UDS / DCM / DEM 内容</span></div></div>
              <div class="route-step"><span class="step-dot">3</span><div><b>学习</b><span>专注阅读、标记完成、切到下一讲</span></div></div>
            </div>
          </section>
          <section class="route-card panel-art">${routeIllustration()}</section>
        </div>
      </section>
    `;
  }

  function lessonMatches(lesson, filter){
    if (!filter) return true;
    const text = `${lesson.title} ${lesson.subtitle || ''} ${lesson.html || ''}`.toLowerCase();
    return text.includes(filter);
  }

  function renderCourses(){
    const done = readCompleted();
    const filter = courseFilter.trim().toLowerCase();
    activeRoute = 'courses';
    setActiveNav('courses');

    const groupMarkup = groups.map((group, groupIndex) => {
      const groupLessons = group.lessons.map((id) => lessonMap.get(id)).filter(Boolean);
      const visible = groupLessons.filter((lesson) => lessonMatches(lesson, filter));
      if (!visible.length) return '';
      const groupDone = groupLessons.filter((lesson) => done.has(lesson.id)).length;
      return `
        <section class="course-card">
          <div class="course-title">
            <h2>${escapeHTML(group.title)}</h2>
            <span>${groupDone} / ${groupLessons.length}</span>
          </div>
          <div class="course-body">
            <div class="course-art">${courseSvg(groupIndex)}</div>
            <div class="lesson-list">
              ${visible.map((lesson) => renderLessonRow(lesson, done)).join('')}
            </div>
          </div>
        </section>
      `;
    }).join('');

    stage.innerHTML = `
      <section class="page course-page">
        <div class="courses-head">
          <div>
            <h1 class="section-title">课程</h1>
            <p class="section-subtitle">选择一个模块或直接搜索 SID、DID、DTC、Session。</p>
          </div>
          <label class="search-box">
            ${icons.search}
            <input id="courseSearch" type="search" value="${escapeHTML(courseFilter)}" placeholder="搜索课程内容">
          </label>
        </div>
        <div class="course-groups">
          ${groupMarkup || '<div class="empty-state">没有匹配的课程</div>'}
        </div>
      </section>
    `;

    $('courseSearch').addEventListener('input', (event) => {
      courseFilter = event.target.value;
      renderCourses();
      const input = $('courseSearch');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    stage.querySelectorAll('[data-lesson-id]').forEach((button) => {
      button.addEventListener('click', () => {
        location.hash = '#/learn/' + encodeURIComponent(button.dataset.lessonId);
      });
    });
  }

  function renderLessonRow(lesson, done){
    const index = getLessonIndex(lesson.id);
    const subtitle = lesson.subtitle || '进入本讲学习';
    return `
      <button class="lesson-row ${done.has(lesson.id) ? 'done' : ''}" type="button" data-lesson-id="${escapeHTML(lesson.id)}">
        <span class="lesson-index">${String(index + 1).padStart(2,'0')}</span>
        <span>
          <span class="lesson-name">${escapeHTML(lesson.title)}</span>
          <span class="lesson-sub">${escapeHTML(subtitle)}</span>
        </span>
        <span class="check-dot" aria-hidden="true"></span>
      </button>
    `;
  }

  function renderLearn(id){
    const lesson = getLesson(id);
    if (!lesson) {
      renderCourses();
      return;
    }

    localStorage.setItem(LS.lastLesson, lesson.id);
    activeRoute = 'learn';
    setActiveNav('learn');

    const done = readCompleted();
    const index = getLessonIndex(lesson.id);
    const prev = lessons[index - 1];
    const next = lessons[index + 1];
    const group = getGroupForLesson(lesson.id);
    const readPercent = lessons.length ? Math.round(((index + 1) / lessons.length) * 100) : 0;
    const isDone = done.has(lesson.id);

    stage.innerHTML = `
      <section class="page lesson">
        <div class="learn-head">
          <div>
            <h1 class="section-title">学习</h1>
            <p class="section-subtitle">当前课程会自动保存，下次可以从首页继续。</p>
          </div>
          <a class="secondary-cta" href="#/courses">返回课程</a>
        </div>

        <article class="lesson-shell">
          <div class="lesson-top">
            <div>
              <div class="lesson-kicker">
                <span class="pill">第 ${index + 1} 讲</span>
                <span class="pill">共 ${lessons.length} 讲</span>
                <span class="pill">${escapeHTML(group ? group.title : '诊断课程')}</span>
              </div>
              <h1>${escapeHTML(lesson.title)}</h1>
              ${lesson.subtitle ? `<p class="lesson-subtitle">${escapeHTML(lesson.subtitle)}</p>` : ''}
            </div>
            <div class="learn-actions">
              <button class="action-btn ${isDone ? 'done' : 'primary'}" id="completeBtn" type="button">${isDone ? '已完成' : '完成本讲'}</button>
              ${next ? `<button class="action-btn" id="nextBtn" type="button">下一讲</button>` : ''}
            </div>
          </div>
          <div class="read-meter"><span style="width:${readPercent}%"></span></div>
        </article>

        <section class="lesson-panel">
          ${lesson.html}
        </section>

        <nav class="pager ${(!prev || !next) ? 'single' : ''}">
          ${prev ? `<a href="#/learn/${prev.id}"><span class="arrow">上一讲</span>${escapeHTML(prev.title)}</a>` : ''}
          ${next ? `<a href="#/learn/${next.id}" style="text-align:right"><span class="arrow">下一讲</span>${escapeHTML(next.title)}</a>` : ''}
        </nav>
      </section>
    `;

    $('completeBtn').addEventListener('click', () => {
      const latest = readCompleted();
      if (latest.has(lesson.id)) {
        latest.delete(lesson.id);
        showToast('已取消完成状态');
      } else {
        latest.add(lesson.id);
        showToast(next ? '已完成本讲，下一讲已准备好' : '全部课程已完成');
      }
      writeCompleted(latest);
      renderLearn(lesson.id);
    });

    const nextBtn = $('nextBtn');
    if (nextBtn && next) {
      nextBtn.addEventListener('click', () => {
        location.hash = '#/learn/' + encodeURIComponent(next.id);
      });
    }
  }

  function renderQuiz(quizId){
    const quizzes = Array.isArray(LESSONS.quizzes) ? LESSONS.quizzes : [];
    const quiz = quizzes.find((q) => q.id === quizId) || quizzes[0];
    if (!quiz) { renderCourses(); return; }
    activeRoute = 'quiz';
    setActiveNav('quiz');

    let current = 0;
    let answers = new Array(quiz.questions.length).fill(-1);
    let submitted = false;
    let score = 0;

    function buildQuiz(){
      const q = quiz.questions[current];
      const optionsHtml = q.options.map((opt, i) => `
        <button class="quiz-opt ${answers[current] === i ? 'selected' : ''} ${submitted ? (i === q.correct ? 'correct' : (answers[current] === i ? 'wrong' : '')) : ''}" type="button" data-opt="${i}" ${submitted ? 'disabled' : ''}>
          <span class="opt-letter">${String.fromCharCode(65 + i)}</span>
          <span class="opt-text">${escapeHTML(opt)}</span>
        </button>
      `).join('');

      const progress = Math.round(((current + 1) / quiz.questions.length) * 100);
      const navHtml = quiz.questions.map((_, i) => `
        <button class="quiz-dot ${i === current ? 'active' : ''} ${answers[i] !== -1 ? 'done' : ''} ${submitted ? (answers[i] === quiz.questions[i].correct ? 'ok' : 'bad') : ''}" data-idx="${i}" type="button"></button>
      `).join('');

      const scoreHtml = submitted ? `<div class="score-board">得分：${score} / ${quiz.questions.length}</div>` : '';

      stage.innerHTML = `
        <section class="page quiz-page">
          <div class="learn-head">
            <div>
              <h1 class="section-title">测验</h1>
              <p class="section-subtitle">${escapeHTML(quiz.title)}</p>
            </div>
            <a class="secondary-cta" href="#/courses">返回课程</a>
          </div>
          <div class="read-meter"><span style="width:${progress}%"></span></div>
          <div class="quiz-nav">${navHtml}</div>
          <article class="lesson-panel quiz-panel">
            <div class="quiz-question">
              <span class="pill">第 ${current + 1} / ${quiz.questions.length} 题</span>
              <h2>${escapeHTML(q.q)}</h2>
            </div>
            <div class="quiz-options">${optionsHtml}</div>
            ${submitted && q.explanation ? `<div class="quiz-explanation">${escapeHTML(q.explanation)}</div>` : ''}
            ${scoreHtml}
            <div class="quiz-actions">
              ${current > 0 ? `<button class="action-btn" id="prevQ" type="button">上一题</button>` : '<span></span>'}
              ${!submitted ? `<button class="action-btn primary" id="submitQ" type="button">提交答案</button>` : ''}
              ${submitted && current < quiz.questions.length - 1 ? `<button class="action-btn primary" id="nextQ" type="button">下一题</button>` : ''}
              ${submitted && current === quiz.questions.length - 1 ? `<a class="action-btn primary" href="#/courses">完成测验</a>` : ''}
            </div>
          </article>
        </section>
      `;

      if (!submitted) {
        stage.querySelectorAll('.quiz-opt').forEach((btn) => {
          btn.addEventListener('click', () => {
            answers[current] = parseInt(btn.dataset.opt, 10);
            buildQuiz();
          });
        });
        const submitBtn = $('submitQ');
        if (submitBtn) {
          submitBtn.addEventListener('click', () => {
            if (answers[current] === -1) { showToast('请先选择一个答案'); return; }
            if (current < quiz.questions.length - 1) {
              current += 1;
              buildQuiz();
            } else {
              submitted = true;
              score = quiz.questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0);
              buildQuiz();
              showToast('测验完成！得分：' + score + ' / ' + quiz.questions.length);
            }
          });
        }
      } else {
        stage.querySelectorAll('.quiz-dot').forEach((btn) => {
          btn.addEventListener('click', () => {
            current = parseInt(btn.dataset.idx, 10);
            buildQuiz();
          });
        });
        const nextBtn = $('nextQ');
        if (nextBtn) nextBtn.addEventListener('click', () => { current += 1; buildQuiz(); });
      }
      const prevBtn = $('prevQ');
      if (prevBtn) prevBtn.addEventListener('click', () => { current -= 1; buildQuiz(); });
    }

    buildQuiz();
  }

  function renderServices(){
    const services = Array.isArray(serviceData.services) ? serviceData.services : [];
    const dids = Array.isArray(serviceData.dids) ? serviceData.dids : [];
    const routines = Array.isArray(serviceData.routines) ? serviceData.routines : [];
    const sequences = Array.isArray(serviceData.sequences) ? serviceData.sequences : [];
    const filter = serviceFilter.trim().toLowerCase();
    activeRoute = 'services';
    setActiveNav('services');

    const didStats = dids.reduce((acc, did) => {
      did.operations.forEach((op) => { acc[op.type] = (acc[op.type] || 0) + 1; });
      return acc;
    }, { read:0, write:0, ioctl:0 });

    const tabs = [
      ['services', '服务'],
      ['dids', 'DID'],
      ['routines', 'RID'],
      ['flows', '关系'],
    ];

    stage.innerHTML = `
      <section class="page service-page">
        <div class="courses-head service-head">
          <div>
            <h1 class="section-title">DFXY 服务表</h1>
            <p class="section-subtitle">来源：EB 生成的 DCM 配置 + DFXY callout。权限按服务级和对象级合并后展示。</p>
          </div>
          <label class="search-box service-search">
            ${icons.search}
            <input id="serviceSearch" type="search" value="${escapeHTML(serviceFilter)}" placeholder="搜索 SID / DID / RID / 函数">
          </label>
        </div>

        <div class="service-stats">
          <div><span>启用服务</span><b>${services.length}</b></div>
          <div><span>DID</span><b>${dids.length}</b></div>
          <div><span>RID</span><b>${routines.length}</b></div>
          <div><span>读/写/控制</span><b>${didStats.read}/${didStats.write}/${didStats.ioctl}</b></div>
        </div>

        <div class="service-tabs">
          ${tabs.map(([id, label]) => `<button class="service-tab ${serviceTab === id ? 'active' : ''}" type="button" data-service-tab="${id}">${label}</button>`).join('')}
        </div>

        ${renderServiceTabContent(serviceTab, filter, { services, dids, routines, sequences })}
      </section>
    `;

    $('serviceSearch').addEventListener('input', (event) => {
      serviceFilter = event.target.value;
      renderServices();
      const input = $('serviceSearch');
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    stage.querySelectorAll('[data-service-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        serviceTab = button.dataset.serviceTab;
        renderServices();
      });
    });
  }

  function renderServiceTabContent(tab, filter, data){
    if (tab === 'dids') return renderDidCatalog(data.dids, filter);
    if (tab === 'routines') return renderRoutineCatalog(data.routines, filter);
    if (tab === 'flows') return renderServiceFlows(data.sequences);
    return renderServiceCatalog(data.services, filter);
  }

  function matchesFilter(item, filter){
    if (!filter) return true;
    return JSON.stringify(item).toLowerCase().includes(filter);
  }

  function tagList(items){
    return (items || []).map((item) => `<span class="svc-tag">${escapeHTML(item)}</span>`).join('');
  }

  function sourceRef(ref){
    return ref ? `<span class="source-ref">${escapeHTML(ref.file)}:${ref.line}</span>` : '<span class="source-ref muted">未定位到定义</span>';
  }

  function renderCode(code){
    return `<pre class="svc-code"><code>${escapeHTML(code || '')}</code></pre>`;
  }

  function renderServiceCatalog(services, filter){
    const visible = services.filter((service) => matchesFilter(service, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的服务</div>';
    return `
      <div class="service-grid">
        ${visible.map((service) => `
          <article class="svc-card">
            <div class="svc-card-head">
              <div>
                <span class="svc-sid">${escapeHTML(service.sid)}</span>
                <h2>${escapeHTML(service.name)}</h2>
              </div>
              <span class="svc-handler">${escapeHTML(service.handler || '-')}</span>
            </div>
            <p>${escapeHTML(service.summary)}</p>
            <div class="svc-meta">
              <div><b>服务级 Session</b>${tagList(service.sessionsText)}</div>
              <div><b>服务级 Security</b>${tagList(service.securityText)}</div>
            </div>
            ${service.dependencies ? `<div class="svc-impact">${escapeHTML(service.dependencies)}</div>` : ''}
            ${renderSubserviceTable(service)}
            <details class="svc-details">
              <summary>配置代码块</summary>
              ${renderCode(service.code)}
            </details>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderSubserviceTable(service){
    if (!service.subservices || !service.subservices.length) {
      return '<div class="svc-empty-line">无子服务：权限直接看服务级条件。</div>';
    }
    return `
      <div class="svc-table-wrap compact">
        <table class="svc-table">
          <thead><tr><th>子服务</th><th>含义</th><th>额外 Session</th><th>额外 Security</th><th>处理函数</th></tr></thead>
          <tbody>
            ${service.subservices.map((sub) => `
              <tr>
                <td><code>${escapeHTML(sub.id)}</code> ${escapeHTML(sub.name || '')}</td>
                <td>${escapeHTML(sub.meaning || '')}</td>
                <td>${tagList(sub.sessionsText)}</td>
                <td>${tagList(sub.securityText)}</td>
                <td><code>${escapeHTML(sub.externalHandler || sub.internalHandler || '-')}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderDidCatalog(dids, filter){
    const visible = dids.filter((did) => matchesFilter(did, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的 DID</div>';
    return `
      <div class="svc-table-wrap">
        <table class="svc-table did-table">
          <thead>
            <tr><th>DID</th><th>名称</th><th>长度</th><th>可用服务</th><th>有效条件</th><th>代码入口</th></tr>
          </thead>
          <tbody>
            ${visible.map((did) => `
              <tr>
                <td><code>${escapeHTML(did.did)}</code></td>
                <td>${escapeHTML(did.name)}<span class="svc-small">${did.sync ? '同步 DID' : '异步 DID'}</span></td>
                <td>${escapeHTML(did.sizeText)}</td>
                <td>${did.operations.map((op) => `<span class="svc-op">${escapeHTML(op.service)} ${escapeHTML(op.type)}</span>`).join('')}</td>
                <td>${did.operations.map((op) => `
                  <div class="svc-cond"><b>${escapeHTML(op.service)}</b> ${escapeHTML(op.sessionsText.join(' / '))} · ${escapeHTML(op.securityText.join(' / '))}</div>
                `).join('')}</td>
                <td>
                  ${did.operations.map((op) => renderOperationRefs(op)).join('')}
                  <details class="svc-details inline"><summary>代码块</summary>${renderCode(did.code)}</details>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderOperationRefs(op){
    const io = op.ioSubservices && op.ioSubservices.length ? `<div class="svc-small">${escapeHTML(op.ioSubservices.join(' / '))}</div>` : '';
    const fns = (op.functions || []).map((fn) => `
      <div class="fn-ref"><code>${escapeHTML(fn.fn)}()</code>${sourceRef(fn.ref)}</div>
    `).join('');
    return `<div class="op-ref"><b>${escapeHTML(op.service)} ${escapeHTML(op.type)}</b>${io}${fns || '<span class="svc-small">由 DCM 内部处理</span>'}</div>`;
  }

  function renderRoutineCatalog(routines, filter){
    const visible = routines.filter((routine) => matchesFilter(routine, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的 RID</div>';
    return `
      <div class="service-grid routine-grid">
        ${visible.map((routine) => `
          <article class="svc-card">
            <div class="svc-card-head">
              <div>
                <span class="svc-sid">${escapeHTML(routine.rid)}</span>
                <h2>${escapeHTML(routine.name)}</h2>
              </div>
              <span class="svc-handler">0x31</span>
            </div>
            <div class="svc-meta">
              <div><b>RID Session</b>${tagList(routine.sessionsText)}</div>
              <div><b>RID Security</b>${tagList(routine.securityText)}</div>
            </div>
            <div class="routine-subs">
              ${routine.subservices.map((sub) => `
                <div class="routine-sub">
                  <span class="svc-op">${escapeHTML(sub.id)} ${escapeHTML(sub.name)}</span>
                  <code>${escapeHTML(sub.wrapper)}()</code>
                  ${sub.calls.map((call) => `<div class="fn-ref"><code>${escapeHTML(call.fn)}()</code>${sourceRef(call.ref)}</div>`).join('')}
                </div>
              `).join('')}
            </div>
            <details class="svc-details">
              <summary>配置代码块</summary>
              ${renderCode(routine.code)}
            </details>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderServiceFlows(sequences){
    const security = serviceData.security && Array.isArray(serviceData.security.levels) ? serviceData.security.levels[0] : null;
    const memory = serviceData.memory || {};
    return `
      <div class="flow-grid">
        <section class="flow-panel">
          <h2>服务互相影响</h2>
          <div class="flow-list">
            ${sequences.map((seq) => `
              <article class="flow-card">
                <h3>${escapeHTML(seq.title)}</h3>
                <div class="flow-steps">${seq.steps.map((step) => `<code>${escapeHTML(step)}</code>`).join('<span>→</span>')}</div>
                <p>${escapeHTML(seq.why)}</p>
              </article>
            `).join('')}
          </div>
        </section>
        <section class="flow-panel">
          <h2>Security L1</h2>
          ${security ? `
            <div class="svc-meta">
              <div><b>Seed/Key</b>${tagList([`${security.seedSize}B Seed`, `${security.keySize}B Key`])}</div>
              <div><b>失败延时</b>${tagList([`${security.attemptsUntilDelay} 次后延时`, `${security.delayTimeMs} ms`])}</div>
            </div>
            <div class="fn-ref"><code>${escapeHTML(security.getSeed.fn)}()</code>${sourceRef(security.getSeed.ref)}</div>
            <div class="fn-ref"><code>${escapeHTML(security.compareKey.fn)}()</code>${sourceRef(security.compareKey.ref)}</div>
            ${renderCode(security.code)}
          ` : '<div class="empty-state">无 Security 配置</div>'}
        </section>
        <section class="flow-panel wide">
          <h2>内存服务范围</h2>
          <p class="section-subtitle">0x23 / 0x3D 只允许访问 DCM 生成表中的范围。</p>
          ${renderCode(memory.code || '')}
        </section>
      </div>
    `;
  }

  function parseRoute(){
    const hash = location.hash || '#/home';
    const clean = hash.replace(/^#\/?/, '');
    const parts = clean.split('/').filter(Boolean);
    if (!parts.length) return { name:'home' };
    if (parts[0] === 'home') return { name:'home' };
    if (parts[0] === 'courses') return { name:'courses' };
    if (parts[0] === 'learn') return { name:'learn', id: parts[1] };
    if (parts[0] === 'services') return { name:'services' };
    if (parts[0] === 'quiz') return { name:'quiz', id: parts[1] };
    return { name:'home' };
  }

  function route(){
    const target = parseRoute();
    if (target.name === 'home') renderHome();
    if (target.name === 'courses') renderCourses();
    if (target.name === 'learn') {
      const lesson = target.id ? getLesson(decodeURIComponent(target.id)) : getCurrentLearnLesson();
      renderLearn(lesson.id);
    }
    if (target.name === 'services') renderServices();
    if (target.name === 'quiz') renderQuiz(target.id);
    stage.scrollTo({ top:0, behavior:'instant' });
    window.scrollTo({ top:0, behavior:'instant' });
    updateScrollMeter();
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
        $('mobileVerBtn').classList.add('has-update');
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

  function bindStaticEvents(){
    $('verBtn').addEventListener('click', showVerModal);
    $('mobileVerBtn').addEventListener('click', showVerModal);
    $('verClose').addEventListener('click', () => $('verMask').classList.remove('show'));
    $('verMask').addEventListener('click', (event) => {
      if (event.target.id === 'verMask') $('verMask').classList.remove('show');
    });
    $('verUpdate').addEventListener('click', forceUpdate);
    window.addEventListener('hashchange', route);
    window.addEventListener('scroll', updateScrollMeter, { passive:true });
    stage.addEventListener('scroll', updateScrollMeter, { passive:true });
    window.addEventListener('resize', () => {
      applyDeviceMode();
      updateScrollMeter();
    });
  }

  function init(){
    versionText.textContent = LESSONS.appVersion || '1.0';
    setNavMarkup();
    bindStaticEvents();
    applyDeviceMode();

    if (!localStorage.getItem(LS.localVer) && LESSONS.appVersion) {
      localStorage.setItem(LS.localVer, LESSONS.appVersion);
    }

    if (!location.hash) {
      location.replace('#/home');
    }

    route();
    checkVersion();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
      });
    }
  }

  init();
})();
