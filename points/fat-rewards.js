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
    let services = [], more = false, paging = false;
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
            <h2 class="sheet-title" id="fatRewardTitle">钻石商城</h2><div class="shop-sheet-subtitle" id="fatRewardSubtitle"></div>
          </header><div class="unified-sheet-body shop-sheet-body"><div class="fat-reward-toolbar">每一点进步，都值得奖励 ♡</div>
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
      ui.setLayer(layer, false); confirmation = null;
      if (previousFocus?.isConnected && active()) previousFocus.focus();
    }
    async function open(next) {
      if (!active() || roleKey === "verifying" || (next === "shop" && !admin())) return;
      previousFocus = document.activeElement; page = next; shopView = "products"; confirmation = null;
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
      q("fatRewardTitle").textContent = page === "shop" ? "钻石商城" : "服务详情";
      q("fatRewardSubtitle").textContent = page === "shop" ? "把每周的小进步，换成喜欢的奖励 ♡" : "哥哥的请求与本次服务进度";
      q("fatRewardGrabber").setAttribute("aria-disabled",String(busy));
      q("fatRewardError").hidden = !error; q("fatRewardError").textContent = error;
      if (!data) { body.innerHTML = '<p class="fat-reward-empty">等待同步奖励数据</p>'; return; }
      const navigation = isAdministrator ? `<section class="shop-balance-card fat-reward-balance" aria-label="钻石余额"><div><span>我的钻石</span><small>背包 ${data.backpack} 次 · 每周日 12:00 结算</small></div><strong>${data.diamonds}<em>◇</em></strong></section><nav class="shop-tabs fat-reward-tabs" role="tablist" aria-label="减脂奖励页面">${[["products","商品"],["inventory","我的背包"],["services",`服务详情${pending ? ` · ${pending}` : ""}`]].map(([action,title]) => `<button class="shop-tab pressable${(action === "services" ? page === "services" : page === "shop" && shopView === action) ? " active" : ""}" data-fat-reward-action="${action}" role="tab" aria-selected="${action === "services" ? page === "services" : page === "shop" && shopView === action}" type="button"${busy ? " disabled" : ""}>${title}</button>`).join("")}</nav>` : "";
      if (confirmation) {
        const {action,id} = confirmation;
        const message = {buy:hasRetry("buy") ? "确认上次兑换的结果，不会重复扣钻石。" : "花费 1 颗钻石兑换口一次，放入背包。", use:hasRetry("use") ? "确认上次使用的结果，不会重复发起服务。" : "使用背包中的口一次，向宝宝发起服务请求。", serviced:"确认已经进行本次服务，并交给哥哥确认？", confirm:"确认宝宝已经进行服务，完成本次兑换？", return:"选择否：将口一次退回背包，之后可以重新发起请求。"}[action];
        body.innerHTML = `${navigation}<div class="fat-reward-card fat-reward-confirm"><p>${message}</p><div class="fat-reward-actions">${actionButton("submit", busy ? "正在处理…" : "确认", false, id)}${actionButton("cancel", "返回")}</div></div>`; return;
      }
      if (page === "shop") {
        const p = data.preview;
        const requirement = p?.comparison_basis === "starting_weight"
          ? p.reference_available === false ? "请先设置起始体重" : "首周满 3 天才奖扣"
          : "两周均满 3 天才奖扣";
        const preview = p ? `${p.week} 这周 · ${change(p.change_jin)}<br>${referenceLabel(p)} · ${p.settled ? "本周已结算" : !p.eligible ? requirement : `暂预计 ${signed(p.calculated_delta)} 颗钻石`}` : "暂无周数据";
        body.innerHTML = `${navigation}${shopView === "inventory" ? `<div class="shop-section-head inventory-head"><div><strong>我的背包</strong><small>兑换后的奖励在这里，准备好时再使用 ♡</small></div></div><div class="shop-inventory-row"><div class="shop-inventory-icon shop-theme-potion">${diamond}</div><div class="shop-inventory-copy"><strong>口 × ${data.backpack}</strong><small>使用一次，请求宝宝进行服务</small></div>${actionButton("use", hasRetry("use") ? "重试使用" : "使用", !hasRetry("use") && data.backpack < 1)}</div>` : `<div class="shop-section-kicker">减脂专属奖励</div><button class="shop-featured-card fat-reward-featured pressable" data-fat-reward-action="buy" type="button"${busy || (!hasRetry("buy") && data.diamonds < 1) ? " disabled" : ""}><div class="shop-featured-copy"><span class="shop-featured-label">每周的小幸运</span><h3>口一次</h3><p>兑换后放入背包<br>准备好时，再向宝宝发起请求</p><span class="shop-featured-price">◇ 1 颗钻石 · ${hasRetry("buy") ? "重试兑换" : "兑换"}</span></div><div class="shop-featured-art">${diamond}</div></button>`}
          <div class="fat-reward-card"><h3>本周钻石进度</h3><p>${preview}</p><p>下次结算：${stamp(data.next_cutoff)}（北京时间）</p></div>
          <details class="fat-reward-card"><summary>钻石规则与结算记录</summary><p>周一至周日，每周日 12:00 自动结算；只统计截止前的记录，每天取首笔。</p><p>首次记录所在周：至少记录 3 天，用本周均重对比起始体重。之后用本周均重对比上周结算均重，两周各至少 3 天；不足天数不奖扣。</p><p>均重下降每满 1 斤奖励 1 颗，不足 1 斤不奖励；上涨不足 1 斤扣 1 颗，达到 1 斤后按整斤扣；持平不奖扣。余额最低为 0。</p><p>结算结果固定，周日中午之后补录不参与该周奖扣。</p>${(data.weeks || []).map(w => `<p>${escape(w.week)} · ${change(w.change_jin)}<br>${referenceLabel(w)}<br>${w.eligible ? `实际 ${signed(w.applied_delta)} 颗${w.applied_delta !== w.calculated_delta ? `（原应 ${signed(w.calculated_delta)}，余额不足）` : ""}` : "不奖扣（记录不足或缺少比较基准）"}</p>`).join("") || '<p>启用后开始结算，暂时没有结算记录。</p>'}</details>`;
      } else {
        body.innerHTML = `${navigation}
          <p class="fat-reward-caption">待服务 ${data.pending_service} 次 · 待确认 ${data.pending_confirmation} 次</p>
          ${services.map(r => `<article class="fat-reward-card"><h3>哥哥请求兑换口一次</h3><p>请求 ${escape(stamp(r.requested_at))} · #${escape(r.id)}</p><p class="fat-reward-status">${labels[r.status] || "状态待同步"}</p>${r.serviced_at ? `<p>宝宝已进行服务：${escape(stamp(r.serviced_at))}</p>` : ""}${r.resolved_at ? `<p>处理时间：${escape(stamp(r.resolved_at))}</p>` : ""}<div class="fat-reward-actions">${r.status === "pending_service" && !isAdministrator ? actionButton("serviced", "已进行服务", false, r.id) : r.status === "pending_confirmation" && isAdministrator ? `${actionButton("confirm", "是，确认完成", false, r.id)}${actionButton("return", "否，退回背包", false, r.id)}` : ""}</div></article>`).join("") || '<p class="fat-reward-empty">暂无服务请求</p>'}
          ${more ? actionButton("more", paging ? "正在加载…" : "查看更早请求", paging) : ""}`;
      }
    }
    function roleChanged() {
      const next = role();
      if (next !== roleKey) {
        roleKey = next; generation++; data = null; services = []; more = false; error = ""; lastRead = 0; inflight = null; confirmation = null;
        resetDrag(); ui.setLayer(layer, false); body.replaceChildren(); operations.clear();
      }
      render(); if (active()) void refresh();
    }
    body.addEventListener("click", event => {
      const button = event.target.closest("[data-fat-reward-action]");
      if (!button || busy) return;
      const action = button.dataset.fatRewardAction, id = button.dataset.requestId;
      if (["products","inventory","services"].includes(action)) { page = action === "services" ? "services" : "shop"; if (page === "shop") shopView = action; confirmation = null; sheet.scrollTop = 0; render(); }
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
