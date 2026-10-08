/* Diamond rewards are separate from points and wheel rewards. All writes use transactional RPCs. */
(() => {
  "use strict";
  window.PointsFatRewards = { attach };

  function attach({db, state, els, ui, isAdmin}) {
    const q = id => document.getElementById(id);
    const active = () => state.activeMetric === "fat";
    const role = () => isAdmin() ? `admin:${state.session?.user?.id}` : state.session ? "verifying" : "guest";
    const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    const stamp = value => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat("zh-CN", {timeZone:"Asia/Shanghai", month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit", hour12:false}).format(new Date(value)) : "—";
    const change = value => value === null || value === undefined ? "暂无对比" : Number(value) === 0 ? "均重持平" : `均重${Number(value) < 0 ? "下降" : "上升"} ${Math.abs(Number(value)) < .01 ? "不足 0.01" : Math.abs(Number(value)).toFixed(2)} 斤`;
    const signed = value => `${Number(value) > 0 ? "+" : ""}${value}`;
    const referenceLabel = week => week.comparison_basis === "starting_weight"
      ? `首周 ${week.current_days} 天 / 对比起始体重`
      : `本周 ${week.current_days} 天 / 上周 ${week.previous_days} 天`;
    const labels = {pending_service:"等待宝宝进行服务", pending_confirmation:"宝宝已经进行服务，等待哥哥确认", completed:"本次服务兑换完毕", returned:"哥哥未确认，已退回背包"};
    let data = null, error = "", lastRead = 0, generation = 0, inflight = null, busy = false;
    let roleKey = role(), page = "shop", shopView = "products", confirmation = null, previousFocus = null;
    let services = [], more = false, paging = false, detailView = null;
    let drag = null, suppressClickUntil = 0;
    const operations = new Map();
    const diamond = '<svg aria-hidden="true" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M11 9h26l8 12-21 24L3 21 11 9Z"/><path d="m11 9 7 12 6-12 6 12 7-12M3 21h42M18 21l6 24 6-24"/></svg>';

    els.home.querySelector(".fat-home-actions").insertAdjacentHTML("beforeend", `
      <button class="fat-record-button pressable" id="fatDiamondShopBtn" type="button" hidden>钻石商城</button>
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
      previousFocus = document.activeElement; page = next; shopView = "products"; confirmation = null; detailView = null;
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
      if (changed) render();
    }
    async function refresh(force=false) {
      if (!active() || roleKey === "verifying" || busy) return false;
      if (inflight) return inflight;
      if (!force && data && Date.now() - lastRead < 15000) return true;
      const version = generation;
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
    function progressSummary() {
      const p = data.preview;
      if (!p) return "本周进度待同步";
      if (p.settled) return "本周已结算";
      if (p.comparison_basis === "starting_weight" && p.reference_available === false) return "等待设置起始体重";
      if (!p.eligible) return "本周尚未满足结算条件";
      return `本周暂估 ${signed(p.calculated_delta)} ◇`;
    }
    function renderRewardDetails() {
      const p = data.preview;
      const titles = {progress:"本周结算", rules:"奖励规则", history:"结算记录"};
      const back = `<button class="fat-reward-back pressable" data-fat-reward-action="products" type="button">‹ 返回商品</button>`;
      const links = `<nav class="fat-reward-detail-links" aria-label="结算信息">${[["progress","本周结算"],["history","结算记录"],["rules","奖励规则"]].filter(([view]) => view !== detailView).map(([view,title]) => `<button class="pressable" data-fat-reward-action="${view}" type="button">${title}<span aria-hidden="true">›</span></button>`).join("")}</nav>`;
      let content = "";
      if (detailView === "progress") {
        const reference = p?.comparison_basis === "starting_weight";
        content = `<section class="fat-reward-card"><h3>${escape(progressSummary())}</h3>${p ? `<p>${escape(change(p.change_jin))}</p><dl class="fat-reward-stat-list"><div><dt>结算周</dt><dd>${escape(p.week)}</dd></div><div><dt>本周记录</dt><dd>${escape(p.current_days)} 天</dd></div><div><dt>比较基准</dt><dd>${reference ? "起始体重" : `上周 · ${escape(p.previous_days)} 天记录`}</dd></div><div><dt>下次结算</dt><dd>${escape(stamp(data.next_cutoff))}</dd></div></dl><p>北京时间 · 每周日 12:00</p><p>${p.settled ? "本周结果已固定，可在结算记录中查看实际到账。" : !p.eligible ? reference && p.reference_available === false ? "请先在管理员设置中设置起始体重。" : reference ? "首周至少记录 3 个不同日期后才参与奖扣。" : "本周和上周各至少记录 3 个不同日期后才参与奖扣。" : "暂估尚未到账，实际奖扣以结算时的记录为准；余额不足时只扣剩余钻石。"}</p>` : '<p>暂无本周数据，请重新打开商城同步。</p>'}</section>`;
      } else if (detailView === "rules") {
        content = `<div class="fat-reward-rules">
          <section class="fat-reward-card"><h3>什么时候结算</h3><p>北京时间每周日 12:00，结算本周一至截止前的记录。同一天取最早一笔，漏记不补值。</p></section>
          <section class="fat-reward-card"><h3>怎样获得钻石</h3><p>均重每下降满 1 斤，奖励 1 颗钻石；不足 1 斤不奖励。</p><p>均重上升不足 1 斤扣 1 颗；达到 1 斤后按整斤扣。持平不奖扣，余额最低为 0。</p></section>
          <section class="fat-reward-card"><h3>需要多少天记录</h3><p>首次记录所在周：至少记录 3 天，并设置起始体重，用本周均重与起始体重比较。</p><p>之后：本周和上周各至少记录 3 天，比较两周均重；不足天数不奖扣。</p></section>
          <section class="fat-reward-card"><h3>结算后还会变化吗</h3><p>结算结果固定。之后补录、删除记录或修改起始体重，都不会改变已结算奖扣；下周沿用上周结算时的均重。</p><p>周日 12:00 及之后的记录不参与本周钻石结算，也不移到下周。</p></section></div>`;
      } else {
        content = (data.weeks || []).map(w => `<details class="fat-reward-card fat-reward-history"><summary><span>${escape(w.week)}<small>结算周</small></span><strong>${w.eligible ? `${escape(signed(w.applied_delta))} ◇` : "未奖扣"}</strong></summary><div class="fat-reward-history-detail"><p>${escape(change(w.change_jin))}</p><p>${escape(referenceLabel(w))}</p><p>${w.eligible ? `实际 ${escape(signed(w.applied_delta))} 颗${w.applied_delta !== w.calculated_delta ? `（原应 ${escape(signed(w.calculated_delta))}，余额不足）` : ""}` : "记录不足或缺少比较基准，不奖扣。"}</p></div></details>`).join("") || '<p class="fat-reward-empty">暂无结算记录</p>';
      }
      return `${back}<h3 class="fat-reward-detail-title">${titles[detailView]}</h3>${content}${links}`;
    }
    function serviceCard(request) {
      const statuses = {pending_service:"待服务", pending_confirmation:"待确认", completed:"已完成", returned:"已退回"};
      return `<article class="fat-reward-card fat-reward-service-card"><div class="fat-reward-service-head"><h3>口一次</h3><span class="fat-reward-status" title="${escape(labels[request.status] || "状态待同步")}">${statuses[request.status] || "待同步"}</span></div><p>${escape(stamp(request.requested_at))} · #${escape(request.id)}</p><div class="fat-reward-actions">${request.status === "pending_service" && !admin() ? actionButton("serviced", "已进行服务", false, request.id) : request.status === "pending_confirmation" && admin() ? `${actionButton("confirm", "确认完成", false, request.id)}${actionButton("return", "退回背包", false, request.id)}` : ""}</div><details class="fat-reward-service-times"><summary>时间详情</summary><p>请求：${escape(stamp(request.requested_at))}</p>${request.serviced_at ? `<p>已服务：${escape(stamp(request.serviced_at))}</p>` : ""}${request.resolved_at ? `<p>处理：${escape(stamp(request.resolved_at))}</p>` : ""}</details></article>`;
    }
    function render() {
      const isActive = active(), isAdministrator = admin();
      els.home.classList.toggle("fat-rewards-admin", isActive && isAdministrator);
      q("fatDiamondShopBtn").hidden = !isAdministrator;
      q("fatServicesBtn").hidden = isAdministrator;
      q("fatDiamondShopBtn").disabled = busy;
      q("fatServicesBtn").disabled = busy || roleKey === "verifying";
      q("fatDiamondSummary").hidden = !isAdministrator;
      q("fatDiamondSummary").textContent = data ? `◇ ${data.diamonds} 颗钻石 · 背包 ${data.backpack} 次` : error ? "钻石待同步 · 打开商城重试" : "正在同步钻石";
      const pending = Number(data?.pending_confirmation || 0);
      q("fatServiceNotice").hidden = !isAdministrator || !pending;
      q("fatServiceNotice").textContent = `宝宝已经进行服务，是否确认？（${pending} 次）`;
      if (!isActive && layer.classList.contains("open") && !busy) close();
      if (!layer.classList.contains("open")) return;
      q("fatRewardTitle").textContent = isAdministrator ? "钻石商城" : "服务详情";
      q("fatRewardGrabber").setAttribute("aria-disabled",String(busy));
      q("fatRewardError").hidden = !error; q("fatRewardError").textContent = error;
      if (!data) { body.innerHTML = '<p class="fat-reward-empty">等待同步奖励数据</p>'; return; }
      const tabs = [["products","商品",0],["inventory","背包",data.backpack],["services","服务",pending]];
      const navigation = isAdministrator ? `<section class="fat-reward-wallet" aria-label="钻石余额"><strong><span aria-hidden="true">${diamond}</span>${escape(data.diamonds)}</strong><span>我的钻石</span></section><nav class="shop-tabs fat-reward-tabs" role="tablist" aria-label="减脂奖励页面">${tabs.map(([action,title,count]) => `<button class="shop-tab pressable${(action === "services" ? page === "services" : page === "shop" && shopView === action) ? " active" : ""}" data-fat-reward-action="${action}" role="tab" aria-selected="${action === "services" ? page === "services" : page === "shop" && shopView === action}" type="button"${busy ? " disabled" : ""}>${title}${Number(count) > 0 ? `<span class="fat-reward-tab-count">${escape(count)}</span>` : ""}</button>`).join("")}</nav>` : "";
      if (confirmation) {
        const {action,id} = confirmation;
        const message = {buy:hasRetry("buy") ? "确认上次兑换的结果，不会重复扣钻石。" : "花费 1 颗钻石兑换口一次，放入背包。", use:hasRetry("use") ? "确认上次使用的结果，不会重复发起服务。" : "使用背包中的口一次，向宝宝发起服务请求。", serviced:"确认已经进行本次服务，并交给哥哥确认？", confirm:"确认宝宝已经进行服务，完成本次兑换？", return:"选择否：将口一次退回背包，之后可以重新发起请求。"}[action];
        body.innerHTML = `${navigation}<div class="fat-reward-card fat-reward-confirm"><h3>${{buy:"确认兑换",use:"使用奖励",serviced:"确认已服务",confirm:"确认完成",return:"退回背包"}[action]}</h3><p>${message}</p><div class="fat-reward-actions">${actionButton("submit", busy ? "正在处理…" : "确认", false, id)}${actionButton("cancel", "返回")}</div></div>`; return;
      }
      if (page === "shop") {
        if (detailView) { body.innerHTML = `${navigation}${renderRewardDetails()}`; return; }
        if (shopView === "inventory") {
          body.innerHTML = `${navigation}<div class="shop-inventory-row fat-reward-inventory"><div class="shop-inventory-icon shop-theme-potion">${diamond}</div><div class="shop-inventory-copy"><strong>口 × ${escape(data.backpack)}</strong><small>使用后发起服务请求</small></div>${actionButton("use", hasRetry("use") ? "重试使用" : "使用", !hasRetry("use") && data.backpack < 1)}</div>${data.backpack < 1 && !hasRetry("use") ? '<p class="fat-reward-empty">兑换的奖励会保存在这里</p>' : ""}`;
          return;
        }
        const canBuy = hasRetry("buy") || data.diamonds >= 1;
        body.innerHTML = `${navigation}<section class="fat-reward-product"><div class="fat-reward-product-top"><div class="fat-reward-product-art">${diamond}</div><div class="fat-reward-product-copy"><h3>口一次</h3><p>兑换后存入背包</p></div></div><div class="fat-reward-product-bottom"><strong>◇ 1 <span>颗钻石</span></strong>${actionButton("buy", hasRetry("buy") ? "重试兑换" : canBuy ? "兑换" : "钻石不足", !canBuy)}</div></section><button class="fat-reward-progress-link pressable" data-fat-reward-action="progress" type="button"><span>${escape(progressSummary())}</span><span>详情 <span aria-hidden="true">›</span></span></button>`;
      } else {
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
      if (["products","inventory","services"].includes(action)) { page = action === "services" ? "services" : "shop"; if (page === "shop") shopView = action; confirmation = null; detailView = null; sheet.scrollTop = 0; render(); }
      else if (admin() && ["progress","rules","history"].includes(action)) { detailView = action; page = "shop"; shopView = "products"; sheet.scrollTop = 0; render(); }
      else if (action === "more") void loadMore();
      else if (action === "cancel") { confirmation = null; render(); }
      else if (action === "submit" && confirmation) void mutate(confirmation.action, confirmation.id);
      else if (["buy","use","serviced","confirm","return"].includes(action)) { confirmation = {action,id}; render(); }
      focusPanel();
    });
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
    render(); return {refresh, render, roleChanged};
  }
})();
