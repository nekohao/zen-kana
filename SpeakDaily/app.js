(() => {
  const STORAGE_KEY = "speakdaily.v1";
  const phrases = window.SPEAK_DAILY_PHRASES;
  const groups = window.SPEAK_DAILY_GROUPS;
  const byId = new Map(phrases.map((item) => [item.id, item]));
  const $ = (id) => document.getElementById(id);
  const state = loadState();
  let queue = getDailyPhrases();
  let queueName = "今日练习";
  let index = 0;
  let activeGroup = "全部";
  let recorder = null;
  let recordTimer = null;
  let recordStream = null;

  const els = {
    screens: [...document.querySelectorAll(".screen")],
    tabs: [...document.querySelectorAll(".tab")],
    streak: $("streakCount"), done: $("todayDone"), reviewCount: $("reviewCount"),
    dailyList: $("dailyList"), groupFilters: $("groupFilters"), libraryList: $("libraryList"),
    libraryCount: $("libraryCount"), reviewList: $("reviewList"), search: $("searchInput"),
    phraseText: $("phraseText"), phraseMeaning: $("phraseMeaning"), phraseTip: $("phraseTip"),
    phraseExample: $("phraseExample"), practiceGroup: $("practiceGroup"), progress: $("practiceProgress"),
    score: $("scoreText"), transcript: $("transcriptText"), playback: $("playback"), favorite: $("favoriteBtn"),
    speakBtn: $("speakBtn"), recordBtn: $("recordBtn")
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    bindEvents();
    renderAll();
    openPractice(queue, "今日练习", 0, false);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  }

  function bindEvents() {
    els.tabs.forEach((tab) => tab.addEventListener("click", () => showScreen(tab.dataset.tab)));
    $("startDailyBtn").addEventListener("click", () => openPractice(getDailyPhrases(), "今日练习", 0, true));
    $("shuffleDailyBtn").addEventListener("click", () => {
      state.dailyShift = (state.dailyShift || 0) + 1;
      delete state.dailyPlan[todayKey()];
      delete state.daily[todayKey()];
      save();
      renderToday();
    });
    $("playBtn").addEventListener("click", () => speakCurrent(1));
    $("slowBtn").addEventListener("click", () => speakCurrent(0.72));
    $("speakBtn").addEventListener("click", startSpeech);
    $("recordBtn").addEventListener("click", startRecording);
    $("goodBtn").addEventListener("click", () => gradeCurrent(100, "手动确认读对了。", true));
    $("missBtn").addEventListener("click", () => gradeCurrent(35, "已加入错句，明天优先复习。", true));
    $("favoriteBtn").addEventListener("click", toggleFavorite);
    $("startReviewBtn").addEventListener("click", startReview);
    $("exportBtn").addEventListener("click", exportBackup);
    $("importBtn").addEventListener("click", () => $("restoreFile").click());
    $("restoreFile").addEventListener("change", importBackup);
    $("resetBtn").addEventListener("click", resetProgress);
    $("installHintBtn").addEventListener("click", () => { showScreen("review"); $("installNote").scrollIntoView({behavior:"smooth", block:"center"}); });
    els.search.addEventListener("input", renderLibrary);
  }

  function defaultState() {
    return {version:1, lastStudyDate:"", streak:0, completedDates:[], daily:{}, dailyPlan:{}, attempts:{}, mistakes:{}, favorites:{}, settings:{rate:1}, dailyShift:0};
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return {...defaultState(), ...parsed, settings:{rate:1, ...(parsed.settings || {})}};
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

  function getDailyPhrases() {
    const day = todayKey();
    const saved = (state.dailyPlan && state.dailyPlan[day] || []).map((id) => byId.get(id)).filter(Boolean);
    if (saved.length === 7) return saved;
    const reviewIds = Object.entries(state.mistakes).sort((a, b) => (b[1].count || 0) - (a[1].count || 0)).map(([id]) => id);
    const picked = reviewIds.slice(0, 2).map((id) => byId.get(id)).filter(Boolean);
    const start = (hashText(day) + (state.dailyShift || 0) * 11) % phrases.length;
    for (let step = 0; picked.length < 7 && step < phrases.length * 2; step += 1) {
      const item = phrases[(start + step * 5) % phrases.length];
      if (!picked.some((p) => p.id === item.id)) picked.push(item);
    }
    state.dailyPlan[day] = picked.map((item) => item.id);
    return picked;
  }

  function showScreen(name) {
    els.screens.forEach((screen) => screen.classList.toggle("is-active", screen.dataset.screen === name));
    els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.tab === name));
  }

  function renderAll() {
    renderToday();
    renderFilters();
    renderLibrary();
    renderReview();
  }

  function renderToday() {
    const daily = getDailyPhrases();
    const done = new Set(state.daily[todayKey()] || []);
    els.streak.textContent = state.streak || 0;
    els.done.textContent = `${daily.filter((item) => done.has(item.id)).length}/${daily.length}`;
    els.reviewCount.textContent = Object.keys(state.mistakes).length;
    els.dailyList.innerHTML = daily.map((item) => phraseButton(item, done.has(item.id))).join("");
    els.dailyList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const start = daily.findIndex((item) => item.id === id);
        openPractice(daily, "今日练习", Math.max(0, start), true);
      });
    });
  }

  function phraseButton(item, done = false) {
    const status = done ? "已练" : item.group;
    return `<button class="phrase-item" data-id="${item.id}" type="button">
      <span class="phrase-meta"><span class="badge">${status}</span><span>${escapeHtml(item.scene)}</span></span>
      <strong>${escapeHtml(item.en)}</strong>
      <p>${escapeHtml(item.zh)} · ${escapeHtml(item.tip)}</p>
    </button>`;
  }

  function renderFilters() {
    const options = ["全部", ...groups];
    els.groupFilters.innerHTML = options.map((group) => `<button class="chip ${group === activeGroup ? "is-active" : ""}" data-group="${group}" type="button">${group}</button>`).join("");
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
    els.reviewList.innerHTML = list.length ? list.map((item) => phraseButton(item, false)).join("") : `<div class="empty-state">还没有错句。今天练完后，不顺口的表达会自动出现在这里。</div>`;
    els.reviewList.querySelectorAll("button").forEach((button) => {
      const item = byId.get(button.dataset.id);
      button.addEventListener("click", () => item && openPractice([item], "复习", 0, true));
    });
  }

  function openPractice(items, name, start, navigate) {
    queue = items.length ? items : getDailyPhrases();
    queueName = name;
    index = Math.min(start, queue.length - 1);
    resetResult();
    renderPractice();
    if (navigate) showScreen("practice");
  }

  function renderPractice() {
    const item = queue[index] || getDailyPhrases()[0];
    if (!item) return;
    els.practiceGroup.textContent = item.group;
    els.progress.textContent = `${queueName} · ${index + 1}/${queue.length}`;
    els.phraseText.textContent = item.en;
    els.phraseMeaning.textContent = item.zh;
    els.phraseTip.textContent = `${item.tip} 用法：${item.scene}`;
    els.phraseExample.textContent = item.example;
    els.favorite.textContent = state.favorites[item.id] ? "★" : "☆";
    els.favorite.setAttribute("aria-pressed", state.favorites[item.id] ? "true" : "false");
    els.speakBtn.textContent = speechRecognitionAvailable() ? "跟读识别" : "录音跟读";
  }

  function resetResult() {
    els.score.textContent = "还没有结果";
    els.transcript.textContent = "先听标准发音，再跟读。识别只是辅助，最终以你听回放的自然度为准。";
    els.playback.hidden = true;
    els.playback.removeAttribute("src");
  }

  function currentPhrase() { return queue[index]; }

  function speakCurrent(rate) {
    const item = currentPhrase();
    if (!item || !("speechSynthesis" in window)) return setResult("设备不支持发音播放", "可以先自己读，再用录音回放。");
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(item.en);
    const voices = speechSynthesis.getVoices();
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.voice = voices.find((voice) => /en-US/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang)) || null;
    speechSynthesis.speak(utterance);
  }

  function speechRecognitionAvailable() { return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition); }

  function startSpeech() {
    if (!speechRecognitionAvailable()) return startRecording();
    const item = currentPhrase();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    els.score.textContent = "正在听你说";
    els.transcript.textContent = "说完后稍等一秒，我会用识别文本做关键词匹配。";
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript || "";
      const score = scorePhrase(item, transcript);
      gradeCurrent(score, `识别到：${transcript}`, false);
    };
    recognition.onerror = () => {
      setResult("识别暂时不可用", "已切换到录音回放模式。");
      startRecording();
    };
    recognition.onnomatch = () => gradeCurrent(20, "没有识别到清晰短语，可以慢一点再来。", false);
    try { recognition.start(); } catch { startRecording(); }
  }

  async function startRecording() {
    if (!navigator.mediaDevices || !window.MediaRecorder) return setResult("无法录音", "这个浏览器没有开放录音接口，可以先用手动自评。");
    if (recorder && recorder.state === "recording") return stopRecording();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const chunks = [];
      recordStream = stream;
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {type: recorder.mimeType || "audio/webm"});
        els.playback.src = URL.createObjectURL(blob);
        els.playback.hidden = false;
        els.recordBtn.textContent = "录音回放";
        recordStream.getTracks().forEach((track) => track.stop());
        setResult("录音完成", "听一下自己的节奏，再点“我读对了”或“加入错句”。");
      };
      recorder.start();
      els.recordBtn.textContent = "停止录音";
      setResult("正在录音", "最多录 5 秒，说完也可以点按钮停止。");
      recordTimer = setTimeout(stopRecording, 5000);
    } catch {
      setResult("麦克风没有打开", "请允许麦克风权限，或先用手动自评。");
    }
  }

  function stopRecording() {
    clearTimeout(recordTimer);
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  function scorePhrase(item, transcript) {
    const heard = normalize(transcript);
    const expectedWords = tokenize(item.en);
    const heardWords = new Set(tokenize(transcript));
    const keywordHits = item.keys.filter((key) => heard.includes(normalize(key))).length / item.keys.length;
    const wordHits = expectedWords.filter((word) => heardWords.has(word)).length / Math.max(1, expectedWords.length);
    return Math.round((keywordHits * 0.68 + wordHits * 0.32) * 100);
  }

  function gradeCurrent(score, detail, advance) {
    const item = currentPhrase();
    if (!item) return;
    const attempt = state.attempts[item.id] || {tries:0, best:0};
    attempt.tries += 1;
    attempt.best = Math.max(attempt.best || 0, score);
    attempt.lastScore = score;
    attempt.lastAt = new Date().toISOString();
    state.attempts[item.id] = attempt;
    if (score >= 80) delete state.mistakes[item.id];
    if (score < 70) state.mistakes[item.id] = {count:(state.mistakes[item.id]?.count || 0) + 1, lastScore:score, lastAt:attempt.lastAt};
    if (score >= 70 || advance) markDailyDone(item.id);
    save();
    renderAll();
    setResult(`${score}%`, detail);
    if (advance) nextPhrase();
  }

  function markDailyDone(id) {
    const day = todayKey();
    const done = new Set(state.daily[day] || []);
    done.add(id);
    state.daily[day] = [...done];
    const dailyIds = getDailyPhrases().map((item) => item.id);
    const completed = dailyIds.every((dailyId) => done.has(dailyId));
    if (completed && state.lastStudyDate !== day) {
      state.streak = state.lastStudyDate === yesterdayKey() ? (state.streak || 0) + 1 : 1;
      state.lastStudyDate = day;
      if (!state.completedDates.includes(day)) state.completedDates.push(day);
    }
  }

  function nextPhrase() {
    if (index < queue.length - 1) {
      index += 1;
      resetResult();
      renderPractice();
      return;
    }
    setResult("这一组完成", "今天的短语又顺了一点。可以去复习里看错句。");
  }

  function setResult(title, body) {
    els.score.textContent = title;
    els.transcript.textContent = body;
  }

  function toggleFavorite() {
    const item = currentPhrase();
    if (!item) return;
    if (state.favorites[item.id]) delete state.favorites[item.id];
    else state.favorites[item.id] = {addedAt:new Date().toISOString()};
    save();
    renderAll();
    renderPractice();
  }

  function startReview() {
    const ids = Object.keys(state.mistakes);
    const items = ids.map((id) => byId.get(id)).filter(Boolean);
    openPractice(items.length ? items : getDailyPhrases(), items.length ? "错句复习" : "今日练习", 0, true);
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
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
        setResult("恢复完成", "备份里的学习记录已经恢复。");
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
    renderAll();
    openPractice(getDailyPhrases(), "今日练习", 0, false);
  }

  function normalize(text) {
    return String(text).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function tokenize(text) { return normalize(text).split(" ").filter(Boolean); }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({'&':"&amp;", '<':"&lt;", '>':"&gt;", '"':"&quot;", "'":"&#39;"}[char]));
  }
})();
