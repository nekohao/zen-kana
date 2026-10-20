/* One inventory; persistent device sessions; expiring server-verified invitations. */
(() => {
  'use strict';
  const M = window.Med, e = M.esc, KEY = 'mediterranean.cloud.v1', AUTH = 'mediterranean.auth.v1';
  const C = M.cloud = { kitchen: null, account: null, authorized: false, outbox: new Map(), busy: false, applying: false, message: '', epoch: 0, mode: 'invite' };
  const snapshot = () => new Map(M.state.pantry.map(name => [name, M.state.priority.includes(name)]));
  C.baseline = snapshot();
  try {
    const legacy = 'sb-ycgiooxdlabmyzbmpdfk-auth-token';
    if (!localStorage.getItem(AUTH) && localStorage.getItem(legacy)) {
      localStorage.setItem(AUTH, localStorage.getItem(legacy));
      localStorage.removeItem(legacy);
    }
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null'), session = JSON.parse(localStorage.getItem(AUTH) || 'null');
    if (/^[a-f0-9-]{36}$/i.test(saved?.kitchen?.id)) {
      C.kitchen = saved.kitchen;
      for (const op of saved.outbox || []) if (typeof op.name === 'string' && op.name.length <= 80 && typeof op.available === 'boolean' && typeof op.priority === 'boolean' && /^[a-f0-9-]{36}$/i.test(op.operationId)) C.outbox.set(op.name, op);
      // Local receipt controls immediate display only; server RLS checks every request.
      if (saved.version === 2 && saved.authorized && session?.refresh_token && session.user?.id === saved.kitchen.userId) {
        C.account = { id: session.user.id, email: session.user.email }; C.authorized = true;
      }
    }
  } catch { /* Preserve personal data even when session restoration fails. */ }
  const remember = () => localStorage.setItem(KEY, JSON.stringify({ version: 2, authorized: C.authorized, kitchen: C.kitchen, outbox: [...C.outbox.values()] }));
  const operation = (name, available, priority) => ({ name, available, priority: available && priority, operationId: crypto.randomUUID() });
  C.canEnter = () => C.authorized && Boolean(C.kitchen && C.account);
  document.body.classList.toggle('access-locked', !C.canEnter());
  C.status = () => !navigator.onLine ? (C.outbox.size ? `离线 · 待同步 ${C.outbox.size} 项` : '离线可用') : C.message ? '连接待恢复' : C.busy ? '正在同步' : C.outbox.size ? `待同步 ${C.outbox.size} 项` : '已同步';
  C.paint = () => {
    document.querySelectorAll('[data-cloud-status]').forEach(n => { n.textContent = C.status(); });
    document.querySelectorAll('[data-cloud-error]').forEach(n => { n.textContent = C.message; n.hidden = !C.message; });
    const left = Math.max(0, Math.ceil(((C.invite?.deadline || 0) - Date.now()) / 1000));
    document.querySelectorAll('[data-invite-remaining]').forEach(n => { n.textContent = left ? `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 后失效` : '已过期，请重新生成'; });
    document.querySelectorAll('[data-action="cloud-copy"]').forEach(n => { n.disabled = !left; });
  };
  C.pantryStatus = () => `<button class="cloud-status-entry" data-action="cloud-settings"><span class="cloud-dot"></span><span>共享库存</span><small data-cloud-status>${e(C.status())}</small>${M.icon('chevron')}</button>`;
  const friendly = error => {
    const text = String(error?.message || error || '') + (error?.code || '');
    if (/anonymous_provider_disabled|Anonymous sign-ins are disabled/i.test(text)) return '邀请码入口尚未启用，请联系管理员完成配置。';
    if (/signup_disabled|Signups not allowed/i.test(text)) return '新设备验证尚未启用，请联系管理员检查账号设置。';
    if (/Invalid login credentials|invalid_credentials/i.test(text)) return '邮箱或密码不正确，请重新输入。';
    if (/Email not confirmed|email_not_confirmed/i.test(text)) return '管理员账号尚未确认，请在控制台确认账号。';
    if (/PGRST20[25]|schema cache|does not exist|Not configured/i.test(text)) return '共享库存需要完成本次数据库升级，请联系管理员。';
    if (/Invalid invitation/i.test(text)) return '邀请码无效或已过期，请向管理员获取新码。';
    if (/ADMIN_ONLY/i.test(text)) return '请使用管理员账号登录，家人请使用邀请码。';
    if (/42501|ACCESS_REQUIRED|PGRST116/.test(text)) return '这台设备需要重新授权，请输入新的邀请码。';
    if (/ACCOUNT_CHANGED|KITCHEN_CHANGED/.test(text)) return '本机仍有原库存记录，请先导出备份后联系管理员。';
    return navigator.onLine ? '暂时无法连接，请稍后重试。' : '首次验证需要联网，请连接网络后重试。';
  };
  const client = () => {
    if (!C.client) {
      const config = window.MEDITERRANEAN_CLOUD;
      if (!config?.enabled || !window.supabase?.createClient) throw Error('Cloud configuration unavailable');
      C.client = window.supabase.createClient(config.url, config.publishableKey, { auth: { storageKey: AUTH } });
    }
    return C.client;
  };
  const authenticated = async () => {
    const result = await client().auth.getSession();
    if (result.error) throw result.error;
    const user = result.data.session?.user;
    if (!user) throw { code: 'ACCESS_REQUIRED' };
    if (C.kitchen?.userId && C.kitchen.userId !== user.id && C.outbox.size) throw { code: 'ACCOUNT_CHANGED' };
    C.account = { id: user.id, email: user.email }; return user;
  };
  const getAccess = async () => {
    const result = await client().rpc('med_get_access');
    if (result.error) throw result.error;
    if (!/^[a-f0-9-]{36}$/i.test(result.data?.id) || !['admin', 'member'].includes(result.data?.role)) throw { code: 'ACCESS_REQUIRED' };
    return result.data;
  };
  const accept = access => {
    if (C.kitchen && C.outbox.size && C.kitchen.id !== access.id) throw { code: 'KITCHEN_CHANGED' };
    if (!C.kitchen || C.kitchen.id !== access.id) M.state.localPantry = { pantry: [...M.state.pantry], priority: [...M.state.priority] };
    C.kitchen = { id: access.id, name: access.name, role: access.role, userId: C.account.id };
    localStorage.setItem('mediterranean.v1', JSON.stringify(M.state));
    const previous = C.authorized;
    C.authorized = true;
    try { remember(); } catch (error) { C.authorized = previous; throw error; }
    document.body.classList.remove('access-locked');
  };
  const lock = () => {
    const entered = C.authorized;
    C.authorized = false; C.epoch++; clearTimeout(C.retry);
    if (C.channel) client().removeChannel(C.channel).catch(() => {});
    C.channel = null; C.realtime = false;
    try { remember(); } catch {}
    if (M.ui.cook) M.closeCook();
    M.closeSheet?.(); document.body.classList.add('access-locked');
    if (entered) M.render(); else C.paint();
  };
  C.renderGate = () => {
    document.body.classList.add('access-locked'); document.title = '进入厨房 · Mediterranean';
    document.getElementById('mobile-nav').innerHTML = '';
    document.getElementById('main').innerHTML = `<div class="access-screen"><div class="access-brand"><span class="brand-emblem" aria-hidden="true"></span><span>Mediterranean</span></div><div class="access-welcome"><span class="eyebrow">OUR SHARED KITCHEN</span><h1>一起，好好吃饭。</h1><p>一份食材库存，家人一起维护。</p></div><section class="access-card"><div class="access-tabs" role="group" aria-label="选择进入方式"><button data-action="access-mode" data-mode="invite" aria-pressed="${C.mode === 'invite'}">邀请码进入</button><button data-action="access-mode" data-mode="admin" aria-pressed="${C.mode === 'admin'}">管理员登录</button></div>${C.mode === 'admin' ? '<form data-access-form="admin"><label class="family-label" for="family-email">邮箱</label><input class="family-input" id="family-email" type="email" autocomplete="username" inputmode="email" required placeholder="管理员邮箱"><label class="family-label" for="family-password">密码</label><input class="family-input" id="family-password" type="password" autocomplete="current-password" required placeholder="输入密码"><button class="primary-button block-button" type="submit">登录并进入</button></form>' : '<form data-access-form="invite"><label class="family-label" for="family-join-code">家庭邀请码</label><input class="family-input invite-input" id="family-join-code" maxlength="32" autocomplete="off" autocapitalize="characters" spellcheck="false" required placeholder="输入管理员发来的邀请码"><button class="primary-button block-button" type="submit">验证并进入</button></form><p class="access-note">邀请码 10 分钟内有效，验证后此设备可直接进入。</p>'}<p class="family-error" role="status" data-cloud-error ${C.message ? '' : 'hidden'}>${e(C.message)}</p></section><p class="access-footnote">已授权设备会记住你，下次打开直接进入。</p>${M.state.pantry.length || C.outbox.size ? '<button class="text-link access-backup" data-action="export">导出本机数据备份</button>' : ''}</div>`;
  };
  C.localChanged = () => {
    if (C.applying) return;
    const next = snapshot();
    if (C.canEnter()) {
      for (const name of new Set([...C.baseline.keys(), ...next.keys()])) if (C.baseline.has(name) !== next.has(name) || C.baseline.get(name) !== next.get(name)) C.outbox.set(name, operation(name, next.has(name), next.get(name) || false));
      try { remember(); } catch { C.message = '待同步记录无法保存，请保持页面打开并重试。'; }
    }
    C.baseline = next; C.paint();
    if (C.canEnter() && C.outbox.size) C.sync();
  };
  const apply = rows => {
    const input = document.activeElement;
    const focus = input?.dataset?.search ? { kind: input.dataset.search, value: input.value, position: input.selectionStart } : null;
    const merged = new Map();
    for (const row of [...rows].sort((a, b) => String(a.updated_at || '').localeCompare(String(b.updated_at || '')))) {
      const name = M.canonicalIngredient(row.ingredient);
      if (row.available) merged.set(name, Boolean(row.priority)); else merged.delete(name);
    }
    for (const op of C.outbox.values()) { const name = M.canonicalIngredient(op.name); if (op.available) merged.set(name, op.priority); else merged.delete(name); }
    C.applying = true;
    try { M.state.pantry = [...merged.keys()]; M.state.priority = [...merged].filter(([, p]) => p).map(([name]) => name); C.baseline = snapshot(); M.save(); }
    finally { C.applying = false; }
    M.refresh();
    if (focus && !M.ui.modal) {
      const restored = document.querySelector(`input[data-search="${focus.kind}"]`);
      if (restored) { restored.value = focus.value; restored.focus({ preventScroll: true }); try { restored.setSelectionRange(focus.position, focus.position); } catch {} }
    }
    if (['pantry-add', 'pantry-family'].includes(M.ui.modal)) M.paintCatalog?.();
    if (M.ui.modal === 'cook-ingredients' && M.ui.cook) { const list = document.querySelector('#modal-backdrop .ingredient-list'); if (list) list.innerHTML = M.ingredientRows(M.getRecipe(M.ui.cook.id)); }
  };
  const subscribe = () => {
    if (!C.kitchen || C.channel) return;
    C.channel = client().channel('med-inventory:' + C.kitchen.id).on('postgres_changes', { event: '*', schema: 'public', table: 'med_inventory', filter: 'kitchen_id=eq.' + C.kitchen.id }, () => C.sync()).subscribe(status => { C.realtime = status === 'SUBSCRIBED'; if (C.realtime) C.sync(); });
  };
  C.sync = async () => {
    if (!C.canEnter() || !navigator.onLine) { C.paint(); return; }
    if (C.busy) { C.again = true; return; }
    C.busy = true; C.paint();
    const epoch = C.epoch, kitchen = C.kitchen.id;
    try {
      await authenticated(); const access = await getAccess();
      if (C.epoch !== epoch) return;
      if (access.id !== kitchen) throw { code: 'KITCHEN_CHANGED' };
      C.kitchen.role = access.role;
      do {
        C.again = false;
        while (C.outbox.size) {
          const batch = [...C.outbox.values()].slice(0, 500);
          const response = await client().rpc('med_apply_inventory', { p_kitchen: kitchen, p_changes: batch });
          if (response.error) throw response.error;
          if (C.epoch !== epoch) return;
          for (const op of batch) if (C.outbox.get(op.name)?.operationId === op.operationId) C.outbox.delete(op.name);
          remember();
        }
        const stock = await client().from('med_inventory').select('ingredient,available,priority,updated_at').eq('kitchen_id', kitchen);
        if (stock.error) throw stock.error;
        if (C.epoch !== epoch) return;
        C.message = ''; C.failures = 0; apply(stock.data); remember(); subscribe();
      } while (C.again && C.canEnter() && navigator.onLine);
    } catch (error) {
      C.message = friendly(error);
      if (/ACCESS_REQUIRED|42501|PGRST116|refresh_token_not_found|refresh_token_already_used/.test(String(error?.code))) lock();
      else { clearTimeout(C.retry); C.retry = setTimeout(() => { if (!document.hidden) C.sync(); }, Math.min(30000, 2000 * 2 ** Math.min(C.failures || 0, 4))); }
      C.failures = (C.failures || 0) + 1;
    } finally { C.busy = false; C.paint(); }
  };
  C.show = () => {
    if (!C.canEnter()) { M.render(); return; }
    const admin = C.kitchen.role === 'admin', formatted = C.invite?.code.match(/.{1,4}/g)?.join(' ');
    M.sheet('共享库存', `<div class="family-heading"><strong>我们的厨房</strong><span data-cloud-status>${e(C.status())}</span></div><p class="panel-subtitle">食材与优先使用会同步给家人。</p>${admin ? `<section class="invite-panel"><div class="section-heading"><h2>邀请家人</h2><span class="quiet-tag">管理员</span></div>${formatted ? `<input class="family-code" id="family-invite" readonly value="${e(formatted)}" aria-label="本次邀请码"><div class="invite-meta"><span data-invite-remaining></span><button class="text-link" data-action="cloud-copy">复制邀请码</button></div>` : '<p class="small-note">生成后 10 分钟有效，已验证设备持续可用。</p>'}<button class="secondary-button block-button" data-action="cloud-invite">${formatted ? '重新生成邀请码' : '生成邀请码'}</button>${formatted ? '<p class="small-note">重新生成后，上一枚邀请码立即失效。</p>' : ''}</section>` : '<p class="small-note">此设备已授权，下次打开会直接进入。</p>'}<div class="settings-group family-manage"><button class="settings-row" data-action="cloud-sync"><span>重新同步</span>${M.icon('download')}</button>${M.state.localPantry ? '<button class="settings-row" data-action="cloud-local-backup"><span>查看原本机食材副本</span>' + M.icon('pantry') + '</button>' : ''}<button class="settings-row" data-action="cloud-logout"><span>退出此设备</span>${M.icon('back')}</button></div><p class="family-error" role="status" data-cloud-error ${C.message ? '' : 'hidden'}>${e(C.message)}</p>`, 'cloud'); C.paint();
  };
  const perform = async fn => {
    if (C.actionBusy) return;
    C.actionBusy = true;
    const controls = [...document.querySelectorAll('.access-card button, #modal-backdrop [data-action^="cloud-"]')];
    controls.forEach(b => { b.disabled = true; });
    try { C.message = ''; C.paint(); await fn(); }
    catch (error) { C.message = friendly(error); C.paint(); }
    finally { C.actionBusy = false; controls.forEach(b => { b.disabled = false; }); C.paint(); }
  };
  C.login = () => perform(async () => {
    const email = document.getElementById('family-email')?.value.trim(), password = document.getElementById('family-password')?.value;
    if (!email || !password) throw Error('Invalid login credentials');
    const result = await client().auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    await authenticated(); const access = await getAccess();
    if (access.role !== 'admin') throw { code: 'ADMIN_ONLY' };
    accept(access); M.render(); await C.sync();
  });
  C.join = () => perform(async () => {
    const code = document.getElementById('family-join-code')?.value.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-F0-9]{16}$/.test(code || '')) throw Error('Invalid invitation');
    const api = client(), session = await api.auth.getSession();
    if (session.error) throw session.error;
    if (!session.data.session) { const signed = await api.auth.signInAnonymously(); if (signed.error) throw signed.error; }
    await authenticated();
    const joined = await api.rpc('med_join_kitchen', { p_code: code });
    if (joined.error) throw joined.error;
    const access = await getAccess(); accept(access); M.render(); await C.sync();
  });
  C.issueInvite = () => perform(async () => {
    const started = Date.now(), result = await client().rpc('med_issue_invite');
    if (result.error) throw result.error;
    C.invite = { code: result.data.code, deadline: started + Number(result.data.valid_for_seconds) * 1000 }; C.show();
  });
  C.copy = async () => {
    if (!C.invite || C.invite.deadline <= Date.now()) return M.toast('邀请码已过期，请重新生成');
    try { await navigator.clipboard.writeText(C.invite.code); M.toast('邀请码已复制'); }
    catch { const input = document.getElementById('family-invite'); input?.focus(); input?.select(); M.toast('长按选中的邀请码即可复制'); }
  };
  C.logout = () => {
    if (C.outbox.size || C.busy) return M.toast('先完成同步，再退出此设备');
    M.sheet('退出此设备？', '<p class="panel-subtitle">本机数据会保留。再次进入需要管理员登录或新邀请码。</p><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">取消</button><button class="primary-button" data-action="cloud-logout-confirm">退出</button></div>');
  };
  C.confirmLogout = () => perform(async () => {
    if (C.outbox.size || C.busy) return M.toast('先完成同步，再退出此设备');
    const result = await client().auth.signOut({ scope: 'local' });
    if (result.error) throw result.error;
    localStorage.removeItem('sb-ycgiooxdlabmyzbmpdfk-auth-token');
    C.account = null; C.invite = null; C.message = ''; lock();
  });
  C.preserveSharedState = parsed => {
    if (C.kitchen) { parsed.localPantry ||= { pantry: parsed.pantry, priority: parsed.priority }; parsed.pantry = [...M.state.pantry]; parsed.priority = [...M.state.priority]; }
    return parsed;
  };
  C.showLocalBackup = () => {
    const b = M.state.localPantry;
    if (!b) return;
    M.sheet('原本机食材副本', `<p class="panel-subtitle">${b.pantry.length} 种食材，原记录完整保留。</p><div class="pantry-chips">${b.pantry.map(n => `<span class="ingredient-chip">${e(M.ingredientLabel(n))}</span>`).join('')}</div><button class="secondary-button block-button" data-action="export">导出备份</button>${C.kitchen?.role === 'admin' && b.pantry.length ? '<button class="primary-button block-button" data-action="cloud-merge-local" style="margin-top:12px">将副本食材补充到共享库存</button>' : ''}`);
  };
  C.mergeLocal = () => {
    if (!C.canEnter() || C.kitchen.role !== 'admin' || !M.state.localPantry) return;
    M.state.pantry = M.uniqueIngredients([...M.state.pantry, ...M.state.localPantry.pantry]);
    M.state.priority = M.uniqueIngredients([...M.state.priority, ...M.state.localPantry.priority]);
    M.save(); M.closeSheet(); M.refresh(); M.toast('已补充，原副本仍保留');
  };
  C.recover = async () => {
    if (!navigator.onLine || C.actionBusy) return;
    const epoch = C.epoch;
    try { await authenticated(); const access = await getAccess(); if (C.epoch !== epoch || C.actionBusy) return; accept(access); M.render(); await C.sync(); }
    catch (error) {
      if (C.epoch !== epoch || C.actionBusy) return;
      if (/ACCESS_REQUIRED|42501|PGRST116|refresh_token_not_found/.test(String(error?.code))) { C.message = ''; lock(); }
      else { C.message = friendly(error); C.paint(); }
    }
  };
  C.start = () => {
    Promise.resolve().then(C.recover);
    window.addEventListener('online', () => { if (C.canEnter()) C.sync(); else C.recover(); });
    window.addEventListener('offline', C.paint);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { C.paint(); if (C.canEnter()) C.sync(); else C.recover(); } });
    setInterval(() => { if (C.canEnter() && !document.hidden && !C.realtime) C.sync(); }, 20000);
    setInterval(() => { if (C.invite && !document.hidden) C.paint(); }, 1000);
  };
})();
