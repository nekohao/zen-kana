(() => {
  const STORAGE_KEY = "speakdaily.v1";
  const PHRASES_PER_DAY = 5;
  const phrases = window.SPEAK_DAILY_PHRASES || [];
  const groups = window.SPEAK_DAILY_GROUPS || [];
  const lessons = window.SPEAK_DAILY_GRAMMAR || [];
  const byId = new Map(phrases.map((item) => [item.id, item]));
  const lessonById = new Map(lessons.map((item) => [item.id, item]));
  const $ = (id) => document.getElementById(id);
  const state = loadState();
  let phraseQueue = getDailyPhrases();
  let phraseQueueName = "今日短语";
  let phraseIndex = 0;
  let activeGroup = "全部";
  let activeLessonId = todayLesson().id;

  const els = {
    screens: [...document.querySelectorAll(".screen")],
    tabs: [...document.querySelectorAll(".tab")],
    streak: $("streakCount"),
    courseDone: $("courseDone"),
    courseCount: $("courseCount"),
    reviewCount: $("reviewCount"),
    todayLessonTitle: $("todayLessonTitle"),
    todayLessonLead: $("todayLessonLead"),
    dailyList: $("dailyList"),
    courseList: $("courseList"),
    lessonView: $("lessonView"),
    groupFilters: $("groupFilters"),
    libraryList: $("libraryList"),
    libraryCount: $("libraryCount"),
    reviewList: $("reviewList"),
    search: $("searchInput"),
    phraseText: $("phraseText"),
    phraseMeaning: $("phraseMeaning"),
    phraseTip: $("phraseTip"),
    phraseExample: $("phraseExample"),
    practiceGroup: $("practiceGroup"),
    progress: $("practiceProgress"),
    score: $("scoreText"),
    transcript: $("transcriptText"),
    favorite: $("favoriteBtn")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    renderAll();
    openPractice(phraseQueue, "今日短语", 0, false);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  function bindEvents() {
    els.tabs.forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.tab)));
    $("startDailyBtn").addEventListener("click", () => openLesson(todayLesson().id));
    $("shuffleDailyBtn").addEventListener("click", () => {
      state.dailyShift = (state.dailyShift || 0) + 1;
      delete state.dailyPlan[todayKey()];
      delete state.daily[todayKey()];
      save();
      renderToday();
    });
    $("playBtn").addEventListener("click", () => speakText(currentPhrase()?.en, 1));
    $("slowBtn").addEventListener("click", () => speakText(currentPhrase()?.en, 0.72));
    $("goodBtn").addEventListener("click", () => finishPhrase(true));
    $("missBtn").addEventListener("click", () => finishPhrase(false));
    $("nextPhraseBtn").addEventListener("click", nextPhrase);
    $("favoriteBtn").addEventListener("click", toggleFavorite);
    $("startReviewBtn").addEventListener("click", startPhraseReview);
    $("reviewGrammarBtn").addEventListener("click", startLessonReview);
    $("exportBtn").addEventListener("click", exportBackup);
    $("importBtn").addEventListener("click", () => $("restoreFile").click());
    $("restoreFile").addEventListener("change", importBackup);
    $("resetBtn").addEventListener("click", resetProgress);
    $("installHintBtn").addEventListener("click", () => { showScreen("review"); $("installNote").scrollIntoView({behavior:"smooth", block:"center"}); });
    els.search.addEventListener("input", renderLibrary);
    els.courseList.addEventListener("click", handleCourseClick);
    els.lessonView.addEventListener("click", handleLessonClick);
  }

  function defaultState() {
    return {
      version: 1,
      lastStudyDate: "",
      streak: 0,
      completedDates: [],
      daily: {},
      dailyPlan: {},
      attempts: {},
      mistakes: {},
      favorites: {},
      settings: {rate: 1},
      dailyShift: 0,
      grammarProgress: {},
      lessonScores: {},
      lessonNotes: {},
      lessonReview: {}
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const base = defaultState();
      return {
        ...base,
        ...parsed,
        settings: {...base.settings, ...(parsed.settings || {})},
        grammarProgress: parsed.grammarProgress || {},
        lessonScores: parsed.lessonScores || {},
        lessonNotes: parsed.lessonNotes || {},
        lessonReview: parsed.lessonReview || {}
      };
    } catch {
      return defaultState();
    }
  }

  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function yesterdayKey() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return todayKey(date);
  }

  function hashText(text) {
    let hash = 0;
    for (const ch of text) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
    return Math.abs(hash);
  }

  function renderAll() {
    renderToday();
    renderCourses();
    renderFilters();
    renderLibrary();
    renderReview();
    if (activeLessonId) renderLesson();
  }

  function showScreen(name) {
    els.screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === name));
    els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
    $("content").scrollTo({top: 0, behavior: "smooth"});
  }

  function completedLessons() {
    return lessons.filter((lesson) => state.grammarProgress[lesson.id]?.completed).length;
  }

  function todayLesson() {
    return lessons.find((lesson) => !state.grammarProgress[lesson.id]?.completed) || lessons[0];
  }

  function isLessonUnlocked(lesson) {
    const index = lessons.findIndex((item) => item.id === lesson.id);
    if (index <= 0) return true;
    return Boolean(state.grammarProgress[lessons[index - 1].id]?.completed);
  }

  function renderToday() {
    const lesson = todayLesson();
    const done = new Set(state.daily[todayKey()] || []);
    els.todayLessonTitle.textContent = `${lesson.title}：${lesson.core}`;
    els.todayLessonLead.textContent = `${lesson.teacher} 今天学完后，再顺手复习 5 个真实口语短语。`;
    els.streak.textContent = state.streak || 0;
    els.courseDone.textContent = `${completedLessons()}/${lessons.length}`;
    els.reviewCount.textContent = Object.keys(state.mistakes).length + Object.keys(state.lessonReview).length;
    const daily = getDailyPhrases();
    els.dailyList.innerHTML = daily.map((item) => phraseButton(item, done.has(item.id))).join("");
    els.dailyList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const start = daily.findIndex((item) => item.id === button.dataset.id);
        openPractice(daily, "今日短语", Math.max(0, start), true);
      });
    });
  }

  function renderCourses() {
    els.courseCount.textContent = lessons.length;
    els.courseList.innerHTML = lessons.map((lesson, index) => {
      const progress = state.grammarProgress[lesson.id];
      const score = state.lessonScores[lesson.id]?.best;
      const locked = !isLessonUnlocked(lesson);
      const label = progress?.completed ? "已通过" : locked ? "未解锁" : "继续学习";
      return `<button class="lesson-card ${locked ? "is-locked" : ""}" data-lesson="${lesson.id}" type="button" ${locked ? "disabled" : ""}>
        <span class="lesson-number">${String(index + 1).padStart(2, "0")}</span>
        <span><strong>${escapeHtml(lesson.title)}</strong><em>${escapeHtml(lesson.tag)} · ${lesson.minutes} 分钟课</em></span>
        <span class="badge">${score ? `${score}%` : label}</span>
      </button>`;
    }).join("");
  }

  function handleCourseClick(event) {
    const button = event.target.closest("[data-lesson]");
    if (!button) return;
    const lesson = lessonById.get(button.dataset.lesson);
    if (lesson && isLessonUnlocked(lesson)) openLesson(lesson.id);
  }

  function openLesson(id) {
    activeLessonId = id;
    renderLesson();
    showScreen("lesson");
  }

  function renderLesson() {
    const lesson = lessonById.get(activeLessonId) || todayLesson();
    if (!lesson) return;
    const score = state.lessonScores[lesson.id]?.best || 0;
    const progress = state.grammarProgress[lesson.id];
    const note = state.lessonNotes[lesson.id] || "";
    els.lessonView.innerHTML = `<article class="lesson-detail">
      <button class="text-button lesson-action" data-action="courses" type="button">返回课程</button>
      <div class="hero-panel lesson-hero">
        <p class="eyebrow">${lesson.kind === "tense" ? "Tense Lesson" : "Speaking Structure"}</p>
        <h2>${escapeHtml(lesson.title)}</h2>
        <p class="lead">${escapeHtml(lesson.teacher)}</p>
        <div class="stats-grid">
          <div><span>${lesson.examples.length}</span><small>核心例句</small></div>
          <div><span>${lesson.quiz.length}</span><small>小测题</small></div>
          <div><span>${score || 0}%</span><small>最高分</small></div>
        </div>
      </div>
      ${lessonBlock("这一课先记住", `<p>${escapeHtml(lesson.core)}</p>`)}
      ${lessonBlock("什么时候用", `<ul>${lesson.uses.map((use) => `<li>${escapeHtml(use)}</li>`).join("")}</ul>`)}
      ${lessonBlock("句型公式", formulaHtml(lesson.formula))}
      ${lessonBlock("中文思维提醒", `<p>${escapeHtml(lesson.chinese)}</p><p class="mini-note">常见时间词：${escapeHtml(lesson.markers)}</p>`)}
      ${lessonBlock("核心口语例句", examplesHtml(lesson))}
      ${lessonBlock("容易混淆", `<p>${escapeHtml(lesson.contrast)}</p>`)}
      ${lessonBlock("常见错误", mistakesHtml(lesson))}
      ${lessonBlock("开口造句任务", `<ol>${lesson.speaking.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ol><textarea class="lesson-note" id="lessonNote" placeholder="写下你自己的 2-3 句。">${escapeHtml(note)}</textarea><button class="secondary lesson-action" data-action="save-note" type="button">保存造句</button>`)}
      ${lessonBlock("小测", quizHtml(lesson))}
      <div class="decision-row">
        <button class="secondary lesson-action" data-action="review" type="button">${state.lessonReview[lesson.id] ? "已加入课程复习" : "加入课程复习"}</button>
        <button class="primary lesson-action" data-action="complete" type="button">${progress?.completed ? "本课已完成" : "本课我学会了"}</button>
      </div>
    </article>`;
  }

  function lessonBlock(title, body) {
    return `<section class="lesson-block"><h3>${title}</h3>${body}</section>`;
  }

  function formulaHtml(formula) {
    return Object.entries(formula).map(([key, value]) => `<div class="formula-row"><span>${formulaLabel(key)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");
  }

  function formulaLabel(key) {
    return {positive:"肯定句", negative:"否定句", question:"一般疑问句", wh:"特殊疑问句"}[key] || key;
  }

  function examplesHtml(lesson) {
    return `<div class="lesson-examples">${lesson.examples.map((item, index) => `<button class="example-card lesson-action" data-action="speak-example" data-text="${escapeAttr(item.en)}" type="button">
      <span>${index + 1}</span><strong>${escapeHtml(item.en)}</strong><em>${escapeHtml(item.zh)}</em><small>${escapeHtml(item.scene)} · 替换：${escapeHtml(item.swap)}</small>
    </button>`).join("")}</div>`;
  }

  function mistakesHtml(lesson) {
    return `<div class="mistake-list">${lesson.mistakes.map((item) => `<div class="mistake-card"><del>${escapeHtml(item.wrong)}</del><strong>${escapeHtml(item.correct)}</strong><p>${escapeHtml(item.why)}</p></div>`).join("")}</div>`;
  }

  function quizHtml(lesson) {
    return `<div class="quiz-list">${lesson.quiz.map((item, index) => `<div class="quiz-card" data-quiz="${index}">
      <p class="eyebrow">${item.type}</p><h4>${escapeHtml(item.prompt)}</h4>${quizInput(item, index)}
      <p class="quiz-feedback" id="quizFeedback${index}">${escapeHtml(item.note)}</p>
    </div>`).join("")}</div>
    <button class="primary action-wide lesson-action" data-action="submit-quiz" type="button">提交小测</button>
    <p class="mini-note" id="quizScoreLine">80% 通过；你可以反复做，不会惩罚。</p>`;
  }

  function quizInput(item, index) {
    if (item.choices.length) {
      return `<div class="quiz-options">${item.choices.map((choice) => `<label><input name="quiz${index}" type="radio" value="${escapeAttr(choice)}"><span>${escapeHtml(choice)}</span></label>`).join("")}</div>`;
    }
    return `<input class="quiz-text" data-quiz-input="${index}" type="text" placeholder="输入你的答案">`;
  }

  function handleLessonClick(event) {
    const button = event.target.closest(".lesson-action");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "courses") return showScreen("courses");
    if (action === "speak-example") return speakText(button.dataset.text, 1);
    if (action === "save-note") return saveLessonNote();
    if (action === "submit-quiz") return submitQuiz();
    if (action === "review") return toggleLessonReview();
    if (action === "complete") return completeLesson(activeLessonId, state.lessonScores[activeLessonId]?.best || 100);
  }

  function saveLessonNote() {
    state.lessonNotes[activeLessonId] = $("lessonNote")?.value || "";
    save();
    flash("造句已保存。");
  }

  function submitQuiz() {
    const lesson = lessonById.get(activeLessonId);
    if (!lesson) return;
    let correct = 0;
    lesson.quiz.forEach((item, index) => {
      const selected = document.querySelector(`input[name="quiz${index}"]:checked`);
      const input = document.querySelector(`[data-quiz-input="${index}"]`);
      const value = selected?.value || input?.value || "";
      const ok = answerOk(value, item.answer);
      correct += ok ? 1 : 0;
      const feedback = $(`quizFeedback${index}`);
      if (feedback) {
        feedback.textContent = ok ? `对。${item.note}` : `参考答案：${item.answer}。${item.note}`;
        feedback.classList.toggle("is-right", ok);
        feedback.classList.toggle("is-wrong", !ok);
      }
    });
    const score = Math.round(correct / lesson.quiz.length * 100);
    const entry = state.lessonScores[lesson.id] || {best: 0, history: []};
    entry.best = Math.max(entry.best || 0, score);
    entry.lastScore = score;
    entry.history = [...(entry.history || []), {score, at: new Date().toISOString()}].slice(-10);
    state.lessonScores[lesson.id] = entry;
    if (score >= 80) completeLesson(lesson.id, score, false);
    save();
    renderToday();
    renderCourses();
    $("quizScoreLine").textContent = score >= 80 ? `本次 ${score}%，已通过。下一课已解锁。` : `本次 ${score}%，再看一遍例句和错句后重做。`;
  }

  function answerOk(value, answer) {
    const user = normalize(value);
    const expected = normalize(answer);
    if (!user) return false;
    return user === expected || expected.includes(user) || user.includes(expected);
  }

  function completeLesson(id, score = 100, rerender = true) {
    state.grammarProgress[id] = {completed: true, completedAt: new Date().toISOString()};
    delete state.lessonReview[id];
    bumpStreak();
    const entry = state.lessonScores[id] || {best: 0, history: []};
    entry.best = Math.max(entry.best || 0, score);
    state.lessonScores[id] = entry;
    save();
    if (rerender) renderAll();
    flash("本课已完成，下一课已解锁。");
  }

  function toggleLessonReview() {
    if (state.lessonReview[activeLessonId]) delete state.lessonReview[activeLessonId];
    else state.lessonReview[activeLessonId] = {addedAt: new Date().toISOString()};
    save();
    renderAll();
  }

  function startLessonReview() {
    const id = Object.keys(state.lessonReview)[0] || todayLesson().id;
    openLesson(id);
  }

  function bumpStreak() {
    const day = todayKey();
    if (state.lastStudyDate === day) return;
    state.streak = state.lastStudyDate === yesterdayKey() ? (state.streak || 0) + 1 : 1;
    state.lastStudyDate = day;
    if (!state.completedDates.includes(day)) state.completedDates.push(day);
  }

  function getDailyPhrases() {
    const day = todayKey();
    const saved = (state.dailyPlan?.[day] || []).map((id) => byId.get(id)).filter(Boolean);
    if (saved.length >= PHRASES_PER_DAY) return saved.slice(0, PHRASES_PER_DAY);
    const reviewIds = Object.entries(state.mistakes).sort((a, b) => (b[1].count || 0) - (a[1].count || 0)).map(([id]) => id);
    const picked = reviewIds.slice(0, 2).map((id) => byId.get(id)).filter(Boolean);
    const start = (hashText(day) + (state.dailyShift || 0) * 11) % phrases.length;
    for (let step = 0; picked.length < PHRASES_PER_DAY && step < phrases.length * 2; step += 1) {
      const item = phrases[(start + step * 5) % phrases.length];
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
    state.dailyPlan[day] = picked.map((item) => item.id);
    return picked;
  }

  function phraseButton(item, done = false) {
    return `<button class="phrase-item" data-id="${item.id}" type="button">
      <span class="phrase-meta"><span class="badge">${done ? "已练" : escapeHtml(item.group)}</span><span>${escapeHtml(item.scene)}</span></span>
      <strong>${escapeHtml(item.en)}</strong>
      <p>${escapeHtml(item.zh)} · ${escapeHtml(item.tip)}</p>
    </button>`;
  }

  function renderFilters() {
    const options = ["全部", ...groups];
    els.groupFilters.innerHTML = options.map((group) => `<button class="chip ${group === activeGroup ? "is-active" : ""}" data-group="${group}" type="button">${escapeHtml(group)}</button>`).join("");
    els.groupFilters.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => { activeGroup = button.dataset.group; renderFilters(); renderLibrary(); });
    });
  }

  function renderLibrary() {
    const query = normalize(els.search.value || "");
    const filtered = phrases.filter((item) => {
      const groupOk = activeGroup === "全部" || item.group === activeGroup;
      const haystack = normalize(`${item.en} ${item.zh} ${item.scene} ${item.tip}`);
      return groupOk && (!query || haystack.includes(query));
    });
    els.libraryCount.textContent = filtered.length;
    els.libraryList.innerHTML = filtered.length ? filtered.map((item) => phraseButton(item, false)).join("") : `<div class="empty-state">没有找到这个表达，换个关键词试试。</div>`;
    els.libraryList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const item = byId.get(button.dataset.id);
        if (item) openPractice([item], "短语库", 0, true);
      });
    });
  }

  function renderReview() {
    const review = Object.keys(state.mistakes).map((id) => byId.get(id)).filter(Boolean);
    const favs = Object.keys(state.favorites).map((id) => byId.get(id)).filter(Boolean);
    const list = [...review, ...favs.filter((item) => !review.some((r) => r.id === item.id))];
    els.reviewList.innerHTML = list.length ? list.map((item) => phraseButton(item, false)).join("") : `<div class="empty-state">还没有短语复习项。课程复习请点上方按钮。</div>`;
    els.reviewList.querySelectorAll("button").forEach((button) => {
      const item = byId.get(button.dataset.id);
      button.addEventListener("click", () => item && openPractice([item], "短语复习", 0, true));
    });
  }

  function openPractice(items, name, start, navigate) {
    phraseQueue = items.length ? items : getDailyPhrases();
    phraseQueueName = name;
    phraseIndex = Math.min(start, phraseQueue.length - 1);
    resetResult();
    renderPractice();
    if (navigate) showScreen("practice");
  }

  function currentPhrase() { return phraseQueue[phraseIndex]; }

  function renderPractice() {
    const item = currentPhrase() || getDailyPhrases()[0];
    if (!item) return;
    els.practiceGroup.textContent = item.group;
    els.progress.textContent = `${phraseQueueName} · ${phraseIndex + 1}/${phraseQueue.length}`;
    els.phraseText.textContent = item.en;
    els.phraseMeaning.textContent = item.zh;
    els.phraseTip.textContent = `${item.tip} 用法：${item.scene}`;
    els.phraseExample.textContent = item.example;
    els.favorite.textContent = state.favorites[item.id] ? "★" : "☆";
  }

  function resetResult() {
    els.score.textContent = "还没有结果";
    els.transcript.textContent = "听一遍，自己大声说一遍；能自然说出来就点“我会说了”。";
  }

  function finishPhrase(ok) {
    const item = currentPhrase();
    if (!item) return;
    const attempt = state.attempts[item.id] || {tries: 0, best: 0};
    attempt.tries += 1;
    attempt.best = Math.max(attempt.best || 0, ok ? 100 : 35);
    attempt.lastScore = ok ? 100 : 35;
    attempt.lastAt = new Date().toISOString();
    state.attempts[item.id] = attempt;
    if (ok) delete state.mistakes[item.id];
    else state.mistakes[item.id] = {count: (state.mistakes[item.id]?.count || 0) + 1, lastScore: 35, lastAt: attempt.lastAt};
    markDailyDone(item.id);
    save();
    renderAll();
    setResult(ok ? "已掌握" : "已加入复习", ok ? "很好，换一句继续把口腔肌肉练顺。" : "别急，这句会在复习里优先出现。");
    if (ok) nextPhrase();
  }

  function markDailyDone(id) {
    const day = todayKey();
    const done = new Set(state.daily[day] || []);
    done.add(id);
    state.daily[day] = [...done];
  }

  function nextPhrase() {
    if (phraseIndex < phraseQueue.length - 1) {
      phraseIndex += 1;
      resetResult();
      renderPractice();
      return;
    }
    setResult("这一组完成", "短语练习完成。主线课程才是今天的重点。");
  }

  function setResult(title, body) {
    els.score.textContent = title;
    els.transcript.textContent = body;
  }

  function toggleFavorite() {
    const item = currentPhrase();
    if (!item) return;
    if (state.favorites[item.id]) delete state.favorites[item.id];
    else state.favorites[item.id] = {addedAt: new Date().toISOString()};
    save();
    renderAll();
    renderPractice();
  }

  function startPhraseReview() {
    const items = Object.keys(state.mistakes).map((id) => byId.get(id)).filter(Boolean);
    openPractice(items.length ? items : getDailyPhrases(), items.length ? "短语复习" : "今日短语", 0, true);
  }

  function speakText(text, rate = 1) {
    if (!text || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voices = speechSynthesis.getVoices();
    utterance.voice = voices.find((voice) => /en-US/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang)) || null;
    speechSynthesis.speak(utterance);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `speakdaily-backup-${todayKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (parsed.version !== 1 || typeof parsed !== "object" || !parsed.attempts) throw new Error("bad backup");
        Object.assign(state, defaultState(), parsed);
        save();
        renderAll();
        flash("备份里的学习记录已经恢复。");
      } catch {
        alert("备份文件格式不对，当前进度没有被覆盖。");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetProgress() {
    if (!confirm("确定重置 Speak Daily 的本机学习记录吗？")) return;
    Object.assign(state, defaultState());
    save();
    phraseQueue = getDailyPhrases();
    activeLessonId = todayLesson().id;
    renderAll();
    openPractice(phraseQueue, "今日短语", 0, false);
  }

  function flash(message) {
    const line = $("quizScoreLine");
    if (line) {
      line.textContent = message;
      return;
    }
    const old = els.transcript.textContent;
    els.transcript.textContent = message;
    setTimeout(() => { if (els.transcript.textContent === message) els.transcript.textContent = old; }, 1800);
  }

  function normalize(text) {
    return String(text).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({'&': "&amp;", '<': "&lt;", '>': "&gt;", '"': "&quot;", "'": "&#39;"}[char]));
  }

  function escapeAttr(text) { return escapeHtml(text).replace(/`/g, "&#96;"); }
})();
