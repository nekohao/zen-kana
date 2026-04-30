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
              <a class="action-btn" href="#/quiz/${encodeURIComponent(lesson.id)}">本讲测验</a>
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

  function cleanText(value){
    return String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function uniqueList(items){
    const seen = new Set();
    return (items || []).map((item) => cleanText(item)).filter((item) => {
      if (!item || item.length < 2 || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  }

  function extractHeadings(lesson){
    return uniqueList(Array.from(String(lesson.html || '').matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)).map((match) => match[1]));
  }

  function extractKeywords(lesson){
    const html = String(lesson.html || '');
    const codes = Array.from(html.matchAll(/\b0x[0-9a-fA-F]{2,8}\b/g)).map((match) => match[0].toUpperCase());
    const terms = Array.from(cleanText(html).matchAll(/\b(UDS|ISO-TP|CAN-FD|CAN|DID|RID|DTC|NRC|DCM|DEM|OBD-II|Seed\/Key|Session|Security|Bootloader|Callout|NvM|CanTp|S3server|P2\*?)\b/gi)).map((match) => match[0]);
    const funcs = Array.from(html.matchAll(/\b[A-Za-z][A-Za-z0-9_]{5,}\(\)/g)).map((match) => match[0]);
    return uniqueList([...codes, ...terms, ...funcs]);
  }

  function makeOptions(correct, pool, seed){
    const fallback = ['UDS 诊断报文', 'ISO-TP 分帧传输', 'DID 数据访问', 'DTC 故障管理', 'DCM 服务分发', 'Session/Security 权限'];
    const answer = cleanText(correct) || '本讲核心概念';
    const distractors = uniqueList([...(pool || []), ...fallback]).filter((item) => item !== answer).slice(0, 3);
    fallback.forEach((item) => {
      if (distractors.length < 3 && item !== answer && !distractors.includes(item)) distractors.push(item);
    });
    const options = distractors.slice(0, 3);
    const correctIndex = Math.abs(seed || 0) % 4;
    options.splice(correctIndex, 0, answer);
    return { options, correct: correctIndex };
  }

  function buildLessonQuiz(lesson){
    const index = getLessonIndex(lesson.id);
    const headings = extractHeadings(lesson);
    const keywords = extractKeywords(lesson);
    const titlePool = lessons.filter((item) => item.id !== lesson.id).map((item) => item.title);
    const headingPool = lessons.filter((item) => item.id !== lesson.id).flatMap(extractHeadings);
    const subtitlePool = lessons.filter((item) => item.id !== lesson.id).map((item) => item.subtitle || item.title);
    const keywordPool = lessons.filter((item) => item.id !== lesson.id).flatMap(extractKeywords);
    const topic = makeOptions(lesson.title, titlePool, index);
    const section = makeOptions(headings[0] || lesson.subtitle || lesson.title, headingPool, index + 1);
    const keyword = makeOptions(keywords[0] || headings[0] || lesson.title, keywordPool, index + 2);
    const target = makeOptions(lesson.subtitle || headings[1] || headings[0] || lesson.title, subtitlePool.concat(headingPool), index + 3);

    return {
      id: lesson.id,
      lessonId: lesson.id,
      title: `第 ${index + 1} 讲测验：${lesson.title}`,
      questions: [
        {
          q: '本讲主要围绕哪一项展开？',
          options: topic.options,
          correct: topic.correct,
          explanation: `本讲标题是「${lesson.title}」，测验聚焦这一讲。`
        },
        {
          q: '下面哪一项最接近本讲的核心章节？',
          options: section.options,
          correct: section.correct,
          explanation: `本讲正文首先展开的是「${section.options[section.correct]}」。`
        },
        {
          q: '本讲正文中重点出现的诊断关键词是哪一个？',
          options: keyword.options,
          correct: keyword.correct,
          explanation: `「${keyword.options[keyword.correct]}」来自本讲正文的服务号、术语或代码入口。`
        },
        {
          q: '学完本讲后，最应该能解释哪类内容？',
          options: target.options,
          correct: target.correct,
          explanation: `这对应本讲的学习目标：${target.options[target.correct]}。`
        }
      ]
    };
  }

  function getQuizForId(quizId){
    const quizzes = Array.isArray(LESSONS.quizzes) ? LESSONS.quizzes : [];
    const id = quizId ? decodeURIComponent(quizId) : '';
    const explicit = quizzes.find((q) => q.id === id);
    if (explicit) return explicit;
    const lesson = lessonMap.get(id);
    return lesson ? buildLessonQuiz(lesson) : null;
  }

  function renderQuizCatalog(){
    activeRoute = 'quiz';
    setActiveNav('quiz');
    const quizzes = Array.isArray(LESSONS.quizzes) ? LESSONS.quizzes : [];
    const done = readCompleted();
    const groupMarkup = groups.map((group) => {
      const groupLessons = group.lessons.map((id) => lessonMap.get(id)).filter(Boolean);
      return `
        <section class="course-card quiz-group">
          <div class="course-title">
            <h2>${escapeHTML(group.title)}</h2>
            <span>${groupLessons.length} 个测验</span>
          </div>
          <div class="quiz-list">
            ${groupLessons.map((lesson) => {
              const index = getLessonIndex(lesson.id);
              return `
                <a class="quiz-row ${done.has(lesson.id) ? 'done' : ''}" href="#/quiz/${encodeURIComponent(lesson.id)}">
                  <span class="lesson-index">${String(index + 1).padStart(2,'0')}</span>
                  <span class="quiz-row-main">
                    <span class="lesson-name">${escapeHTML(lesson.title)}</span>
                    <span class="lesson-sub">${escapeHTML(lesson.subtitle || '本讲知识点测验')}</span>
                  </span>
                  <span class="quiz-badge">4 题</span>
                </a>
              `;
            }).join('')}
          </div>
        </section>
      `;
    }).join('');

    stage.innerHTML = `
      <section class="page quiz-page">
        <div class="courses-head">
          <div>
            <h1 class="section-title">测验</h1>
            <p class="section-subtitle">每一讲都有独立测验；进入课程页也可以直接点“本讲测验”。</p>
          </div>
          ${quizzes.length ? `<a class="primary-cta" href="#/quiz/${encodeURIComponent(quizzes[0].id)}">综合测验 ${icons.arrow}</a>` : '<a class="secondary-cta" href="#/courses">返回课程</a>'}
        </div>
        <div class="quiz-catalog">
          ${groupMarkup}
        </div>
      </section>
    `;
  }

  function renderQuiz(quizId){
    if (!quizId) {
      renderQuizCatalog();
      return;
    }
    const quiz = getQuizForId(quizId);
    if (!quiz) {
      renderQuizCatalog();
      return;
    }
    activeRoute = 'quiz';
    setActiveNav('quiz');

    let current = 0;
    let answers = new Array(quiz.questions.length).fill(-1);
    let submitted = false;
    let score = 0;
    const backHref = quiz.lessonId ? `#/learn/${encodeURIComponent(quiz.lessonId)}` : '#/quiz';
    const doneHref = quiz.lessonId ? backHref : '#/quiz';
    const backText = quiz.lessonId ? '返回本讲' : '返回测验目录';

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
            <a class="secondary-cta" href="${backHref}">${backText}</a>
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
              ${submitted && current === quiz.questions.length - 1 ? `<a class="action-btn primary" href="${doneHref}">完成测验</a>` : ''}
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

  function shortFile(path){
    return String(path || '').split(/[\\/]/).pop() || path || '';
  }

  function sourceRef(ref){
    if (!ref) return '<span class="source-ref muted">未定位到定义</span>';
    const full = `${ref.file}:${ref.line}`;
    return `<span class="source-ref" title="${escapeHTML(full)}">${escapeHTML(shortFile(ref.file))}:${ref.line}</span>`;
  }

  function operationLabel(type){
    return ({
      read: '读取',
      write: '写入',
      ioctl: 'IO 控制',
    })[type] || type;
  }

  function handlerLabel(value){
    return value ? `<code>${escapeHTML(value)}()</code>` : '<span class="svc-small">由 DCM 内部处理</span>';
  }

  function renderConditionGrid(items){
    return `
      <div class="svc-meta">
        ${items.map((item) => `
          <div>
            <b>${escapeHTML(item.label)}</b>
            ${tagList(item.values && item.values.length ? item.values : ['任意'])}
          </div>
        `).join('')}
      </div>
    `;
  }

  function codeTone(line){
    const text = line.trim();
    if (text.startsWith('->')) return ' is-call';
    if (text.includes('sessions=') || text.includes('security=')) return ' is-cond';
    if (text.includes('//')) return ' is-source';
    return '';
  }

  function renderCode(code, title='代码引用'){
    const lines = String(code || '').split(/\r?\n/);
    const body = lines.map((line, index) => `
      <span class="code-line${codeTone(line)}">
        <span class="code-no">${index + 1}</span>
        <span class="code-text">${escapeHTML(line || ' ')}</span>
      </span>
    `).join('');
    return `
      <div class="svc-code">
        <div class="code-head"><span>${escapeHTML(title)}</span><span>${lines.length} 行</span></div>
        <pre class="code-lines"><code>${body}</code></pre>
      </div>
    `;
  }

  function renderServiceCatalog(services, filter){
    const visible = services.filter((service) => matchesFilter(service, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的服务</div>';
    return `
      <div class="svc-tree">
        ${visible.map((service) => `
          <details class="tree-node svc-node">
            <summary class="tree-summary">
              <span class="tree-caret"></span>
              <span class="tree-id">${escapeHTML(service.sid)}</span>
              <span class="tree-main">
                <span class="tree-title">${escapeHTML(service.name)}</span>
                <span class="tree-sub">${escapeHTML(service.summary)}</span>
              </span>
              <span class="tree-count">${(service.subservices || []).length || 0} 子服务</span>
              <span class="tree-handler">${escapeHTML(service.handler || 'DCM 内部')}</span>
            </summary>
            <div class="tree-body">
              ${renderConditionGrid([
                { label:'服务级 Session', values:service.sessionsText },
                { label:'服务级 Security', values:service.securityText },
              ])}
              ${service.dependencies ? `<div class="svc-impact"><b>影响关系</b>${escapeHTML(service.dependencies)}</div>` : ''}
              ${renderSubserviceTree(service)}
              <details class="inner-details">
                <summary>查看服务配置代码</summary>
                ${renderCode(service.code, `${service.sid} ${service.name}`)}
              </details>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  function renderSubserviceTree(service){
    if (!service.subservices || !service.subservices.length) {
      return '<div class="svc-empty-line">无子服务：权限直接看服务级条件。</div>';
    }
    return `
      <div class="sub-tree">
        <div class="tree-section-title">子服务目录</div>
        ${service.subservices.map((sub) => `
          <details class="tree-node sub-node">
            <summary class="tree-summary compact">
              <span class="tree-caret"></span>
              <span class="tree-id">${escapeHTML(sub.id)}</span>
              <span class="tree-main">
                <span class="tree-title">${escapeHTML(sub.name || 'SubFunction')}</span>
                <span class="tree-sub">${escapeHTML(sub.meaning || '查看该子服务的权限和处理入口')}</span>
              </span>
              <span class="tree-count">${escapeHTML((sub.securityText || ['任意']).join(' / '))}</span>
            </summary>
            <div class="tree-body compact">
              ${renderConditionGrid([
                { label:'额外 Session', values:sub.sessionsText },
                { label:'额外 Security', values:sub.securityText },
              ])}
              <div class="fn-ref">
                <b>处理入口</b>
                ${handlerLabel(sub.externalHandler || sub.internalHandler)}
              </div>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  function renderDidCatalog(dids, filter){
    const visible = dids.filter((did) => matchesFilter(did, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的 DID</div>';
    return `
      <div class="svc-tree">
        ${visible.map((did) => `
          <details class="tree-node did-node">
            <summary class="tree-summary">
              <span class="tree-caret"></span>
              <span class="tree-id">${escapeHTML(did.did)}</span>
              <span class="tree-main">
                <span class="tree-title">${escapeHTML(did.name)}</span>
                <span class="tree-sub">${escapeHTML(did.sizeText)} · ${did.sync ? '同步 DID' : '异步 DID'}</span>
              </span>
              <span class="tree-count">${did.operations.length} 个入口</span>
              <span class="tree-handler">${did.operations.map((op) => `${op.service} ${operationLabel(op.type)}`).join(' / ')}</span>
            </summary>
            <div class="tree-body">
              <div class="op-tree">
                ${did.operations.map((op) => renderOperationNode(op)).join('')}
              </div>
              <details class="inner-details">
                <summary>查看 DID 配置代码</summary>
                ${renderCode(did.code, `${did.did} ${did.name}`)}
              </details>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  function renderOperationNode(op){
    const io = op.ioSubservices && op.ioSubservices.length
      ? `<div class="svc-impact light"><b>IO 子功能</b>${tagList(op.ioSubservices)}</div>`
      : '';
    return `
      <details class="tree-node sub-node op-node">
        <summary class="tree-summary compact">
          <span class="tree-caret"></span>
          <span class="tree-id">${escapeHTML(op.service)}</span>
          <span class="tree-main">
            <span class="tree-title">${escapeHTML(operationLabel(op.type))}</span>
            <span class="tree-sub">${escapeHTML(op.sessionsText.join(' / '))} · ${escapeHTML(op.securityText.join(' / '))}</span>
          </span>
          <span class="tree-count">${(op.functions || []).length || 0} 函数</span>
        </summary>
        <div class="tree-body compact">
          ${renderConditionGrid([
            { label:'有效 Session', values:op.sessionsText },
            { label:'有效 Security', values:op.securityText },
          ])}
          ${io}
          ${renderOperationRefs(op)}
        </div>
      </details>
    `;
  }

  function renderOperationRefs(op){
    const fns = (op.functions || []).map((fn) => `
      <div class="fn-ref">
        <b>${escapeHTML(fn.comment || fn.kind || 'callout')}</b>
        <code>${escapeHTML(fn.fn)}()</code>
        ${sourceRef(fn.ref)}
      </div>
    `).join('');
    return fns || '<div class="fn-ref"><b>处理入口</b><span class="svc-small">由 DCM 内部处理</span></div>';
  }

  function renderRoutineCatalog(routines, filter){
    const visible = routines.filter((routine) => matchesFilter(routine, filter));
    if (!visible.length) return '<div class="empty-state">没有匹配的 RID</div>';
    return `
      <div class="svc-tree">
        ${visible.map((routine) => `
          <details class="tree-node rid-node">
            <summary class="tree-summary">
              <span class="tree-caret"></span>
              <span class="tree-id">${escapeHTML(routine.rid)}</span>
              <span class="tree-main">
                <span class="tree-title">${escapeHTML(routine.name)}</span>
                <span class="tree-sub">0x31 RoutineControl · ${escapeHTML(routine.sessionsText.join(' / '))} · ${escapeHTML(routine.securityText.join(' / '))}</span>
              </span>
              <span class="tree-count">${routine.subservices.length} 子服务</span>
              <span class="tree-handler">0x31</span>
            </summary>
            <div class="tree-body">
              ${renderConditionGrid([
                { label:'RID Session', values:routine.sessionsText },
                { label:'RID Security', values:routine.securityText },
              ])}
              <div class="sub-tree">
                <div class="tree-section-title">RID 子服务目录</div>
                ${routine.subservices.map((sub) => `
                  <details class="tree-node sub-node">
                    <summary class="tree-summary compact">
                      <span class="tree-caret"></span>
                      <span class="tree-id">${escapeHTML(sub.id)}</span>
                      <span class="tree-main">
                        <span class="tree-title">${escapeHTML(sub.name)}</span>
                        <span class="tree-sub">${escapeHTML(sub.wrapper)}()</span>
                      </span>
                      <span class="tree-count">${sub.calls.length} callout</span>
                    </summary>
                    <div class="tree-body compact">
                      <div class="fn-ref">
                        <b>DCM wrapper</b>
                        <code>${escapeHTML(sub.wrapper)}()</code>
                      </div>
                      ${sub.calls.map((call) => `
                        <div class="fn-ref">
                          <b>应用 callout</b>
                          <code>${escapeHTML(call.fn)}()</code>
                          ${sourceRef(call.ref)}
                        </div>
                      `).join('')}
                    </div>
                  </details>
                `).join('')}
              </div>
              <details class="inner-details">
                <summary>查看 RID 配置代码</summary>
                ${renderCode(routine.code, `${routine.rid} ${routine.name}`)}
              </details>
            </div>
          </details>
        `).join('')}
      </div>
    `;
  }

  function renderServiceFlows(sequences){
    const security = serviceData.security && Array.isArray(serviceData.security.levels) ? serviceData.security.levels[0] : null;
    const memory = serviceData.memory || {};
    return `
      <div class="svc-tree">
        ${sequences.map((seq) => `
          <details class="tree-node flow-node">
            <summary class="tree-summary">
              <span class="tree-caret"></span>
              <span class="tree-id">FLOW</span>
              <span class="tree-main">
                <span class="tree-title">${escapeHTML(seq.title)}</span>
                <span class="tree-sub">${seq.steps.map((step) => escapeHTML(step)).join(' -> ')}</span>
              </span>
              <span class="tree-count">${seq.steps.length} 步</span>
            </summary>
            <div class="tree-body">
              <div class="flow-steps">${seq.steps.map((step) => `<code>${escapeHTML(step)}</code>`).join('<span>→</span>')}</div>
              <p class="flow-note">${escapeHTML(seq.why)}</p>
            </div>
          </details>
        `).join('')}
        <details class="tree-node flow-node">
          <summary class="tree-summary">
            <span class="tree-caret"></span>
            <span class="tree-id">L1</span>
            <span class="tree-main">
              <span class="tree-title">Security L1</span>
              <span class="tree-sub">${security ? `${security.seedSize}B Seed / ${security.keySize}B Key` : '无 Security 配置'}</span>
            </span>
            <span class="tree-count">0x27</span>
          </summary>
          <div class="tree-body">
            ${security ? `
              ${renderConditionGrid([
                { label:'Seed/Key', values:[`${security.seedSize}B Seed`, `${security.keySize}B Key`] },
                { label:'失败延时', values:[`${security.attemptsUntilDelay} 次后延时`, `${security.delayTimeMs} ms`] },
              ])}
              <div class="fn-ref"><b>获取 Seed</b><code>${escapeHTML(security.getSeed.fn)}()</code>${sourceRef(security.getSeed.ref)}</div>
              <div class="fn-ref"><b>比较 Key</b><code>${escapeHTML(security.compareKey.fn)}()</code>${sourceRef(security.compareKey.ref)}</div>
              ${renderCode(security.code, 'Security L1 配置')}
            ` : '<div class="empty-state">无 Security 配置</div>'}
          </div>
        </details>
        <details class="tree-node flow-node">
          <summary class="tree-summary">
            <span class="tree-caret"></span>
            <span class="tree-id">MEM</span>
            <span class="tree-main">
              <span class="tree-title">内存服务范围</span>
              <span class="tree-sub">0x23 / 0x3D 只允许访问 DCM 生成表中的范围</span>
            </span>
            <span class="tree-count">range</span>
          </summary>
          <div class="tree-body">
            ${renderCode(memory.code || '', '0x23 / 0x3D 内存范围')}
          </div>
        </details>
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
