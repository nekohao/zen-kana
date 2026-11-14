/* New module only: RPCs expose differences; absolute weights never enter public UI. */
(() => {
  "use strict";
  window.PointsFatLoss = { attach };

  const zone = "Asia/Shanghai";
  const dayKey = new Intl.DateTimeFormat("sv-SE", {timeZone:zone, year:"numeric", month:"2-digit", day:"2-digit"});
  const dayLabel = new Intl.DateTimeFormat("zh-CN", {timeZone:zone, year:"numeric", month:"long", day:"numeric"});
  const clockLabel = new Intl.DateTimeFormat("zh-CN", {timeZone:zone, hour:"2-digit", minute:"2-digit", hourCycle:"h23"});
  const shiftDay = (day, count) => {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate()+count);
    return date.toISOString().slice(0,10);
  };
  const weekLabel = date => date.slice(5).split("-").map(Number).join("/");

  function attach({ db, state, els, ui }) {
    const unitPicker = () => '<div class="segmented fat-unit-switch" role="group" aria-label="体重单位"><button class="segment pressable" data-fat-unit="kg" type="button" aria-pressed="true">公斤</button><button class="segment pressable" data-fat-unit="jin" type="button" aria-pressed="false">斤</button></div>';
    const icon = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8 10a4 4 0 0 1 8 0M12 10l2-2"/></svg>';
    els.metricSwitch.insertAdjacentHTML("beforeend", `<button class="metric-option" data-metric="fat" role="tab" aria-selected="false" type="button">${icon}<span>减脂</span></button>`);
    els.home.querySelector(".hero").insertAdjacentHTML("beforeend", `
      <div class="fat-home-content" hidden>
        <div class="eyebrow reward-message" aria-live="polite">
          <span class="reward-line-secondary" id="fatHomeMeta">正在同步减脂记录</span>
        </div>
        <div class="score-lens-wrap pressable" id="fatRefreshBtn" role="button" tabindex="0" aria-label="刷新减脂数据">
          <div class="score-lens fat-lens"><div class="fat-value-stack" aria-live="polite">
            <span class="fat-value-label" id="fatValueLabel">体重变化</span>
            <strong class="fat-value" id="fatValue">—</strong><span class="fat-value-unit" id="fatValueUnit">公斤</span>
            <div class="fat-home-comparison" id="fatHomeComparison" hidden>
              <span id="fatHomeCompareValue"></span><small id="fatHomeCompareNote" hidden></small>
            </div>
          </div></div>
        </div>
        <div class="fat-home-actions"><button class="fat-record-button pressable" id="fatRecordBtn" hidden type="button">记录体重</button></div>
      </div>`);
    els.overviewShell.insertAdjacentHTML("beforeend", `
      <div class="fat-overview" id="fatOverviewContent" hidden>
        <div class="fat-overview-switch" role="group" aria-label="减脂总览内容">
          <button data-fat-section="trend" type="button" aria-controls="fatTrendSection">趋势</button>
          <button data-fat-section="records" type="button" aria-controls="fatRecordsSection">记录</button>
        </div>
        <div class="fat-overview-scroll">
          <section id="fatTrendSection" aria-labelledby="fatTrendTitle">
            <div class="fat-trend-card">
              <h2 id="fatTrendTitle">近 4 周最低体重</h2>
              <p class="fat-overview-status" id="fatOverviewStatus" role="status"></p>
              <button class="fat-record-more" id="fatProgressRetry" type="button" hidden>重试</button>
              <div id="fatChart" hidden>
                <div class="fat-week-detail" aria-live="polite">
                  <span id="fatChartReference"></span>
                  <strong id="fatWeekValue"></strong>
                  <span id="fatWeekChange"></span>
                  <span id="fatWeekDates"></span>
                </div>
                <div class="fat-chart-wrap">
                  <canvas id="fatTrendCanvas" aria-hidden="true"></canvas>
                  <div class="fat-point-notes" id="fatPointNotes" aria-hidden="true"></div>
                  <div class="fat-week-labels" role="group" aria-label="选择一周">${[0,1,2,3].map(index => `<button type="button" class="fat-week-button" data-fat-week="${index}" aria-pressed="false"></button>`).join("")}</div>
                </div>
              </div>
            </div>
          </section>
          <section id="fatRecordsSection" aria-label="每日体重记录" hidden>
            <p class="fat-overview-status" id="fatRecordsStatus" role="status"></p>
            <button class="fat-record-more" id="fatRecordsRetry" type="button" hidden>重试</button>
            <div id="fatRecords"></div>
            <button class="fat-record-more pressable" id="fatRecordsMore" type="button" hidden>查看更多记录</button>
          </section>
        </div>
      </div>`);
    const settings = document.createElement("div");
    settings.hidden = true;
    settings.id = "fatAdminSettings";
    settings.innerHTML = `<div class="settings-label">减脂管理</div><div class="settings-group"><button class="settings-row pressable" id="fatStartingWeightBtn" type="button"><span>起始体重</span><span class="settings-value"><span id="fatStartingWeightValue">点击查看</span><span class="chevron">›</span></span></button></div>`;
    const accountLabel = [...els.adminSettings.querySelectorAll(".settings-label")].find(el => el.textContent.trim() === "账户");
    els.adminSettings.insertBefore(settings, accountLabel || null);
    const unitSettings = document.createElement("div");
    unitSettings.id = "fatUnitSettings";
    unitSettings.innerHTML = `<div class="settings-label">减脂设置</div><div class="settings-group"><div class="settings-row static"><span>体重单位</span>${unitPicker()}</div></div>`;
    els.guestAccountLabel.parentElement.insertBefore(unitSettings,els.guestAccountLabel);
    document.querySelector("main.app").insertAdjacentHTML("beforeend", `
      <div class="modal-layer alert-layer" id="fatWeightLayer" aria-hidden="true">
        <div class="alert" role="dialog" aria-modal="true" aria-labelledby="fatWeightTitle">
          <div class="alert-content"><div class="change-icon" aria-hidden="true">🌿</div><div class="alert-title" id="fatWeightTitle">记录体重</div><div class="alert-message" id="fatWeightMessage"></div>
            <div id="fatWeightFields"><label class="fat-field-label" id="fatWeightLabel" for="fatWeightInput">本次体重</label><div class="fat-input-wrap"><input id="fatWeightInput" inputmode="decimal" type="text" maxlength="8" autocomplete="off" placeholder="输入体重"/><span id="fatInputUnit">公斤</span></div></div>
            <div class="fat-form-error" id="fatWeightError" role="alert" hidden></div><div class="fat-form-note" id="fatWeightNote"></div>
          </div><div class="alert-actions vertical"><button class="alert-button primary-action pressable" id="fatSaveWeight" type="button">保存记录</button><button class="alert-button pressable" id="fatCancelWeight" type="button">取消</button></div>
        </div>
      </div>`);
    const q = id => document.getElementById(id);
    const content = els.home.querySelector(".fat-home-content");
    els.overviewTitle.parentElement.insertAdjacentHTML("beforeend",'<button id="fatOverviewCloseBtn" class="fat-overview-close pressable" type="button" aria-label="关闭减脂总览" hidden>关闭</button>');
    q("fatOverviewCloseBtn").addEventListener("pointerdown",event=>event.stopPropagation());
    q("fatOverviewCloseBtn").addEventListener("click",event=>{event.stopPropagation();ui.closeOverviewSheet();els.overviewBtn.focus({preventScroll:true});});
    const overview = q("fatOverviewContent"), dialog = q("fatWeightLayer");
    const scroller = overview.querySelector(".fat-overview-scroll");
    const sectionButtons = [...overview.querySelectorAll("[data-fat-section]")];
    const weekButtons = [...overview.querySelectorAll("[data-fat-week]")];
    let snapshot = null, weeks = [], logs = [], readError = false, logsError = false;
    let previousLow = null, previousLowPending = false;
    let readVersion = 0, logsVersion = 0, authVersion = 0, secretVersion = 0;
    let verifiedAdmin = false, verifiedUser = null, mode = null, saving = false;
    let selectedWeek = null, recordLimit = 40, trend = null;
    const scrollBySection = {trend:0, records:0};
    let refreshPromise = null, logsPromise = null, authTimer = 0;
    let chartRaf = 0, initialized = false, overviewFresh = false;
    let unit = "kg", deleteTarget = null, startingLoaded = false, startingEditing = false;
    try { const savedUnit=window.localStorage.getItem("points_fat_unit"); if (["jin","kg"].includes(savedUnit)) unit=savedUnit; } catch (_) {}
    const unitName = () => unit === "kg" ? "公斤" : "斤";
    const displayWeight = value => Number(value) / (unit === "kg" ? 2 : 1);
    const number = value => new Intl.NumberFormat("zh-CN", { maximumFractionDigits:unit === "kg" ? 3 : 2 }).format(Math.abs(displayWeight(value)));
    const inputNumber = value => String(Number(displayWeight(value).toFixed(unit === "kg" ? 3 : 2)));
    const stamp = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("zh-CN", { timeZone:zone, month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(value)) : "时间待同步";
    const active = () => state.activeMetric === "fat";
    const row = data => Array.isArray(data) ? data[0] : data;
    const hasDelta = value => value !== null && value !== undefined && Number.isFinite(Number(value));
    function laterDraw() { cancelAnimationFrame(chartRaf); chartRaf = requestAnimationFrame(drawTrend); }
    function fitSettings() { if (els.settingsLayer.classList.contains("open")) window.dispatchEvent(new Event("resize")); }
    function syncUnits() {
      const loading = dialog.classList.contains("open") && q("fatWeightInput").disabled && mode !== "delete";
      document.querySelectorAll("[data-fat-unit]").forEach(button => {
        const selected = button.dataset.fatUnit === unit;
        button.classList.toggle("active",selected); button.setAttribute("aria-pressed",String(selected));
        button.disabled = saving || loading;
      });
      q("fatInputUnit").textContent = unitName();
      if (mode && mode !== "delete") q("fatWeightNote").textContent = mode === "starting" ? (startingEditing ? "更改起始体重后，已有记录的差值会重新计算。" : "选择修改后可编辑；取消不会改变已设置的体重。") : unit === "kg" ? "支持 0.005 公斤精度，首页和总览只显示变化量。" : "最多保留两位小数，首页和总览只显示变化量。";
    }
    function changeUnit(next) {
      if (!["jin","kg"].includes(next) || next === unit || saving) return;
      const editing = dialog.classList.contains("open") && mode !== "delete";
      if (editing && q("fatWeightInput").disabled) return;
      const raw = q("fatWeightInput").value.trim(), value = editing && raw ? inputWeight() : null;
      if (editing && raw && value === null) { q("fatWeightError").textContent = "请先输入有效体重，再切换单位"; q("fatWeightError").hidden = false; return; }
      unit = next;
      try { window.localStorage.setItem("points_fat_unit",unit); } catch (_) {}
      if (editing && value !== null) q("fatWeightInput").value = inputNumber(value);
      syncUnits(); renderHome(); renderOverview(); fitSettings();
    }
    function clearSecrets() {
      secretVersion++;
      startingLoaded = false; startingEditing = false;
      q("fatStartingWeightValue").textContent = "点击查看";
      q("fatWeightInput").value = "";
      q("fatWeightInput").readOnly = false;
      q("fatWeightInput").blur();
    }
    function closeDialog() {
      const returnToSettings = mode === "starting" && verifiedAdmin;
      if (mode === "starting") window.PointsRuntime?.clear("points_fat_admin_get_settings");
      ui.setLayer(dialog,false); mode = null; deleteTarget = null; clearSecrets(); syncUnits();
      q("fatWeightError").hidden = true;
      if (returnToSettings) {ui.setLayer(els.settingsLayer,true); q("fatStartingWeightBtn").focus({preventScroll:true});}
    }
    function permissionChanged() {
      settings.hidden = !verifiedAdmin;
      q("fatRecordBtn").hidden = !verifiedAdmin;
      if (!verifiedAdmin) { clearSecrets(); closeDialog(); }
      renderHome(); renderOverview(); fitSettings();
    }
    function scheduleAuth(session) {
      const version = ++authVersion;
      clearTimeout(authTimer);
      verifiedAdmin = false; verifiedUser = null;
      permissionChanged();
      if (!session?.user?.id) return;
      const userId = session.user.id;
      authTimer = setTimeout(async () => {
        try {
          const { data, error } = await db.rpc("points_is_admin");
          if (version !== authVersion || state.session?.user?.id !== userId) return;
          verifiedAdmin = !error && data === true; verifiedUser = verifiedAdmin ? userId : null;
          permissionChanged();
        } catch (_) { if (version === authVersion) { verifiedAdmin = false; permissionChanged(); } }
      }, 0);
    }
    db.auth.onAuthStateChange((_event, session) => scheduleAuth(session));
    function adminRendered() {
      if (!state.session || !state.isAdmin) {
        verifiedAdmin = false; verifiedUser = null; permissionChanged();
      } else if (!verifiedAdmin || verifiedUser !== state.session.user.id) scheduleAuth(state.session);
      else { renderHome(); fitSettings(); }
    }
    function errorText(error, action="保存") {
      if (window.PointsRuntime?.unknownWrite(error)) return window.PointsRuntime.uncertainMessage;
      const message = `${error?.code || ""} ${error?.message || ""}`;
      if (/42501|permission|admin|JWT/i.test(message)) return "管理员权限已失效，请重新登录";
      if (/Starting weight required/i.test(message)) return "请先在管理员设置中设置起始体重";
      if (/settings not found/i.test(message)) return "数据库缺少减脂设置，请检查初始配置";
      if (/PGRST202|Could not find|schema cache/i.test(message)) return "减脂接口暂不可用，请检查数据库部署";
      return `${action}失败，请检查网络后再试`;
    }
    async function refresh({silent=true}={}) {
      if (refreshPromise) return refreshPromise;
      const version = readVersion;
      refreshPromise = (async () => {
        try {
          const {data,error} = await db.rpc("points_fat_get_progress");
          if (error) throw error;
          if (version !== readVersion) return false;
          if (typeof data?.configured !== "boolean" || !Array.isArray(data.weeks) || data.weeks.length !== 4) throw new Error("Invalid progress");
          snapshot = {configured:data.configured, delta:hasDelta(data.delta_jin) ? Number(data.delta_jin) : null, recordedAt:data.recorded_at};
          weeks = data.weeks.map(week => ({start:week.start, end:week.end, days:Number(week.days), mean:hasDelta(week.mean) ? Number(week.mean) : null}));
          readError = false; initialized = true;
          const previous = weeks[2];
          previousLow = null;
          if (snapshot.delta !== null && previous.mean === null && previous.days > 0) {
            previousLowPending = true;
            renderHome();
            try {
              const {data:records,error:historyError} = await db.rpc("points_fat_get_logs", {
                p_from:previous.start+"T00:00:00+08:00",
                p_to:shiftDay(previous.end,1)+"T00:00:00+08:00",
                p_limit:10000
              });
              if (!historyError && Array.isArray(records) && version === readVersion) {
                previousLow = records.reduce((low,record) => {
                  if (!hasDelta(record.delta_jin)) return low;
                  return Math.min(low ?? Infinity,Number(record.delta_jin));
                },null);
              }
            } catch (_) {
              // A failed comparison read must not hide the current weight.
            } finally { previousLowPending = false; }
          }
          return version === readVersion;
        } catch (_) {
          if (version === readVersion) {
            readError = true; initialized = true;
            if (!silent && active()) ui.showToast("减脂数据同步失败，可点击重试");
          }
          return false;
        } finally { refreshPromise = null; renderHome(); renderOverview(); }
      })();
      return refreshPromise;
    }
    async function loadLogs(force=false) {
      if (!force && overviewFresh) { renderOverview(); return true; }
      if (logsPromise) return logsPromise;
      const version = logsVersion;
      logsPromise = (async () => {
        try {
          const {data,error} = await db.rpc("points_fat_get_logs", {p_from:null, p_to:null, p_limit:10000});
          if (error) throw error;
          if (version !== logsVersion) return false;
          if (!Array.isArray(data)) throw new Error("Invalid logs");
          logs = data.filter(r => hasDelta(r.delta_jin) && Number.isFinite(Date.parse(r.created_at)))
            .map(r => ({id:String(r.id), delta:Number(r.delta_jin), at:r.created_at}));
          logsError = false; overviewFresh = true;
          return true;
        } catch (_) { if (version === logsVersion) logsError = true; return false; }
        finally { logsPromise = null; renderOverview(); }
      })();
      renderOverview();
      return logsPromise;
    }
    function renderHome() {
      const isActive = active();
      els.home.classList.toggle("fat-active",isActive);
      els.overview.classList.toggle("fat-mode",isActive);
      q("fatOverviewCloseBtn").hidden = !isActive;
      els.metricSwitch.classList.toggle("fat-switch-active",isActive);
      content.hidden = !isActive;
      q("fatRecordBtn").hidden = !verifiedAdmin;
      q("fatRecordBtn").disabled = saving || !snapshot?.configured || readError;
      if (!isActive) return;
      const delta = snapshot?.delta, hasRecord = hasDelta(delta), previous = weeks[2];
      q("fatValueLabel").textContent = !hasRecord ? "较起始体重" : delta < 0 ? "较起始体重轻" : delta > 0 ? "较起始体重重" : "与起始体重持平";
      q("fatValue").textContent = hasRecord ? number(delta) : "—";
      q("fatValue").style.fontSize = q("fatValue").textContent.length > 5 ? "clamp(34px,10vw,44px)" : "";
      q("fatValueUnit").textContent = unitName();
      q("fatValue").parentElement.classList.toggle("gain",Number(delta)>0);
      const comparison = q("fatHomeComparison");
      comparison.hidden = !hasRecord;
      const value = q("fatHomeCompareValue"), note = q("fatHomeCompareNote");
      note.hidden = !previous?.days || previous.mean !== null;
      note.textContent = "不足 3 天 · 未算均重";
      if (!hasRecord || !previous?.days) value.textContent = "上周无记录";
      else if (previous.mean !== null) value.textContent = comparisonText(delta-previous.mean,"上周均重");
      else if (previousLow !== null) value.textContent = comparisonText(delta-previousLow,"上周最低");
      else value.textContent = previousLowPending ? "正在读取上周最低" : "上周最低暂未同步";
      q("fatHomeMeta").textContent = !initialized ? "正在同步体重…" : readError ? "同步失败 · 点击圆盘重试" :
        !snapshot?.configured ? (verifiedAdmin ? "请在设置中填写起始体重" : "等待设置起始体重") :
          !hasRecord ? "暂无体重记录" : "最近记录 · " + stamp(snapshot.recordedAt);
    }
    function comparisonText(delta, baseline) {
      if (number(delta) === "0") return "与" + baseline + "持平";
      return "较" + baseline + (delta < 0 ? "轻 " : "重 ") + number(delta) + " " + unitName();
    }
    function renderOverview() {
      overview.hidden = !active();
      if (!active()) return;
      els.scoreOverviewContent.hidden = true; els.wheelOverviewContent.hidden = true;
      els.overviewTitle.textContent = "减脂总览";
      els.overviewSubtitle.textContent = "";
      const section = state.overviewSection === "records" ? "records" : "trend";
      q("fatTrendSection").hidden = section !== "trend";
      q("fatRecordsSection").hidden = section !== "records";
      sectionButtons.forEach(button => {
        button.setAttribute("aria-pressed",String(button.dataset.fatSection === section));
      });
      if (state.overviewMode === "closed") return;
      if (section === "records") renderRecords();
      else renderWeeks();
    }
    function peekHeight() {
      return els.overviewShell.getBoundingClientRect().height || 340;
    }
    function chooseSection(section) {
      if (!active() || state.overviewMode === "closed") return;
      const previous = state.overviewSection;
      if (previous === section) return;
      if (previous) scrollBySection[previous] = scroller.scrollTop;
      state.overviewSection = section;
      renderOverview();
      scroller.scrollTop = scrollBySection[section];
    }
    function activate() {
      state.activeMetric = "fat";
      ui.renderPrimaryMetric(); ui.renderOverviewContentMode();
      void refresh({silent:false});
    }
    function trendWeeks() {
      const oldest = weeks[0].start;
      const previousWeek = {start:shiftDay(oldest,-7),end:shiftDay(oldest,-1)};
      const periods = [previousWeek,...weeks];
      const days = new Map(), now = Date.now();
      for (const record of logs) {
        const time = new Date(record.at);
        if (time.getTime() > now) continue;
        const day = dayKey.format(time);
        if (day < previousWeek.start || day > weeks[3].end) continue;
        days.set(day,Math.min(days.get(day) ?? Infinity,record.delta));
      }
      const stats = periods.map((period,index) => {
        const values = [...days].filter(([day]) => day >= period.start && day <= period.end).map(([,delta]) => delta);
        const low = values.length ? Math.min(...values) : null;
        // The week before the visible chart is only available from the readings.
        const mean = index ? period.mean : values.length >= 3 ? values.reduce((sum,value) => sum+value,0)/values.length : null;
        return {low,mean};
      });
      return weeks.map((week,index) => {
        const current = stats[index+1], previous = stats[index];
        const reference = previous.mean ?? previous.low;
        return {
          low:current.low,
          change:current.low === null || reference === null ? null : current.low-reference,
          basis:previous.mean !== null ? "上周均重" : "上周最低"
        };
      });
    }
    const pointFormat = new Intl.NumberFormat("zh-CN", {minimumFractionDigits:1, maximumFractionDigits:1});
    function signedWeight(delta, compact=false) {
      const value = compact ? pointFormat.format(Math.abs(displayWeight(delta))) : number(delta);
      return (Number(value) === 0 ? "" : delta < 0 ? "−" : "+") + value;
    }
    function renderWeeks() {
      const failure = readError || logsError;
      const ready = weeks.length === 4 && overviewFresh;
      const status = q("fatOverviewStatus");
      status.textContent = failure ? "同步失败" : !ready ? "正在同步…" : "";
      status.hidden = !status.textContent;
      q("fatProgressRetry").hidden = !failure;
      q("fatChart").hidden = !ready;
      if (!ready) return;
      const metrics = trendWeeks();
      const latestWeek = metrics.findLastIndex(metric => metric.low !== null);
      const index = selectedWeek ?? (latestWeek < 0 ? 3 : latestWeek);
      const week = weeks[index], {low,change,basis} = metrics[index];
      q("fatChartReference").textContent = low === null ? "" : "较起始体重";
      q("fatWeekValue").textContent = low === null ? "无记录" : signedWeight(low);
      if (low !== null) {
        const unitLabel = document.createElement("small");
        unitLabel.textContent = unitName();
        q("fatWeekValue").append(unitLabel);
      }
      q("fatWeekChange").textContent = low === null ? "" : change === null ? "上周无记录" :
        "较"+basis+" "+signedWeight(change)+" "+unitName();
      q("fatWeekDates").textContent = weekLabel(week.start) + "–" + weekLabel(week.end) +
        (index === 3 ? " · 本周" : "") + (low === null ? "" : " · 记录 " + week.days + " 天");
      weekButtons.forEach((button,i) => {
        const period = weeks[i], {low:value,change,basis} = metrics[i];
        button.textContent = i === 3 ? "本周" : weekLabel(period.start);
        button.classList.toggle("no-record",value === null);
        button.setAttribute("aria-pressed",String(index === i));
        button.setAttribute("aria-label",weekLabel(period.start) + "至" + weekLabel(period.end) + "，" +
          (value === null ? "无记录" : "最低体重" + comparisonText(value,"起始体重") +
            (change === null ? "，上周无记录" : "，" + comparisonText(change,basis))));
      });
      trend = {metrics,index};
      laterDraw();
    }
    function drawTrend() {
      if (!active() || state.overviewMode === "closed" || state.overviewSection === "records" || !trend) return;
      const canvas = q("fatTrendCanvas"), {width,height} = canvas.getBoundingClientRect();
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1,3);
      canvas.width = Math.round(width*dpr);
      canvas.height = Math.round(height*dpr);
      const ctx = canvas.getContext("2d");
      const notes = q("fatPointNotes");
      notes.replaceChildren();
      if (!ctx || trend.metrics.every(metric => metric.low === null)) return;
      ctx.setTransform(dpr,0,0,dpr,0,0);

      const values = trend.metrics.map(({low}) => low === null ? null : displayWeight(low));
      const measured = values.filter(value => value !== null);
      const min = Math.min(...measured), max = Math.max(...measured);
      const interval = Math.max((max-min)/2, unit === "kg" ? 0.2 : 0.4);
      const power = 10 ** Math.floor(Math.log10(interval));
      const step = [1,2,2.5,5,10].find(value => value*power >= interval)*power;
      const middle = Math.round((max+min)/2/step)*step;
      const axis = Array.from({length:3},(_,i) => middle+(1-i)*step);
      const top = Math.max(axis[0],max+step*0.24), bottom = Math.min(axis[2],min-step*0.24);
      const left = plotInset();
      const plotWidth = width - left;
      const x = index => left + (index+0.5)*plotWidth/4;
      const y = value => 42 + (top-value)*(height-52)/(top-bottom);

      ctx.font = "11px system-ui";
      ctx.textBaseline = "middle";
      for (const tick of axis) {
        const py = y(tick), value = Math.round(tick*1000)/1000;
        ctx.strokeStyle = "#e3e9e5";
        ctx.beginPath(); ctx.moveTo(left,py); ctx.lineTo(width,py); ctx.stroke();
        ctx.fillStyle = "#55695e";
        ctx.fillText((value < 0 ? "−" : value > 0 ? "+" : "") + Math.abs(value),0,py);
      }
      const selectedX = x(trend.index);
      if (values[trend.index] !== null) {
        ctx.strokeStyle = "#acc2b5";
        ctx.setLineDash([2,4]);
        ctx.beginPath(); ctx.moveTo(selectedX,y(values[trend.index])); ctx.lineTo(selectedX,height); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.strokeStyle = "#305a46";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i=0; i<values.length; i++) {
        if (values[i] === null) continue;
        if (i === 0 || values[i-1] === null) ctx.moveTo(x(i),y(values[i]));
        else ctx.lineTo(x(i),y(values[i]));
      }
      ctx.stroke();
      values.forEach((value,index) => {
        if (value === null) return;
        const selected = index === trend.index;
        if (selected) {
          ctx.fillStyle = "#e0ece3";
          ctx.beginPath(); ctx.arc(x(index),y(value),8,0,Math.PI*2); ctx.fill();
        }
        ctx.fillStyle = selected ? "#305a46" : "#fff";
        ctx.beginPath(); ctx.arc(x(index),y(value),selected ? 4 : 3,0,Math.PI*2);
        ctx.fill(); ctx.stroke();
        const {low,change} = trend.metrics[index];
        const note = document.createElement("div");
        note.className = "fat-point-note";
        note.classList.toggle("selected",selected);
        // Give each label its own column so adjacent weeks also fit on narrow screens.
        note.style.left = left+index*plotWidth/4+"px";
        note.style.width = plotWidth/4+"px";
        note.style.top = y(value)-10+"px";
        const start = document.createElement("span"), last = document.createElement("span");
        start.textContent = "起始 " + signedWeight(low,true);
        last.textContent = "上周 " + (change === null ? "—" : signedWeight(change,true));
        note.append(start,last);
        notes.append(note);
      });
    }
    function renderRecords() {
      const list = q("fatRecords"), status = q("fatRecordsStatus");
      status.textContent = logsPromise ? "正在读取…" : logsError ? "记录同步失败" : logs.length ? "" : "暂无体重记录";
      status.hidden = !status.textContent;
      q("fatRecordsRetry").hidden = !logsError || !!logsPromise;
      q("fatRecordsMore").hidden = recordLimit >= logs.length;
      const rows = document.createDocumentFragment();
      let lastDay, group;
      for (const record of logs.slice(0,recordLimit)) {
        const time = new Date(record.at), day = dayKey.format(time);
        if (day !== lastDay) {
          group = document.createElement("section"); group.className = "fat-record-day";
          const title = document.createElement("h3"); title.textContent = dayLabel.format(time);
          group.append(title); rows.append(group); lastDay = day;
        }
        const line = document.createElement("div"); line.className = "fat-record-line";
        const label = document.createElement("time"); label.dateTime = record.at; label.textContent = clockLabel.format(time);
        const delta = document.createElement("span"); delta.textContent = comparisonText(record.delta,"起始体重");
        line.append(label,delta);
        if (verifiedAdmin) {
          const remove = document.createElement("button");
          remove.type = "button"; remove.className = "fat-delete-button"; remove.textContent = "删除";
          remove.disabled = saving;
          remove.setAttribute("aria-label","删除 " + stamp(record.at) + " 的体重记录");
          remove.addEventListener("click",() => openDeleteDialog(record));
          line.append(remove);
        }
        group.append(line);
      }
      list.replaceChildren(rows);
    }
    async function syncAfterWrite() {
      readVersion++; logsVersion++; overviewFresh = false;
      await Promise.all([refreshPromise,logsPromise].filter(Boolean));
      const results = await Promise.all([
        refresh(), state.overviewMode !== "closed" ? loadLogs(true) : true
      ]);
      return results.every(Boolean);
    }
    function openDeleteDialog(record) {
      if (!verifiedAdmin || saving || !record || !/^[1-9]\d*$/.test(record.id)) return;
      clearSecrets(); mode="delete"; deleteTarget={...record};
      q("fatWeightFields").hidden=true;
      q("fatWeightTitle").textContent="删除体重记录";
      q("fatWeightMessage").textContent=stamp(record.at)+" · "+comparisonText(record.delta,"起始体重");
      q("fatWeightNote").textContent="删除后无法恢复。";
      q("fatWeightError").hidden=true;
      q("fatSaveWeight").textContent="确认删除"; q("fatSaveWeight").disabled=false;
      ui.setLayer(dialog,true); syncUnits();
    }
    async function deleteRecord() {
      if (!verifiedAdmin || saving || mode!=="delete" || !deleteTarget) return;
      const target={...deleteTarget}, auth=authVersion;
      saving=true; q("fatWeightError").hidden=true;
      ui.setBusy(q("fatSaveWeight"),true); q("fatCancelWeight").disabled=true;
      syncUnits(); renderHome(); renderOverview();
      try {
        const {data,error}=await db.rpc("points_fat_admin_delete_record",{p_record_id:target.id});
        if (error) throw error;
        logs=logs.filter(record=>record.id!==target.id);
        const synced=await syncAfterWrite();
        if (auth!==authVersion || !verifiedAdmin) return;
        closeDialog(); renderHome(); renderOverview();
        ui.showToast(synced ? (data===false?"这条记录已不存在，数据已同步":"体重记录已删除") : "已删除，数据同步暂未完成，请稍后刷新");
        ui.vibrate(14);
      } catch (error) {
        if (auth!==authVersion) return;
        if (/42501|permission|admin|JWT/i.test(`${error?.code || ""} ${error?.message || ""}`)) {
          verifiedAdmin=false; permissionChanged(); ui.showToast(errorText(error,"删除"));
        } else {
          q("fatWeightError").textContent=/PGRST202|Could not find|schema cache/i.test(`${error?.code || ""} ${error?.message || ""}`)?"删除功能尚未配置，请先安装配套数据库更新":errorText(error,"删除");
          q("fatWeightError").hidden=false;
        }
      } finally {
        saving=false; ui.setBusy(q("fatSaveWeight"),false); q("fatCancelWeight").disabled=false; q("fatWeightInput").disabled=false;
        syncUnits(); renderHome(); renderOverview();
      }
    }
    async function loadStartingWeight() {
      if (!verifiedAdmin || mode!=="starting" || !dialog.classList.contains("open")) return;
      const version=++secretVersion, auth=authVersion, user=verifiedUser;
      startingLoaded=false; startingEditing=false;
      q("fatWeightInput").value=""; q("fatWeightInput").readOnly=true;
      q("fatWeightInput").disabled=true; q("fatSaveWeight").disabled=true;
      q("fatSaveWeight").textContent="正在读取…"; q("fatWeightError").hidden=true;
      syncUnits();
      try {
        const {data,error}=await db.rpc("points_fat_admin_get_settings");
        if (version!==secretVersion || auth!==authVersion || !verifiedAdmin || user!==verifiedUser || mode!=="starting" || !dialog.classList.contains("open")) return;
        if (error) throw error;
        const result=row(data); if (!result) throw new Error("Fat settings not found");
        const value=result.starting_weight_jin;
        if (value!==null && value!==undefined && (!hasDelta(value) || Number(value)<=0)) throw new Error("Invalid starting weight");
        startingLoaded=true;
        q("fatWeightInput").value=hasDelta(value)?inputNumber(value):"";
        q("fatWeightMessage").textContent=hasDelta(value)?"当前已设置的起始体重":"尚未设置起始体重";
        q("fatSaveWeight").textContent=hasDelta(value)?"修改":"设置";
        syncUnits();
      } catch (error) {
        if (version!==secretVersion || auth!==authVersion || mode!=="starting" || !dialog.classList.contains("open")) return;
        q("fatWeightError").textContent=/42501|permission|admin|JWT/i.test(`${error?.code || ""} ${error?.message || ""}`)?"管理员权限已失效，请重新登录":"读取起始体重失败，请重试";
        q("fatWeightError").hidden=false; q("fatSaveWeight").textContent="重试读取";
      } finally {
        if (mode!=="starting" || !dialog.classList.contains("open")) window.PointsRuntime?.clear("points_fat_admin_get_settings");
        if (version===secretVersion && auth===authVersion && mode==="starting" && dialog.classList.contains("open")) {
          q("fatWeightInput").disabled=false; q("fatSaveWeight").disabled=false; syncUnits();
        }
      }
    }
    function openDialog(nextMode) {
      if (!verifiedAdmin || saving) return;
      clearSecrets(); mode=nextMode;
      deleteTarget=null; q("fatWeightFields").hidden=false;
      const starting=mode==="starting";
      q("fatWeightTitle").textContent=starting?"起始体重":"记录体重";
      q("fatWeightLabel").textContent=starting?"起始体重":"本次体重";
      q("fatWeightMessage").textContent=starting?"正在读取已设置的体重…":"";
      q("fatWeightNote").textContent=starting?"更改起始体重后，已有记录的差值会重新计算。":"最多保留两位小数，首页和总览只显示变化量。";
      q("fatSaveWeight").textContent=starting?"修改":"保存记录";
      q("fatSaveWeight").disabled=starting; q("fatWeightInput").disabled=starting;
      q("fatWeightInput").readOnly=starting;
      q("fatWeightError").hidden=true;
      if (starting) ui.setLayer(els.settingsLayer,false);
      ui.setLayer(dialog,true);
      syncUnits();
      if (starting) void loadStartingWeight();
    }
    function inputWeight() {
      const raw=q("fatWeightInput").value.trim();
      const pattern=unit==="kg"?/^\d+(?:\.\d{1,3})?$/:/^\d+(?:\.\d{1,2})?$/;
      if (!pattern.test(raw)) return null;
      const scaled=Math.round(Number(raw)*(unit==="kg"?1000:100));
      const jinCents=unit==="kg"?scaled/5:scaled;
      return Number.isInteger(jinCents) && jinCents>0 && jinCents<1000000 ? jinCents/100:null;
    }
    async function saveWeight() {
      if (!verifiedAdmin || saving || !mode) return;
      if (mode==="delete") return deleteRecord();
      if (q("fatSaveWeight").disabled) return;
      if (mode==="starting" && !startingLoaded) return loadStartingWeight();
      if (mode==="starting" && !startingEditing) {
        const previouslySet=q("fatWeightInput").value!=="";
        startingEditing=true; q("fatWeightInput").readOnly=false;
        q("fatWeightTitle").textContent=previouslySet?"修改起始体重":"设置起始体重";
        q("fatSaveWeight").textContent=previouslySet?"保存修改":"保存起始体重";
        syncUnits(); q("fatWeightInput").focus(); q("fatWeightInput").select(); return;
      }
      const value=inputWeight();
      if (value===null) { q("fatWeightError").textContent=unit==="kg"?"请输入大于 0、小于 5000 公斤的体重，精度为 0.005 公斤":"请输入大于 0、小于 10000 斤的体重，最多两位小数"; q("fatWeightError").hidden=false; return; }
      const savingMode=mode, auth=authVersion;
      saving=true; q("fatWeightError").hidden=true;
      ui.setBusy(q("fatSaveWeight"),true); q("fatCancelWeight").disabled=true; q("fatWeightInput").disabled=true;
      syncUnits();
      try {
        const name=savingMode==="starting"?"points_fat_admin_set_starting_weight":"points_fat_admin_record_weight";
        const {error}=await db.rpc(name,{p_weight_jin:value});
        if (error) throw error;
        const synced=await syncAfterWrite();
        if (auth!==authVersion || !verifiedAdmin) return;
        closeDialog();
        ui.showToast(synced?(savingMode==="starting"?"起始体重已保存":"体重记录已保存"):"已保存，数据同步暂未完成，请稍后刷新");
        ui.vibrate(14);
      } catch (error) {
        if (auth!==authVersion) return;
        const text=errorText(error);
        if (/42501|permission|admin|JWT/i.test(`${error?.code || ""} ${error?.message || ""}`)) {
          verifiedAdmin=false; permissionChanged(); ui.showToast(text);
        } else { q("fatWeightError").textContent=text; q("fatWeightError").hidden=false; }
      } finally {
        saving=false; ui.setBusy(q("fatSaveWeight"),false); q("fatCancelWeight").disabled=false; q("fatWeightInput").disabled=false; syncUnits(); renderHome(); renderOverview();
      }
    }
    q("fatStartingWeightBtn").addEventListener("click",()=>openDialog("starting"));
    document.querySelectorAll("[data-fat-unit]").forEach(button => button.addEventListener("click",()=>changeUnit(button.dataset.fatUnit)));
    document.querySelectorAll("[data-fat-status]").forEach(button=>button.addEventListener("click",()=>void changeStatus(button.dataset.fatStatus)));
    q("fatRecordBtn").addEventListener("click",()=>openDialog("record"));
    q("fatSaveWeight").addEventListener("click",()=>void saveWeight());
    q("fatCancelWeight").addEventListener("click",()=>{ if (!saving) closeDialog(); });
    q("fatWeightInput").addEventListener("keydown",event=>{ if (event.key==="Enter") { event.preventDefault(); void saveWeight(); } });
    dialog.addEventListener("click",event=>{ if (event.target===dialog && !saving) closeDialog(); });
    document.addEventListener("keydown",event=>{
      if (event.key==="Escape" && dialog.classList.contains("open")) { event.stopImmediatePropagation(); event.preventDefault(); if (!saving) closeDialog(); }
    },true);
    async function manualRefresh() {
      if (q("fatRefreshBtn").classList.contains("refreshing")) return;
      q("fatRefreshBtn").classList.add("refreshing");
      try {
        const synced=await refresh({silent:false});
        if (state.overviewMode !== "closed") await loadLogs(true);
        if (synced) ui.showToast("已同步减脂记录");
      } finally { q("fatRefreshBtn").classList.remove("refreshing"); }
    }
    q("fatRefreshBtn").addEventListener("click",()=>void manualRefresh());
    q("fatRefreshBtn").addEventListener("keydown",event=>{ if (["Enter"," "].includes(event.key)) { event.preventDefault(); void manualRefresh(); } });
    els.overviewBtn.addEventListener("click",event=>{
      if (!active()) return;
      event.stopImmediatePropagation(); ui.vibrate(8);
      selectedWeek=null; recordLimit=40;
      scrollBySection.trend=0; scrollBySection.records=0;
      ui.openOverviewSheet(); ui.setOverviewMode("full");
      chooseSection("trend");
      void Promise.all([refresh(),loadLogs(true)]);
    },true);
    sectionButtons.forEach(button => button.addEventListener("click",() => {
      if (button.getAttribute("aria-pressed") === "true") return;
      ui.vibrate(6);
      chooseSection(button.dataset.fatSection);
      void loadLogs();
    }));
    function plotInset() {
      return weekButtons[0].parentElement.offsetLeft;
    }
    function selectWeek(index) {
      if (selectedWeek === index) return;
      selectedWeek=index;
      renderWeeks();
    }
    weekButtons.forEach((button,index) => button.addEventListener("click",() => selectWeek(index)));
    q("fatTrendCanvas").addEventListener("click",event => {
      const {left,width} = event.currentTarget.getBoundingClientRect();
      const inset = plotInset();
      if (width <= inset || event.clientX < left+inset) return;
      selectWeek(Math.min(3,Math.floor((event.clientX-left-inset)*4/(width-inset))));
    });
    q("fatProgressRetry").addEventListener("click",() => void Promise.all([refresh(),loadLogs(true)]));
    q("fatRecordsRetry").addEventListener("click",() => void loadLogs(true));
    q("fatRecordsMore").addEventListener("click",() => { recordLimit+=40; renderRecords(); });
    function resizeOverview() {
      if (active() && state.overviewMode !== "closed") els.overviewShell.style.setProperty("--peek-height",`${peekHeight()}px`);
      laterDraw();
    }
    window.addEventListener("resize",resizeOverview,{passive:true});
    window.visualViewport?.addEventListener("resize",resizeOverview,{passive:true});
    syncUnits(); adminRendered(); renderHome();
    return { activate, refresh, renderHome, renderOverview, adminRendered, draw:laterDraw, chooseSection, loadLogs, peekHeight };
  }
})();
