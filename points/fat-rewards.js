/* Diamond rewards are separate from points and wheel rewards. All writes use transactional RPCs. */
(() => {
  "use strict";
  window.PointsFatRewards = { attach };

  function attach({db, state, els, ui, isAdmin, formatChange}) {
    const q = id => document.getElementById(id);
    const active = () => state.activeMetric === "fat";
    const role = () => isAdmin() ? `admin:${state.session?.user?.id}` : state.session ? "verifying" : "guest";
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const stamp = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(value)) : "—";
    const change = value => formatChange ? formatChange(value) : value === null || value === undefined ? "暂无对比" : Number(value) === 0 ? "均重持平" : `均重${Number(value) < 0 ? "下降" : "上升"} ${Math.abs(Number(value)) < .01 ? "不足 0.01" : Math.abs(Number(value)).toFixed(2)} 斤`;
    const signed = value => `${Number(value) > 0 ? "+" : ""}${value}`;
    const bowelLabel=value=>value==="before"?"未排便":value==="after"?"已排便":"历史未标注";
    const labels = {pending_service:"等待宝宝进行服务", pending_confirmation:"宝宝已经进行服务，等待哥哥确认", completed:"本次服务兑换完毕", returned:"哥哥未确认，已退回背包"};
    let data = null, error = "", lastRead = 0, generation = 0, inflight = null, busy = false;
    let roleKey = role(), page = "shop", shopView = "products", confirmation = null, previousFocus = null;
    let services = [], more = false, paging = false, detailView = null;
    let drag = null, suppressClickUntil = 0;
    const operations = new Map();
    const diamond = '<svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M11 9h26l8 12-21 24L3 21 11 9Z"/><path d="m11 9 7 12 6-12 6 12 7-12M3 21h42M18 21l6 24 6-24"/></svg>';

    els.home.querySelector(".fat-home-actions").insertAdjacentHTML("beforeend", `
      <button class="fat-record-button pressable" id="fatDiamondShopBtn" type="button" hidden>钻石商城</button>
      <button class="fat-record-button pressable fat-settlement-button" id="fatSettlementBtn" type="button">钻石结算</button>
      <button class="fat-record-button pressable" id="fatServicesBtn" type="button">服务详情</button>
      <div class="fat-diamond-summary" id="fatDiamondSummary" aria-live="polite" hidden></div>
      <button class="fat-service-notice pressable" id="fatServiceNotice" type="button" hidden></button>`);
    document.querySelector("main.app").insertAdjacentHTML("beforeend", `
      <div class="modal-layer fat-reward-layer" id="fatRewardLayer" aria-hidden="true">
        <section class="unified-sheet shop-sheet fat-reward-sheet" id="fatRewardSheet" role="dialog" aria-modal="true" aria-labelledby="fatRewardTitle" tabindex="-1">
          <header class="unified-sheet-header shop-sheet-header fat-reward-header" id="fatRewardHeader">
            <div class="fat-reward-grabber" id="fatRewardGrabber" role="button" tabindex="0" aria-label="下拉关闭减脂奖励"><div class="grabber" aria-hidden="true"></div></div>
            <h2 class="sheet-title" id="fatRewardTitle">钻石商城</h2>
          </header><div class="unified-sheet-body shop-sheet-body">
          <div class="fat-reward-error" id="fatRewardError" role="alert" hidden></div>
          <div id="fatRewardBody"></div>
          </div>
        </section>
      </div>`);
    const layer = q("fatRewardLayer"), body = q("fatRewardBody");
    const sheet = q("fatRewardSheet"), header = q("fatRewardHeader");
    const focusPanel = () => sheet.focus({preventScroll:true});
    const actionButton = (action, title, disabled=false, id="") => `<button class="shop-inventory-action fat-reward-button pressable" data-fat-reward-action="${action}"${id ? ` data-request-id="${escape(id)}"` : ""} type="button"${disabled || busy ? " disabled" : ""}>${title}</button>`;
    const admin = () => roleKey.startsWith("admin:");
    function resetDrag() {
      const previous = drag; drag = null;
      if (previous?.raf) cancelAnimationFrame(previous.raf);
      if (previous) { try { header.releasePointerCapture(previous.pointerId); } catch (_) {} }
      layer.classList.remove("dragging"); sheet.style.transform = "";
      return previous;
    }
    function operation(kind) {
      const storageKey = `points_fat_operation:${roleKey}:${kind}`;
      if (!operations.has(storageKey)) {
        let value = null;
        try { value = localStorage.getItem(storageKey); } catch (_) {}
        if (!/^[0-9a-f-]{36}$/i.test(value || "")) value = crypto.randomUUID();
        operations.set(storageKey, value);
        try { localStorage.setItem(storageKey, value); } catch (_) {}
      }
      return {storageKey, value:operations.get(storageKey)};
    }
    function hasRetry(kind) {
      const key = `points_fat_operation:${roleKey}:${kind}`;
      try { return operations.has(key) || !!localStorage.getItem(key); } catch (_) { return operations.has(key); }
    }
    function clearOperation(op) {
      operations.delete(op.storageKey);
      try { localStorage.removeItem(op.storageKey); } catch (_) {}
    }
    function close() {
      if (busy) return;
      resetDrag();
      ui.setLayer(layer, false); confirmation = null; detailView = null;
      if (previousFocus?.isConnected && active()) previousFocus.focus();
    }
    async function open(next) {
      if (!active() || roleKey === "verifying" || (next === "shop" && !admin())) return;
      previousFocus = document.activeElement; page = next; shopView = "products"; confirmation = null; detailView = next === "settlement" ? "progress" : null;
      resetDrag(); sheet.scrollTop = 0;
      ui.setLayer(layer, true); render(); focusPanel();
      await refresh(true);
    }
    function describeError(e) {
      const text = `${e?.code || ""} ${e?.message || ""}`;
      if (/PGRST202|schema cache|Could not find/i.test(text)) return "钻石功能尚未部署，请先执行减脂奖励 SQL。";
      if (/42501|JWT|permission/i.test(text)) return "身份权限已变化，请重新登录或以游客身份打开。";
      if (/Insufficient diamonds/i.test(text)) return "钻石不足，需要 1 颗钻石。";
      if (/Empty backpack/i.test(text)) return "背包没有可用次数，请重新打开商城查看。";
      if (/awaiting confirmation|Request not found|Operation conflict/i.test(text)) return "这条请求状态已变化，请重新打开服务详情查看。";
      return "网络异常，结果尚未确认；请重试原操作，系统会避免重复扣费。";
    }
    function accept(result, append=false) {
      if (!result || result.admin !== admin() || !Array.isArray(result.services)) throw new Error("Invalid reward state");
      if (append) {
        const byId = new Map(services.map(r => [r.id, r]));
        result.services.forEach(r => byId.set(r.id, r)); services = [...byId.values()];
      } else services = result.services;
      // Reopening often receives identical state. Keep the existing DOM during the slide animation.
      const changed = append || error || JSON.stringify(data) !== JSON.stringify(result);
      more = result.more; data = result; error = ""; lastRead = Date.now();
      body.dataset.pointsSynced = 'true';
      if (changed) render();
    }
    async function refresh(force=false) {
      if (!active() || roleKey === "verifying" || busy) return false;
      if (inflight) return inflight;
      if (!force && data && Date.now() - lastRead < 15000) return true;
      const version = generation;
      body.dataset.pointsSynced = 'false';
      const request = (async () => {
        try {
          const {data:result, error:e} = await db.rpc("points_fat_reward_get_state");
          if (version !== generation) return false;
          if (e) throw e;
          accept(result); return true;
        } catch (e) { if (version === generation) { error = describeError(e); render(); } return false; }
        finally { if (inflight === request) inflight = null; }
      })();
      inflight = request; return request;
    }
    async function loadMore() {
      if (paging || busy || !more || !services.length) return;
      paging = true; render(); const version = generation;
      try {
        const {data:result, error:e} = await db.rpc("points_fat_reward_get_state", {p_before:services[services.length-1].id});
        if (version !== generation) return;
        if (e) throw e; accept(result, true);
      } catch (e) { if (version === generation) error = describeError(e); }
      finally { paging = false; render(); }
    }
    async function mutate(action, id) {
      if (busy || !data || roleKey === "verifying") return;
      const exchanging = action === "buy" || action === "use";
      if ((exchanging || action === "confirm" || action === "return") && !admin()) return;
      if (action === "serviced" && roleKey !== "guest") return;
      const op = exchanging ? operation(action) : null;
      busy = true; error = ""; render();
      // Ignore any earlier read that could overwrite a successful write's response.
      generation++; inflight = null; const mutationVersion = generation;
      try {
        const rpc = exchanging ? "points_fat_reward_admin_exchange" : action === "serviced" ? "points_fat_reward_guest_serviced" : "points_fat_reward_admin_resolve";
        const args = exchanging ? {p_kind:action, p_operation_id:op.value} : action === "serviced" ? {p_request_id:id} : {p_request_id:id, p_confirm:action === "confirm"};
        const {data:result, error:e} = await db.rpc(rpc, args);
        if (e) throw e;
        if (mutationVersion !== generation) { if (op) clearOperation(op); return; }
        confirmation = null; accept(result);
        if (op) clearOperation(op);
        ui.showToast({buy:"兑换成功，口一次已放入背包", use:"已发起请求，等待宝宝进行服务", serviced:"已进行服务，等待哥哥确认", confirm:"已确认，本次服务兑换完毕", return:"已退回背包，下次可再次使用"}[action]);
        ui.vibrate(12);
      } catch (e) {
        // Definitive business errors did not commit. Ambiguous network errors retain the UUID, even across reloads.
        if (op && e?.code && !/^(08|PGRST00|APP_)/.test(e.code)) clearOperation(op);
        if (mutationVersion === generation) { error = describeError(e); confirmation = null; }
      } finally {
        busy = false; render();
        if (layer.classList.contains("open")) focusPanel();
        if (!data && active()) void refresh();
      }
    }
    function condition(p) {
      if (!p) return "结算数据待同步";
      if (p.eligible) return "已满足结算条件";
      if (p.reference_available === false && p.comparison_basis === "starting_weight") return "等待管理员设置起始体重";
      if (!Number(p.current_days) && !Number(p.previous_days) && p.reference_available === false) return "还没有可比较的记录";
      if (p.comparison_basis !== "starting_weight" && Number(p.previous_days) < 3) return "上周记录不足，本周暂不奖扣";
      const missing = Math.max(0, 3 - Number(p.current_days || 0));
      return missing ? `本周还差 ${missing} 个有效记录日` : "缺少比较基准，本周暂不奖扣";
    }
    function progressSummary() {
      const p = data?.preview;
      if (!p) return "结算数据待同步";
      if (p.settled) return `本周已结算 ${signed(p.applied_delta ?? data.weeks?.find(w=>w.week===p.week)?.applied_delta ?? 0)} ◇`;
      return p.eligible ? `本周预计 ${signed(p.calculated_delta)} ◇` : condition(p);
    }
    function weekLabel(week) {
      const d = new Date(week + "T00:00:00+08:00");
      if (!Number.isFinite(d.getTime())) return "日期待同步";
      const start = stamp(d.toISOString()).split(" ")[0];
      d.setUTCDate(d.getUTCDate() + 6);
      return `${start}–${stamp(d.toISOString()).split(" ")[0]}`;
    }
    function evidence(p) {
      return `<dl class="fat-reward-stat-list"><div><dt>有效记录</dt><dd>本周 ${escape(p.current_days)} 天${p.comparison_basis==="starting_weight"?"":` · 上周 ${escape(p.previous_days)} 天`}</dd></div><div><dt>比较基准</dt><dd>${p.comparison_basis==="starting_weight"?"首周对比起始体重":"同类记录的两周均重"}</dd></div><div><dt>均重变化</dt><dd>${escape(change(p.change_jin))}</dd></div></dl>`;
    }
    function renderRewardDetails() {
      const p = data.preview;
      const tabs = `<nav class="shop-tabs fat-settlement-tabs" role="tablist" aria-label="钻石结算内容">${[["progress","本周"],["history","历史"],["rules","规则"]].map(([view,title])=>`<button class="shop-tab pressable${view===detailView?" active":""}" data-fat-reward-action="${view}" role="tab" aria-selected="${view===detailView}" type="button">${title}</button>`).join("")}</nav>`;
      if (!p) return `${tabs}<div class="fat-reward-card"><h3>结算详情暂未开放</h3><p>请管理员执行本次结算增量 SQL，再同步查看。</p>${actionButton("refresh","重新同步")}</div>`;
      if (detailView === "progress") {
        const settled = p.settled === true;
        const actual = p.applied_delta ?? data.weeks?.find(w=>w.week===p.week)?.applied_delta;
        const result = settled ? actual : p.eligible ? p.calculated_delta : null;
        const selected = p.bowel_status ? bowelLabel(p.bowel_status) : "";
        const reason = settled ? p.eligible ? "本周结果已固定" : "本周未奖扣" : condition(p);
        const cutoff = settled ? data.weeks?.find(w=>w.week===p.week)?.cutoff : data.next_cutoff;
        const next = data.next_cutoff;
        return `${tabs}<section class="fat-reward-card fat-settlement-result"><p class="fat-settlement-period">${escape(weekLabel(p.week))}</p><span class="fat-settlement-label">${settled?"本周实际结算":"本周预计"}</span><strong class="fat-settlement-value${Number(result)<0?" deduction":""}">${result===null?"—":escape(signed(result))}<small>◇</small></strong><p class="fat-settlement-condition">${escape(reason)}</p><div class="fat-settlement-meta">${selected?`<span>${escape(selected)} · ${escape(p.current_days)} 个有效记录日</span>`:""}<span>${settled?`下次结算 ${escape(stamp(next))}`:`${escape(stamp(cutoff))} 结算 · 北京时间`}</span></div>${!settled&&p.eligible?'<p class="fat-settlement-footnote">预计尚未到账，以结算时的记录为准</p>':""}${settled&&actual!==undefined&&Number(actual)!==Number(p.calculated_delta)?`<p class="fat-settlement-footnote">原应 ${escape(signed(p.calculated_delta))} ◇，余额不足，仅扣剩余钻石</p>`:""}</section><details class="fat-reward-card fat-settlement-evidence"><summary>计算依据<span aria-hidden="true">＋</span></summary>${evidence(p)}${!p.bowel_status?`<p>${escape(condition(p))}</p>`:""}${(p.series||[]).filter(x=>x.bowel_status!==p.bowel_status).map(x=>`<details class="fat-settlement-other"><summary>${escape(bowelLabel(x.bowel_status))}${p.bowel_status?" · 未采用":""}</summary><p>${escape(condition(x))}</p>${evidence(x)}</details>`).join("")}<p class="fat-settlement-footnote">每周只结算一类；达标类别按有效记录日数选择，相同优先已排便。</p></details>`;
      }
      if (detailView === "history") return `${tabs}${(data.weeks||[]).map(w=>`<details class="fat-reward-card fat-reward-history"><summary><span>${escape(weekLabel(w.week))}<small>${w.eligible?"已结算":"未奖扣"}</small></span><strong>${escape(signed(w.applied_delta))} ◇</strong></summary><div class="fat-reward-history-detail"><p>${w.rule_version===2?(w.bowel_status?escape(bowelLabel(w.bowel_status)):"无达标类别"):"旧版结算"}</p>${evidence(w)}${w.applied_delta!==w.calculated_delta?`<p>原应 ${escape(signed(w.calculated_delta))} ◇，余额不足</p>`:""}<p class="fat-settlement-footnote">${escape(stamp(w.cutoff))} · 结算后余额 ${escape(w.balance_after)} ◇</p></div></details>`).join("")||'<p class="fat-reward-empty">还没有结算记录</p>'}`;
      return `${tabs}<div class="fat-reward-rules"><section class="fat-reward-card"><h3>每周日 12:00 结算</h3><p>北京时间。每周结算一次，钻石余额最低为 0。</p></section><section class="fat-reward-card"><h3>下降奖，上升扣</h3><p>均重下降满 1 斤（0.5 公斤）奖励 1 ◇，不足不奖励。</p><p>上升不足 1 斤扣 1 ◇；达到 1 斤按整斤扣。持平不奖扣。</p></section><details class="fat-reward-card fat-settlement-evidence"><summary>记录与比较方式<span aria-hidden="true">＋</span></summary><p>未排便、已排便分别统计，同类每天取最早一笔，漏记不补值。</p><p>每类首周记录至少 3 天，对比同一个起始体重；以后本周和上周各至少 3 天。</p><p>两类都达标时，采用本周有效记录日更多的一类，相同优先已排便，不按奖励多少选择。</p></details><details class="fat-reward-card fat-settlement-evidence"><summary>截止时间与历史结果<span aria-hidden="true">＋</span></summary><p>统计本周一至周日 12:00 前的记录；截止后的记录不计入本周，也不移到下周。</p><p>结算后补录、删除记录或修改起始体重不改变已结算奖扣。下周沿用上周结算时的均重。</p></details>${data.status_rules!==2?'<p class="fat-reward-empty">当前仍使用旧版规则，请管理员确认分类升级。</p>':""}</div>`;
    }
    function serviceCard(request) {
      const statuses = {pending_service:"待服务", pending_confirmation:"待确认", completed:"已完成", returned:"已退回"};
      return `<article class="fat-reward-card fat-reward-service-card"><div class="fat-reward-service-head"><h3>口一次</h3><span class="fat-reward-status" title="${escape(labels[request.status] || "状态待同步")}">${statuses[request.status] || "待同步"}</span></div><p>${escape(stamp(request.requested_at))} · #${escape(request.id)}</p><div class="fat-reward-actions">${request.status === "pending_service" && !admin() ? actionButton("serviced", "已进行服务", false, request.id) : request.status === "pending_confirmation" && admin() ? `${actionButton("confirm", "确认完成", false, request.id)}${actionButton("return", "退回背包", false, request.id)}` : ""}</div><details class="fat-reward-service-times"><summary>时间详情</summary><p>请求：${escape(stamp(request.requested_at))}</p>${request.serviced_at ? `<p>已服务：${escape(stamp(request.serviced_at))}</p>` : ""}${request.resolved_at ? `<p>处理：${escape(stamp(request.resolved_at))}</p>` : ""}</details></article>`;
    }
    function render() {
      body.dataset.updatesView = '';
      const isActive = active(), isAdministrator = admin();
      els.home.classList.toggle("fat-rewards-admin", isActive && isAdministrator);
      q("fatDiamondShopBtn").hidden = !isAdministrator;
      q("fatServicesBtn").hidden = isAdministrator;
      q("fatDiamondShopBtn").disabled = busy;
      q("fatServicesBtn").disabled = busy || roleKey === "verifying";
      q("fatDiamondSummary").hidden = !isAdministrator;
      q("fatSettlementBtn").disabled = busy || roleKey === "verifying";
      q("fatDiamondSummary").textContent = data ? `◇ ${data.diamonds} 颗钻石 · 背包 ${data.backpack} 次` : error ? "钻石待同步 · 打开商城重试" : "正在同步钻石";
      const pending = Number(data?.pending_confirmation || 0);
      q("fatServiceNotice").hidden = !isAdministrator || !pending;
      q("fatServiceNotice").textContent = `宝宝已经进行服务，是否确认？（${pending} 次）`;
      if (!isActive && layer.classList.contains("open") && !busy) close();
      if (!layer.classList.contains("open")) return;
      q("fatRewardTitle").textContent = page === "settlement" ? "钻石结算" : page === "services" ? "服务详情" : "钻石商城";
      q("fatRewardGrabber").setAttribute("aria-disabled",String(busy));
      q("fatRewardError").hidden = !error; q("fatRewardError").textContent = error;
      if (!data) { body.innerHTML = '<p class="fat-reward-empty">等待同步奖励数据</p>'; return; }
      const tabs = [["products","商品",0],["inventory","背包",data.backpack],["services","服务",pending]];
      const navigation = isAdministrator && page !== "settlement" ? `<section class="fat-reward-wallet" aria-label="钻石余额"><strong><span aria-hidden="true">${diamond}</span>${escape(data.diamonds)}</strong><span>我的钻石</span></section><nav class="shop-tabs fat-reward-tabs" role="tablist" aria-label="减脂奖励页面">${tabs.map(([action,title,count]) => `<button class="shop-tab pressable${(action === "services" ? page === "services" : page === "shop" && shopView === action) ? " active" : ""}" data-fat-reward-action="${action}" role="tab" aria-selected="${action === "services" ? page === "services" : page === "shop" && shopView === action}" type="button"${busy ? " disabled" : ""}>${title}${Number(count) > 0 ? `<span class="fat-reward-tab-count">${escape(count)}</span>` : ""}</button>`).join("")}</nav>` : "";
      if (page === "settlement") { body.dataset.updatesView='fat'; body.innerHTML=renderRewardDetails()+`<div id="fatSettlementUpdatesSlot" data-points-synced="${body.dataset.pointsSynced}"></div>`; return; }
      if (confirmation) {
        const {action,id} = confirmation;
        const message = {buy:hasRetry("buy") ? "确认上次兑换的结果，不会重复扣钻石。" : "花费 1 颗钻石兑换口一次，放入背包。", use:hasRetry("use") ? "确认上次使用的结果，不会重复发起服务。" : "使用背包中的口一次，向宝宝发起服务请求。", serviced:"确认已经进行本次服务，并交给哥哥确认？", confirm:"确认宝宝已经进行服务，完成本次兑换？", return:"选择否：将口一次退回背包，之后可以重新发起请求。"}[action];
        body.innerHTML = `${navigation}<div class="fat-reward-card fat-reward-confirm"><h3>${{buy:"确认兑换",use:"使用奖励",serviced:"确认已服务",confirm:"确认完成",return:"退回背包"}[action]}</h3><p>${message}</p><div class="fat-reward-actions">${actionButton("submit", busy ? "正在处理…" : "确认", false, id)}${actionButton("cancel", "返回")}</div></div>`; return;
      }
      if (page === "shop") {
        if (detailView) { body.dataset.updatesView='fat';body.innerHTML = renderRewardDetails(); return; }
        if (shopView === "inventory") {
          body.innerHTML = `${navigation}<div class="shop-inventory-row fat-reward-inventory"><div class="shop-inventory-icon shop-theme-potion">${diamond}</div><div class="shop-inventory-copy"><strong>口 × ${escape(data.backpack)}</strong><small>使用后发起服务请求</small></div>${actionButton("use", hasRetry("use") ? "重试使用" : "使用", !hasRetry("use") && data.backpack < 1)}</div>${data.backpack < 1 && !hasRetry("use") ? '<p class="fat-reward-empty">兑换的奖励会保存在这里</p>' : ""}`;
          return;
        }
        const canBuy = hasRetry("buy") || data.diamonds >= 1;
        body.dataset.updatesView = 'fat';
        body.innerHTML = `${navigation}<section class="fat-reward-product"><div class="fat-reward-product-top"><div class="fat-reward-product-art">${diamond}</div><div class="fat-reward-product-copy"><h3>口一次</h3><p>兑换后存入背包</p></div></div><div class="fat-reward-product-bottom"><strong>◇ 1 <span>颗钻石</span></strong>${actionButton("buy", hasRetry("buy") ? "重试兑换" : canBuy ? "兑换" : "钻石不足", !canBuy)}</div></section><button class="fat-reward-progress-link pressable" data-fat-reward-action="progress" type="button"><span>${escape(progressSummary())}</span><span>详情 <span aria-hidden="true">›</span></span></button>`;
      } else {
        body.dataset.updatesView = 'services';
        const pendingRows = services.filter(r => ["pending_service","pending_confirmation"].includes(r.status));
        const historyRows = services.filter(r => !["pending_service","pending_confirmation"].includes(r.status));
        body.innerHTML = `${navigation}<p class="fat-reward-caption">待服务 ${escape(data.pending_service)} 次 · 待确认 ${escape(data.pending_confirmation)} 次</p>${pendingRows.map(serviceCard).join("") || '<p class="fat-reward-empty">暂无待处理请求</p>'}${historyRows.length ? `<details class="fat-reward-service-history"><summary>历史记录 · ${historyRows.length}</summary>${historyRows.map(serviceCard).join("")}</details>` : ""}${more ? actionButton("more", paging ? "正在加载…" : "查看更早请求", paging) : ""}`;
      }
    }
    function roleChanged() {
      const next = role();
      if (next !== roleKey) {
        roleKey = next; generation++; data = null; services = []; more = false; error = ""; lastRead = 0; inflight = null; confirmation = null; detailView = null;
        resetDrag(); ui.setLayer(layer, false); body.replaceChildren(); operations.clear();
      }
      render(); if (active()) void refresh();
    }
    body.addEventListener("click", event => {
      const button = event.target.closest("[data-fat-reward-action]");
      if (!button || busy) return;
      const action = button.dataset.fatRewardAction, id = button.dataset.requestId;
      if (action === "refresh") { void refresh(true); return; }
      if (["products","inventory"].includes(action) && !admin()) return;
      if (["products","inventory","services"].includes(action)) { page = action === "services" ? "services" : "shop"; if (page === "shop") shopView = action; confirmation = null; detailView = null; sheet.scrollTop = 0; render(); }
      else if (["progress","rules","history"].includes(action)) { detailView = action; page = "settlement"; shopView = "products"; sheet.scrollTop = 0; render(); }
      else if (action === "more") void loadMore();
      else if (action === "cancel") { confirmation = null; render(); }
      else if (action === "submit" && confirmation) void mutate(confirmation.action, confirmation.id);
      else if (["buy","use","serviced","confirm","return"].includes(action)) { confirmation = {action,id}; render(); }
      focusPanel();
    });
    q("fatSettlementBtn").addEventListener("click", () => void open("settlement"));
    q("fatDiamondShopBtn").addEventListener("click", () => void open("shop"));
    q("fatServicesBtn").addEventListener("click", () => void open("services"));
    q("fatServiceNotice").addEventListener("click", () => void open("services"));
    header.addEventListener("pointerdown", e => {
      if (busy || drag || !layer.classList.contains("open") || e.isPrimary === false || e.button !== 0) return;
      drag = {pointerId:e.pointerId, startY:e.clientY, startTime:performance.now(), pendingY:e.clientY, height:sheet.getBoundingClientRect().height, moving:false, raf:0};
      try { header.setPointerCapture(e.pointerId); } catch (_) {}
    });
    header.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dy = e.clientY - drag.startY;
      if (!drag.moving && dy < 7) return;
      if (!drag.moving) { drag.moving = true; layer.classList.add("dragging"); }
      drag.pendingY = e.clientY; e.preventDefault();
      if (!drag.raf) drag.raf = requestAnimationFrame(() => {
        if (!drag) return;
        drag.raf = 0;
        sheet.style.transform = `translate3d(0,${Math.min(drag.height,Math.max(0,drag.pendingY-drag.startY)*.96)}px,0)`;
      });
    }, {passive:false});
    function endDrag(e) {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const previous = resetDrag();
      if (!previous.moving) return;
      suppressClickUntil = performance.now() + 240;
      const dy = e.clientY - previous.startY, velocity = dy / Math.max(1,performance.now()-previous.startTime);
      if (e.type === "pointerup" && (dy > 76 || (dy > 24 && velocity > .42))) close();
    }
    header.addEventListener("pointerup", endDrag);
    header.addEventListener("pointercancel", endDrag);
    header.addEventListener("lostpointercapture", () => { if (drag) resetDrag(); });
    q("fatRewardGrabber").addEventListener("keydown", e => { if (["Enter"," "].includes(e.key)) { e.preventDefault(); close(); } });
    layer.addEventListener("click", e => {
      if (performance.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.target === layer) close();
    }, true);
    document.addEventListener("keydown", e => {
      if (!layer.classList.contains("open")) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const buttons = [...layer.querySelectorAll('button:not(:disabled), summary, [role="button"][tabindex="0"]')].filter(el => !el.hidden && el.getAttribute("aria-disabled") !== "true" && el.getClientRects().length);
        if (!buttons.length) { e.preventDefault(); return; }
        const index = buttons.indexOf(document.activeElement);
        if ((e.shiftKey && index <= 0) || (!e.shiftKey && (index === buttons.length - 1 || index < 0))) { e.preventDefault(); buttons[e.shiftKey ? buttons.length - 1 : 0].focus(); }
      }
    }, true);
    let lastResume = 0;
    const resume = () => {
      if (document.hidden || !active() || Date.now() - lastResume < 1000) return;
      lastResume = Date.now(); void refresh(true);
    };
    document.addEventListener("visibilitychange", resume); window.addEventListener("focus", resume); window.addEventListener("pageshow", resume);
    render(); return {refresh, render, roleChanged,openServices:()=>open('services'),openSettlement:async()=>{await open('settlement');if(layer.classList.contains('open')){detailView='history';render();}}};
  }
})();
