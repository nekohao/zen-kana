/* New module only: RPCs expose differences; absolute weights never enter public UI. */
(() => {
  "use strict";
  window.PointsFatLoss = { attach };

  function dayStart(value) { const d = new Date(value); d.setHours(0,0,0,0); return d; }
  function shiftDay(value, n) { const d = dayStart(value); d.setDate(d.getDate()+n); return d; }
  function key(d) { return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
  // Each measured day has equal weight. Missing days are never imputed.
  // All inputs are public differences; the private starting weight is unnecessary.
  function trendData(records, now = new Date()) {
    const byDay = new Map(), today = dayStart(now), earliest = shiftDay(today,-95).getTime();
    records.forEach(record => {
      const time = Date.parse(record.at);
      if (!Number.isFinite(time) || time < earliest || time > now.getTime() || !Number.isFinite(record.delta)) return;
      const date = dayStart(time), dayKey = key(date), existing = byDay.get(dayKey);
      if (!existing || time < Date.parse(existing.at)) byDay.set(dayKey,{...record,date});
    });
    const daily = [...byDay.values()].sort((a,b) => a.date-b.date);
    const average = (start,end) => {
      const values = daily.filter(record => record.date >= start && record.date < end);
      return {start,end,count:values.length,mean:values.length ? values.reduce((sum,r) => sum+r.delta,0)/values.length : null};
    };
    const weeks = Array.from({length:4},(_,i) => average(shiftDay(today,-6-i*7),shiftDay(today,1-i*7)));
    const change = weeks[0].count && weeks[1].count ? weeks[0].mean-weeks[1].mean : null;
    const rolling = Array.from({length:90},(_,i) => {
      const date = shiftDay(today,i-89), sample = average(shiftDay(date,-6),shiftDay(date,1));
      return {date,count:sample.count,delta:sample.count >= 3 ? sample.mean : null};
    });
    return {today,daily,weeks,change,rolling};
  }

  function attach({ db, state, els, ui }) {
    const unitPicker = () => '<div class="segmented fat-unit-switch" role="group" aria-label="体重单位"><button class="segment pressable" data-fat-unit="kg" type="button" aria-pressed="true">公斤</button><button class="segment pressable" data-fat-unit="jin" type="button" aria-pressed="false">斤</button></div>';
    const icon = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="M8 10a4 4 0 0 1 8 0M12 10l2-2"/></svg>';
    els.metricSwitch.insertAdjacentHTML("beforeend", `<button class="metric-option" data-metric="fat" role="tab" aria-selected="false" type="button">${icon}<span>减脂</span></button>`);
    els.home.querySelector(".hero").insertAdjacentHTML("beforeend", `
      <div class="fat-home-content" hidden>
        <div class="eyebrow reward-message" aria-live="polite">
          <span class="reward-line-primary" id="fatHomeTitle">最近一次记录 · 相对起始体重的变化</span>
          <span class="reward-line-secondary" id="fatHomeMeta">正在同步减脂记录</span>

        </div>
          <div class="segmented fat-status-switch" role="group" aria-label="体重记录状态"><button class="segment pressable" data-fat-status="before" type="button">未排便</button><button class="segment pressable" data-fat-status="after" type="button">已排便</button><button class="segment pressable" data-fat-status="unmarked" type="button" hidden>未标注历史</button></div>
        <div class="score-lens-wrap pressable" id="fatRefreshBtn" role="button" tabindex="0" aria-label="刷新减脂数据">
          <div class="score-lens fat-lens"><div class="fat-value-stack" aria-live="polite">
            <span class="fat-value-label" id="fatValueLabel">体重变化</span>
            <strong class="fat-value" id="fatValue">—</strong><span class="fat-value-unit" id="fatValueUnit">公斤</span>
          </div></div>
        </div>
        <div class="fat-home-actions"><button class="fat-record-button pressable" id="fatRecordBtn" hidden type="button">记录体重</button></div>
      </div>`);
    els.overviewShell.insertAdjacentHTML("beforeend", `
      <div class="fat-overview" id="fatOverviewContent" hidden>
          <div class="segmented fat-status-switch" role="group" aria-label="体重记录状态"><button class="segment pressable" data-fat-status="before" type="button">未排便</button><button class="segment pressable" data-fat-status="after" type="button">已排便</button><button class="segment pressable" data-fat-status="unmarked" type="button" hidden>未标注历史</button></div>
        <div class="overview-landing" id="fatLanding"><nav class="overview-quick-nav" aria-label="减脂总览快捷入口">
          <button class="overview-quick-card pressable" data-fat-section="trend" type="button">${icon}<span class="overview-quick-title">趋势统计</span><span class="overview-quick-copy">体重变化趋势</span></button>
          <button class="overview-quick-card pressable" data-fat-section="calendar" type="button"><svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg><span class="overview-quick-title">月度总览</span><span class="overview-quick-copy">查看每日记录</span></button>
        </nav></div>
        <div class="overview-content-switch" id="fatContentSwitch" role="tablist" aria-label="减脂总览内容" hidden>
          <button class="overview-content-choice pressable" data-fat-section="trend" role="tab" type="button">趋势</button>
          <button class="overview-content-choice pressable" data-fat-section="calendar" role="tab" type="button">月度总览</button>
        </div>
        <div class="fat-overview-status" id="fatOverviewStatus" hidden></div>
        <section class="section overview-section-anchor" id="fatTrendSection" hidden>
          <h2 class="section-title">趋势统计</h2>
          <div class="card glass fat-week-card" aria-live="polite">
            <div class="fat-week-title">近七天记录均值 · 比前七天</div>
            <div class="fat-week-result"><span id="fatWeekDirection">暂无对比</span><strong id="fatWeekValue">—</strong><span id="fatWeekUnit">公斤</span></div>
            <div class="fat-week-coverage" id="fatWeekCoverage"></div>
            <div class="fat-week-dates" id="fatWeekDates"></div>
            <p class="fat-week-note" id="fatWeekNote"></p>
            <p class="fat-week-long" id="fatWeekLong"></p>
          </div>
          <div class="card glass trend-card">
            <div class="segmented" aria-label="减脂趋势范围" id="fatTrendRanges">
              <button class="segment pressable" data-fat-range="14" type="button">近14天</button>
              <button class="segment pressable active" data-fat-range="28" type="button">近28天</button>
              <button class="segment pressable" data-fat-range="90" type="button">近90天</button>
            </div>
            <div class="chart-wrap fat-chart-wrap"><canvas id="fatTrendCanvas" role="img" aria-label="体重差值趋势折线图"></canvas><div class="chart-empty" id="fatChartEmpty">暂无记录</div></div>
            <div class="fat-chart-legend"><span>灰点：每日首笔</span><span>绿线：七日记录均值</span></div>
            <div class="chart-caption" id="fatChartCaption"></div><p class="fat-chart-help" id="fatChartHelp"></p>
            <p class="fat-chart-help">每天首笔参与统计，漏记不补值；绿线在七天内至少有三天记录时显示。尽量分散记录，每周五至七天更有参考价值。</p>
            <p class="fat-chart-help">尽量固定称重时段、同一台秤和相近衣着；比较时保持相同排便状态。均值下降表示平均体重变轻，不等同于脂肪减少量。</p>
          </div>
        </section>
        <section class="section overview-section-anchor" id="fatCalendarSection" hidden>
          <h2 class="section-title">月度总览</h2><div class="card glass calendar-card fat-calendar">
            <div class="calendar-head"><button class="small-icon pressable" id="fatPrevMonth" aria-label="减脂上个月" type="button">‹</button><div class="calendar-month" id="fatCalendarMonth"></div><button class="small-icon pressable" id="fatNextMonth" aria-label="减脂下个月" type="button">›</button></div>
            <div class="fat-month-summary"><div><span>本月记录</span><strong id="fatMonthCount">0 次</strong></div><div><span>本月净变化</span><strong id="fatMonthChange">—</strong></div></div>
            <div class="weekdays" aria-hidden="true"><div class="weekday">日</div><div class="weekday">一</div><div class="weekday">二</div><div class="weekday">三</div><div class="weekday">四</div><div class="weekday">五</div><div class="weekday">六</div></div>
            <div class="calendar-grid" id="fatCalendarGrid"></div><p class="fat-chart-help">日期下方显示当天最后一次记录的差值</p>
            <div class="day-detail hidden" id="fatDayDetail"><div class="detail-title" id="fatDayTitle"></div><ul class="log-list" id="fatDayList"></ul></div>
          </div>
        </section>
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
            <div id="fatWeightFields"><div class="segmented fat-record-status" id="fatRecordStatus" role="group" aria-label="本次排便状态"><button class="segment pressable" data-fat-record-status="before" type="button">未排便</button><button class="segment pressable" data-fat-record-status="after" type="button">已排便</button></div><label class="fat-field-label" id="fatWeightLabel" for="fatWeightInput">本次体重</label><div class="fat-input-wrap"><input id="fatWeightInput" inputmode="decimal" type="text" maxlength="8" autocomplete="off" placeholder="输入体重"/><span id="fatInputUnit">公斤</span></div></div>
            <div class="fat-form-error" id="fatWeightError" role="alert" hidden></div><div class="fat-form-note" id="fatWeightNote"></div>
          </div><div class="alert-actions vertical"><button class="alert-button primary-action pressable" id="fatSaveWeight" type="button">保存记录</button><button class="alert-button pressable" id="fatCancelWeight" type="button">取消</button></div>
        </div>
      </div>`);
    const q = id => document.getElementById(id);
    const content = els.home.querySelector(".fat-home-content");
    const overview = q("fatOverviewContent");
    const dialog = q("fatWeightLayer");
    let snapshot = null, logs = [], readError = false, logsError = false;
    let readVersion = 0, logsVersion = 0, authVersion = 0, secretVersion = 0;
    let verifiedAdmin = false, verifiedUser = null, mode = null, saving = false;
    let range = "28", month = monthStart(new Date()), selectedDay = null;
    let refreshPromise = null, logsPromise = null, authTimer = 0;
    let chartRaf = 0, initialized = false, overviewFresh = false, landingPeekHeight = 300;
    let unit = "kg", deleteTarget = null, startingLoaded = false, startingEditing = false;
    let rewards = null, bowelStatus="after", recordStatus="after", statusSupported=null;
    const statusLabel=value=>value==="before"?"未排便":value==="after"?"已排便":"未标注历史";
    const statusOf=record=>["before","after"].includes(record.status)?record.status:"unmarked";
    const visibleLogs=()=>logs.filter(record=>statusOf(record)===bowelStatus);
    function syncStatuses() {
      document.querySelectorAll("[data-fat-status]").forEach(button=>{
        const selected=button.dataset.fatStatus===bowelStatus;
        button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected));
        button.disabled=statusSupported===false && button.dataset.fatStatus!=="unmarked";
        if(button.dataset.fatStatus==="unmarked")button.hidden=statusSupported!==false && bowelStatus!=="unmarked" && !logs.some(record=>statusOf(record)==="unmarked");
      });
      q("fatRecordStatus").hidden=mode!=="record";
      document.querySelectorAll("[data-fat-record-status]").forEach(button=>{
        const selected=button.dataset.fatRecordStatus===recordStatus;
        button.classList.toggle("active",selected);button.setAttribute("aria-pressed",String(selected));button.disabled=saving;
      });
    }
    async function readFat(name,args={}) {
      const result=await db.rpc(name,args);
      if(!result.error){statusSupported=true;return result;}
      if(!/PGRST202|42883|schema cache|Could not find/i.test(`${result.error?.code || ""} ${result.error?.message || ""}`))return result;
      statusSupported=false;bowelStatus="unmarked";
      window.PointsRuntime?.clear(name);
      const legacy=name==="points_fat_v2_get_state"?"points_fat_get_state":"points_fat_get_logs";
      const {p_bowel_status,...legacyArgs}=args;
      return db.rpc(legacy,legacyArgs);
    }
    async function changeStatus(next) {
      if(!["before","after","unmarked"].includes(next) || next===bowelStatus || statusSupported===false && next!=="unmarked")return;
      bowelStatus=next;readVersion++;snapshot=null;initialized=false;
      syncStatuses();renderHome();renderOverview();
      if(refreshPromise)await refreshPromise;
      await refresh({silent:true});
    }
    try { const savedUnit=window.localStorage.getItem("points_fat_unit"); if (["jin","kg"].includes(savedUnit)) unit=savedUnit; } catch (_) {}
    const unitName = () => unit === "kg" ? "公斤" : "斤";
    const displayWeight = value => Number(value) / (unit === "kg" ? 2 : 1);
    const number = value => new Intl.NumberFormat("zh-CN", { maximumFractionDigits:unit === "kg" ? 3 : 2 }).format(Math.abs(displayWeight(value)));
    const inputNumber = value => String(Number(displayWeight(value).toFixed(unit === "kg" ? 3 : 2)));
    const deltaNumber = value => `${value > 0 ? "+" : value < 0 ? "−" : ""}${number(value)}`;
    const difference = value => value < 0 ? `已减去 ${number(value)} ${unitName()}` : value > 0 ? `增加了 ${number(value)} ${unitName()}` : "与起始体重持平";
    const stamp = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("zh-CN", { month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false }).format(new Date(value)) : "时间待同步";
    const active = () => state.activeMetric === "fat";
    const row = data => Array.isArray(data) ? data[0] : data;
    const hasDelta = value => value !== null && value !== undefined && Number.isFinite(Number(value));
    function monthStart(d) { return new Date(d.getFullYear(),d.getMonth(),1); }
    function nextMonth(d, n=1) { return new Date(d.getFullYear(),d.getMonth()+n,1); }
    function laterDraw() { cancelAnimationFrame(chartRaf); chartRaf = requestAnimationFrame(drawTrend); }
    function fitSettings() { if (els.settingsLayer.classList.contains("open")) window.dispatchEvent(new Event("resize")); }
    function syncUnits() {
      const loading = dialog.classList.contains("open") && q("fatWeightInput").disabled && mode !== "delete";
      document.querySelectorAll("[data-fat-unit]").forEach(button => {
        const selected = button.dataset.fatUnit === unit;
        button.classList.toggle("active",selected); button.setAttribute("aria-pressed",String(selected));
        button.disabled = saving || loading;
      });
      syncStatuses();
      q("fatInputUnit").textContent = unitName();
      q("fatChartHelp").textContent = `纵轴为相对起始体重的差值 · 单位：${unitName()} · 均值按实际记录天数计算`;
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
      rewards?.roleChanged();
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
      const version = readVersion, requestedStatus=bowelStatus;
      refreshPromise = (async () => {
        try {
          const { data, error } = await readFat("points_fat_v2_get_state",{p_bowel_status:requestedStatus});
          if (error) throw error;
          if (version !== readVersion) return false;
          const result = row(data);
          if (!result || typeof result.configured !== "boolean") throw new Error("Invalid state");
          if(statusSupported!==false)statusSupported=true;
          snapshot = { status:result.bowel_status || "unmarked", configured:result.configured, delta:hasDelta(result.delta_jin) ? Number(result.delta_jin) : null, recordedAt:result.recorded_at, count:Number(result.record_count || 0) };
          readError = false; initialized = true;
          return true;
        } catch (_) {
          if (version === readVersion) { readError = true; initialized = true; if (!silent && active()) ui.showToast("减脂数据同步失败，可点击重试"); }
          return false;
        } finally { renderHome(); refreshPromise = null; if (active()) void rewards?.refresh(); }
      })();
      return refreshPromise;
    }
    async function loadLogs(force=false) {
      if (!force && overviewFresh) { renderOverview(); return true; }
      if (logsPromise) return logsPromise;
      const version = logsVersion;
      q("fatOverviewStatus").textContent = "正在读取记录…";
      q("fatOverviewStatus").hidden = false;
      logsPromise = (async () => {
        try {
          const { data, error } = await readFat("points_fat_v2_get_logs", { p_from:null, p_to:null, p_limit:10000 });
          if (error) throw error;
          if (version !== logsVersion) return false;
          if (!Array.isArray(data)) throw new Error("Invalid logs");
          logs = data.filter(r => hasDelta(r.delta_jin) && Number.isFinite(Date.parse(r.created_at))).map(r => ({ id:String(r.id), delta:Number(r.delta_jin), at:r.created_at, status:r.bowel_status || "unmarked" })).sort((a,b) => Date.parse(a.at)-Date.parse(b.at) || a.id.length-b.id.length || a.id.localeCompare(b.id));
          logsError = false; overviewFresh = true;
          return true;
        } catch (_) { if (version === logsVersion) logsError = true; return false; }
        finally { logsPromise = null; renderOverview(); }
      })();
      return logsPromise;
    }
    function renderHome() {
      const isActive = active();
      syncStatuses();
      els.home.classList.toggle("fat-active",isActive);
      els.metricSwitch.classList.toggle("fat-switch-active",isActive);
      content.hidden = !isActive;
      q("fatRecordBtn").hidden = !verifiedAdmin;
      q("fatRecordBtn").disabled = saving || !snapshot?.configured || readError || statusSupported!==true || bowelStatus==="unmarked";
      rewards?.render();
      if (!isActive) return;
      const delta = snapshot?.delta;
      q("fatValueLabel").textContent = hasDelta(delta) ? (delta < 0 ? "已减去" : delta > 0 ? "增加了" : "体重持平") : "体重变化";
      q("fatValue").textContent = hasDelta(delta) ? number(delta) : "—";
      q("fatValue").style.fontSize = q("fatValue").textContent.length > 5 ? "clamp(34px,10vw,44px)" : "";
      q("fatValueUnit").textContent = unitName();
      q("fatValue").parentElement.classList.toggle("gain",Number(delta)>0);
      q("fatHomeTitle").textContent=`${statusLabel(bowelStatus)} · 相对设置里的初始体重`;
      q("fatHomeMeta").textContent = statusSupported===false?"分类功能尚未启用，暂时只读查看原记录": !initialized ? "正在同步减脂记录" : readError ? "同步失败 · 点击圆盘重试" : !snapshot?.configured ? (verifiedAdmin ? "请先在管理员设置中设置起始体重" : "等待管理员开始记录") : !hasDelta(delta) ? (verifiedAdmin ? "点击下方按钮，记录第一次体重" : "等待管理员记录体重") : `最近记录 ${stamp(snapshot.recordedAt)} · 共 ${snapshot.count} 次`;
    }
    function renderOverview() {
      syncStatuses();
      const isActive = active(); overview.hidden = !isActive;
      if (!isActive) return;
      els.scoreOverviewContent.hidden = true; els.wheelOverviewContent.hidden = true;
      els.overviewTitle.textContent = "减脂总览";
      els.overviewSubtitle.textContent = `${statusLabel(bowelStatus)} · 查看体重变化趋势与月度记录`;
      const section = state.overviewSection;
      q("fatLanding").hidden = !!section; q("fatContentSwitch").hidden = !section;
      q("fatTrendSection").hidden = section !== "trend"; q("fatCalendarSection").hidden = section !== "calendar";
      q("fatContentSwitch").querySelectorAll("[data-fat-section]").forEach(btn => {
        const selected = btn.dataset.fatSection === section;
        btn.classList.toggle("active",selected); btn.setAttribute("aria-selected",String(selected));
      });
      const truncated = logs.length >= 10000 && snapshot?.count > logs.length;
      q("fatOverviewStatus").hidden = !logsError && !truncated;
      q("fatOverviewStatus").textContent = logsError ? "记录同步失败 · 关闭总览后重新打开可重试" : "当前显示最近 10000 条记录，较早的月份可能不完整";
      if (section === "trend") { renderWeek(trendData(visibleLogs())); laterDraw(); }
      if (section === "calendar") renderCalendar();
    }
    function peekHeight() {
      const nav = q("fatLanding").querySelector(".overview-quick-nav");
      if (!q("fatLanding").hidden) {
        const rect = nav.getBoundingClientRect(), shell = els.overviewShell.getBoundingClientRect();
        const bottom = rect.bottom-shell.top+els.overviewShell.scrollTop+12;
        if (rect.height > 0 && Number.isFinite(bottom) && bottom > 12) landingPeekHeight = Math.ceil(bottom);
      }
      const shell = els.overviewShell;
      return Math.max(0,Math.min(landingPeekHeight,shell.scrollHeight || landingPeekHeight,shell.getBoundingClientRect().height || landingPeekHeight));
    }
    function chooseSection(section, expand=true) {
      if (!active() || !["trend","calendar"].includes(section)) return;
      state.overviewSection = section; renderOverview();
      if (expand) { ui.setOverviewMode("full"); els.overviewShell.scrollTop = 0; }
    }
    function activate() {
      state.activeMetric = "fat"; ui.renderPrimaryMetric(); ui.renderOverviewContentMode();
      void rewards?.refresh(true);
      void refresh({silent:false});
    }
    function renderWeek(data) {
      const [recent,previous] = data.weeks, change = data.change;
      const dateLabel = date => `${date.getMonth()+1}/${date.getDate()}`;
      const periodLabel = week => `${dateLabel(week.start)}—${dateLabel(shiftDay(week.end,-1))}`;
      const magnitude = change === null ? null : Math.abs(displayWeight(change));
      const rounded = magnitude === null ? null : Math.round((magnitude+Number.EPSILON)*100)/100;
      q("fatWeekDirection").textContent = change === null ? "暂无对比" : change !== 0 && rounded === 0 ? "变化小于" : rounded === 0 ? "基本持平" : change < 0 ? "记录均值下降" : "记录均值上升";
      q("fatWeekValue").textContent = rounded === null ? "—" : change !== 0 && rounded === 0 ? "0.01" : new Intl.NumberFormat("zh-CN",{minimumFractionDigits:2,maximumFractionDigits:2}).format(rounded);
      q("fatWeekUnit").textContent = unitName();
      q("fatWeekValue").classList.toggle("gain",change > 0);
      q("fatWeekCoverage").textContent = `近七天：${recent.count}/7 天记录 · 前七天：${previous.count}/7 天记录`;
      q("fatWeekDates").textContent = `近七天 ${periodLabel(recent)}（含今天）· 前七天 ${periodLabel(previous)}`;
      const coverage = Math.min(recent.count,previous.count);
      q("fatWeekNote").textContent = !coverage ? "两段都至少有一天记录后才能比较；缺少记录的日期不补值。" : coverage < 3 ? "记录较少，仅供参考。建议两段各至少记录三个不同日期，并分散在一周内。" : coverage < 5 ? "初步参考，按已有记录天数计算。每段尽量记录五至七天。" : "按已有记录天数计算。连续观察几周，比一次涨跌更能看清趋势。";
      let falling = 0;
      for (let i=0;i<data.weeks.length-1;i++) {
        const newer = data.weeks[i], older = data.weeks[i+1];
        if (newer.count < 3 || older.count < 3 || newer.mean >= older.mean-1e-9) break;
        falling++;
      }
      q("fatWeekLong").textContent = falling >= 2 ? `连续 ${falling} 次七日记录均值下降，体重趋势向下；仍需结合后续记录观察。` : "观察近四周的平均线，判断下降是否持续；单周变化也可能包含水分波动。";
    }
    function drawTrend() {
      if (!active() || state.overviewMode === "closed" || state.overviewSection !== "trend") return;
      const data = trendData(visibleLogs()); renderWeek(data);
      const start = shiftDay(data.today,1-Number(range));
      const points = data.daily.filter(p => p.date >= start);
      const averages = data.rolling.filter(p => p.date >= start);
      const values = [...points,...averages.filter(p => p.delta !== null)];
      q("fatChartEmpty").hidden = points.length > 0;
      q("fatChartEmpty").textContent = logsError ? "记录读取失败" : "这个时段暂无记录";
      q("fatChartCaption").textContent = `近 ${range} 天 · ${points.length} 天有记录 · 绿线每点使用此前七天（含当天）的记录`;
      q("fatTrendCanvas").setAttribute("aria-label",points.length ? `近${range}天体重差值趋势，${points.length}天有记录；灰点为每日首笔，绿线为七日记录均值。${q("fatWeekDirection").textContent} ${q("fatWeekValue").textContent} ${unitName()}` : "这个时段暂无记录");
      q("fatTrendRanges").querySelectorAll("[data-fat-range]").forEach(btn => {
        const selected = btn.dataset.fatRange === range;
        btn.classList.toggle("active",selected); btn.setAttribute("aria-pressed",String(selected));
      });
      const canvas = q("fatTrendCanvas"), rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1,3);
      canvas.width = Math.round(rect.width*dpr); canvas.height = Math.round(rect.height*dpr);
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,rect.width,rect.height);
      if (!points.length) return;
      let min = Math.min(...values.map(p => p.delta)), max = Math.max(...values.map(p => p.delta));
      const padding = Math.max(.5,(max-min)*.2); min -= padding; max += padding;
      const pad = {left:44,right:12,top:20,bottom:30};
      const w = Math.max(1,rect.width-pad.left-pad.right), h = Math.max(1,rect.height-pad.top-pad.bottom);
      // Calendar spacing stays even across daylight saving changes.
      const ordinal = d => Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000;
      const x = p => pad.left+(ordinal(p.date)-ordinal(start))/(Number(range)-1)*w;
      const y = p => pad.top + h - (p.delta-min)/(max-min)*h;
      const styles = getComputedStyle(document.documentElement);
      ctx.strokeStyle = styles.getPropertyValue("--hairline").trim(); ctx.lineWidth = 1;
      ctx.font='10px -apple-system,BlinkMacSystemFont,sans-serif'; ctx.textAlign="right"; ctx.textBaseline="middle";
      for (let i=0;i<3;i++) {
        const py=pad.top+h*i/2, value=max-(max-min)*i/2;
        ctx.beginPath(); ctx.moveTo(pad.left,py); ctx.lineTo(rect.width-pad.right,py); ctx.stroke();
        ctx.fillStyle=styles.getPropertyValue("--tertiary").trim();
        ctx.fillText(`${value < 0 ? "−" : value > 0 ? "+" : ""}${new Intl.NumberFormat("zh-CN",{maximumFractionDigits:2}).format(Math.abs(displayWeight(value)))}`,pad.left-5,py);
      }
      if (min <= 0 && max >= 0) {
        const zeroY = pad.top+h-(0-min)/(max-min)*h;
        ctx.setLineDash([3,4]); ctx.beginPath(); ctx.moveTo(pad.left,zeroY); ctx.lineTo(rect.width-pad.right,zeroY); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.fillStyle="#9aa6a0";
      points.forEach(p => { ctx.beginPath(); ctx.arc(x(p),y(p),2.8,0,Math.PI*2); ctx.fill(); });
      ctx.beginPath(); let connected = false;
      averages.forEach(p => {
        if (p.delta === null) { connected = false; return; }
        if (connected) ctx.lineTo(x(p),y(p)); else ctx.moveTo(x(p),y(p));
        connected = true;
      });
      ctx.strokeStyle="#638171"; ctx.lineWidth=2.5; ctx.lineJoin="round"; ctx.lineCap="round"; ctx.stroke();
      ctx.fillStyle="#638171";
      averages.filter(p => p.delta !== null).forEach(p => { ctx.beginPath(); ctx.arc(x(p),y(p),1.5,0,Math.PI*2); ctx.fill(); });
      ctx.textAlign="center";
      ctx.fillStyle=styles.getPropertyValue("--tertiary").trim(); ctx.textBaseline="top"; ctx.font='10px -apple-system,BlinkMacSystemFont,sans-serif';
      [start,shiftDay(start,Math.floor((Number(range)-1)/2)),data.today].forEach((date,i) => {
        ctx.textAlign=i===0?"left":i===2?"right":"center";
        ctx.fillText(`${date.getMonth()+1}/${date.getDate()}`,x({date}),rect.height-18);
      });
    }
    function renderCalendar() {
      const filtered=visibleLogs(), next=nextMonth(month), current=filtered.filter(r => new Date(r.at)>=month && new Date(r.at)<next);
      q("fatCalendarMonth").textContent=new Intl.DateTimeFormat("zh-CN",{year:"numeric",month:"long"}).format(month);
      q("fatMonthCount").textContent=`${current.length} 次`;
      const preceding=filtered.filter(r => new Date(r.at)<month).at(-1);
      const before=preceding || current[0];
      const enough=current.length>1 || (current.length>0 && preceding);
      const monthDelta=enough ? Math.round((current.at(-1).delta-before.delta)*100)/100 : null;
      q("fatMonthChange").textContent=monthDelta===null ? (current.length?"尚需更多记录":"暂无记录") : monthDelta<0?`减少 ${number(monthDelta)} ${unitName()}`:monthDelta>0?`增加 ${number(monthDelta)} ${unitName()}`:"保持不变";
      const byDay=new Map(); current.forEach(r => byDay.set(key(new Date(r.at)),r));
      const grid=q("fatCalendarGrid"); grid.replaceChildren();
      const blanks=month.getDay(), total=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
      const cells=Math.ceil((blanks+total)/7)*7;
      for (let i=0;i<cells;i++) {
        const day=i-blanks+1;
        if (day<1 || day>total) { const blank=document.createElement("div"); blank.className="day placeholder"; grid.append(blank); continue; }
        const date=new Date(month.getFullYear(),month.getMonth(),day), dayKey=key(date), record=byDay.get(dayKey);
        const button=document.createElement("button"); button.type="button"; button.className="day pressable";
        if (dayKey===key(new Date())) button.classList.add("today");
        if (dayKey===selectedDay) button.classList.add("selected");
        button.setAttribute("aria-label",`${date.getMonth()+1}月${day}日，${record?difference(record.delta):"暂无记录"}`);
        const label=document.createElement("span"); label.className="day-number"; label.textContent=day; button.append(label);
        if (record) { const badge=document.createElement("span"); badge.className=`fat-day-delta${record.delta>0?" gain":record.delta===0?" flat":""}`; badge.textContent=deltaNumber(record.delta); button.append(badge); }
        button.addEventListener("click",() => { selectedDay=selectedDay===dayKey?null:dayKey; renderCalendar(); });
        grid.append(button);
      }
      const detail=q("fatDayDetail"); detail.classList.toggle("hidden",!selectedDay);
      const list=q("fatDayList"); list.replaceChildren();
      if (!selectedDay) return;
      const [year,m,d]=selectedDay.split("-").map(Number);
      q("fatDayTitle").textContent=`${m}月${d}日的体重变化`;
      const records=current.filter(r => key(new Date(r.at))===selectedDay);
      if (!records.length) { const empty=document.createElement("li"); empty.className="empty-state"; empty.textContent="当天暂无体重记录"; list.append(empty); }
      records.forEach(r => {
        const item=document.createElement("li"); item.className="log-row";
        const mark=document.createElement("div"); mark.className="log-icon"; mark.textContent=r.delta<0?"↘":r.delta>0?"↗":"—";
        const copy=document.createElement("div"); copy.className="log-copy";
        const title=document.createElement("div"); title.className="log-reason"; title.textContent=`${statusLabel(r.status)}体重记录`;
        const meta=document.createElement("span"); meta.className="log-meta"; meta.textContent=stamp(r.at);
        copy.append(title,meta);
        const delta=document.createElement("div"); delta.className=`fat-log-delta${r.delta>0?" gain":""}`; delta.textContent=difference(r.delta);
        const actions=document.createElement("div"); actions.className="fat-log-actions"; actions.append(delta);
        if (verifiedAdmin) {
          const remove=document.createElement("button"); remove.type="button"; remove.className="fat-delete-button pressable";
          remove.textContent="删除"; remove.disabled=saving;
          remove.setAttribute("aria-label",`删除 ${stamp(r.at)} 的体重记录`);
          remove.addEventListener("click",()=>openDeleteDialog(r)); actions.append(remove);
        }
        item.append(mark,copy,actions); list.append(item);
      });
    }
    function openDeleteDialog(record) {
      if (!verifiedAdmin || saving || !record || !/^[1-9]\d*$/.test(record.id)) return;
      clearSecrets(); mode="delete"; deleteTarget={...record};
      q("fatWeightFields").hidden=true;
      q("fatWeightTitle").textContent="删除体重记录";
      q("fatWeightMessage").textContent=`${stamp(record.at)} · ${difference(record.delta)}。确定删除这条记录？`;
      q("fatWeightNote").textContent="删除后，首页差值、趋势和月度总览会重新计算。这条记录无法恢复。";
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
        readVersion++; logsVersion++; overviewFresh=false;
        await Promise.all([refreshPromise,logsPromise].filter(Boolean));
        logs=logs.filter(record=>record.id!==target.id);
        if (snapshot) {
          const count=Math.max(0,snapshot.count-(data===false?0:1)), last=visibleLogs().at(-1);
          snapshot={...snapshot,count,delta:last?.delta??null,recordedAt:last?.at??null};
        }
        if (auth!==authVersion || !verifiedAdmin) return;
        closeDialog(); renderHome(); renderOverview();
        const synced=await refresh({silent:true}), logsSynced=await loadLogs(true);
        await rewards?.refresh(true);
        ui.showToast(synced && logsSynced ? (data===false?"这条记录已不存在，数据已同步":"体重记录已删除") : "已删除，数据同步暂未完成，请稍后刷新");
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
      clearSecrets(); mode=nextMode;recordStatus=["before","after"].includes(bowelStatus)?bowelStatus:"after";
      syncStatuses();
      deleteTarget=null; q("fatWeightFields").hidden=false;
      const starting=mode==="starting";
      q("fatWeightTitle").textContent=starting?"起始体重":"记录体重";
      q("fatWeightLabel").textContent=starting?"起始体重":"本次体重";
      q("fatWeightMessage").textContent=starting?"正在读取已设置的体重…":"记录后自动计算体重变化";
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
        const name=savingMode==="starting"?"points_fat_admin_set_starting_weight":"points_fat_v2_admin_record_weight";
        const args=savingMode==="starting"?{p_weight_jin:value}:{p_weight_jin:value,p_bowel_status:recordStatus};
        const {data,error}=await db.rpc(name,args);
        if (error) throw error;
        readVersion++; logsVersion++; overviewFresh=false;
        await Promise.all([refreshPromise,logsPromise].filter(Boolean));
        if (auth!==authVersion || !verifiedAdmin) return;
        if (savingMode==="record") {
          bowelStatus=recordStatus;snapshot=null;initialized=false;
        }
        closeDialog();
        const synced=await refresh({silent:true});
        await rewards?.refresh(true);
        if (state.overviewMode!=="closed" && active()) await loadLogs(true);
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
    document.querySelectorAll("[data-fat-record-status]").forEach(button=>button.addEventListener("click",()=>{if(!saving){recordStatus=button.dataset.fatRecordStatus;syncStatuses();}}));
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
      await rewards?.refresh(true);
      if (state.overviewMode!=="closed") await loadLogs(true);
      if (synced) ui.showToast("已同步减脂记录");
      } finally { q("fatRefreshBtn").classList.remove("refreshing"); }
    }
    q("fatRefreshBtn").addEventListener("click",()=>void manualRefresh());
    q("fatRefreshBtn").addEventListener("keydown",event=>{ if (["Enter"," "].includes(event.key)) { event.preventDefault(); void manualRefresh(); } });
    els.overviewBtn.addEventListener("click",event=>{
      if (!active()) return;
      event.stopImmediatePropagation(); ui.vibrate(8); ui.openOverviewSheet(); void loadLogs(true);
    },true);
    overview.addEventListener("click",event=>{ const btn=event.target.closest("[data-fat-section]"); if (btn) { ui.vibrate(6); chooseSection(btn.dataset.fatSection); } });
    q("fatTrendRanges").addEventListener("click",event=>{ const btn=event.target.closest("[data-fat-range]"); if (btn && ["14","28","90"].includes(btn.dataset.fatRange)) { range=btn.dataset.fatRange; laterDraw(); } });
    q("fatPrevMonth").addEventListener("click",()=>{ month=nextMonth(month,-1); selectedDay=null; renderCalendar(); });
    q("fatNextMonth").addEventListener("click",()=>{ month=nextMonth(month); selectedDay=null; renderCalendar(); });
    function resizeOverview() {
      if (active() && state.overviewMode !== "closed") els.overviewShell.style.setProperty("--peek-height",`${peekHeight()}px`);
      laterDraw();
    }
    window.addEventListener("resize",resizeOverview,{passive:true});
    window.visualViewport?.addEventListener("resize",resizeOverview,{passive:true});
    try {
      if (!window.PointsFatRewards) throw new Error("Rewards module missing");
      rewards = window.PointsFatRewards.attach({db,state,els,ui,isAdmin:()=>verifiedAdmin});
    } catch (_) { window.PointsRuntime?.report("rewards"); }
    syncUnits(); adminRendered(); renderHome();
    return { activate, refresh, renderHome, renderOverview, adminRendered, draw:laterDraw, chooseSection, loadLogs, peekHeight };
  }
})();
