/* Optional family inventory. Personal favorites, shopping and cooking stay on this device. */
(() => {
  'use strict';
  const M = window.Med, e = M.esc, KEY = 'mediterranean.cloud.v1';
  const C = M.cloud = { kitchen: null, account: null, existing: [], outbox: new Map(), busy: false, applying: false, message: '', epoch: 0 };
  const snapshot = () => new Map(M.state.pantry.map(name => [name, M.state.priority.includes(name)]));
  C.baseline = snapshot();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved?.version === 1 && /^[a-f0-9-]{36}$/i.test(saved.kitchen?.id)) {
      C.kitchen = saved.kitchen;
      for (const op of saved.outbox || []) if (typeof op.name === 'string' && op.name.length <= 80 && typeof op.available === 'boolean' && typeof op.priority === 'boolean' && /^[a-f0-9-]{36}$/i.test(op.operationId)) C.outbox.set(op.name, op);
    }
  } catch { /* Local recipes remain usable if cloud preferences cannot be restored. */ }
  const remember = () => localStorage.setItem(KEY, JSON.stringify({ version: 1, kitchen: C.kitchen, outbox: [...C.outbox.values()] }));
  const operation = (name, available, priority) => ({ name, available, priority: available && priority, operationId: crypto.randomUUID() });
  C.status = () => !C.account ? '登录后共享' : !C.kitchen ? '尚未加入家庭' : !navigator.onLine ? (C.outbox.size ? `离线 · 待同步 ${C.outbox.size} 项` : '离线 · 使用本机记录') : C.message ? '连接待恢复' : C.busy ? '正在同步' : C.outbox.size ? `待同步 ${C.outbox.size} 项` : '已同步';
  C.paint = () => {
    document.querySelectorAll('[data-cloud-status]').forEach(node => { node.textContent = C.status(); });
    document.querySelectorAll('[data-cloud-error]').forEach(node => { node.textContent = C.message; node.hidden = !C.message; });
  };
  C.pantryStatus = () => C.kitchen && C.account ? `<button class="cloud-status-entry" data-action="cloud-settings"><span class="cloud-dot"></span><span>${e(C.kitchen.name)}</span><small data-cloud-status>${e(C.status())}</small>${M.icon('chevron')}</button>` : '';
  const friendly = error => {
    const text = String(error?.message || error || '');
    if (/Cloud disabled/.test(text)) return '家庭库存暂未启用，配置完成后即可邀请家人。';
    if (/LOGIN_REQUIRED/.test(error?.code)) return '请先登录，再使用家庭库存。';
    if (/Invalid login credentials|invalid_credentials/i.test(text + error?.code)) return '邮箱或密码不正确，请重新输入。';
    if (/Email not confirmed|email_not_confirmed/i.test(text + error?.code)) return '这个账号尚未确认，请联系管理员。';
    if (/PGRST20[25]|schema cache|does not exist/i.test(text + error?.code)) return '请先在 Supabase 执行项目中的 supabase-setup.sql。';
    if (/Invalid invitation/i.test(text)) return '邀请码不正确，请检查后重试。';
    if (/Kitchen limit/i.test(text)) return '这台设备创建的厨房已达上限。';
    if (/42501|Not a kitchen member|PGRST116/.test(text + error?.code)) return '当前设备尚未加入这个家庭，请重新使用邀请码加入。';
    return navigator.onLine ? '暂时未能连接，修改已保留在本机，可重试同步。' : '当前离线，联网后会继续同步。';
  };
  const client = () => {
    if (!C.client) {
      const config = window.MEDITERRANEAN_CLOUD;
      if (!config?.enabled) throw Error('Cloud disabled');
      if (!window.supabase?.createClient || !config?.url || !config?.publishableKey) throw Error('Cloud configuration unavailable');
      C.client = window.supabase.createClient(config.url, config.publishableKey);
    }
    return C.client;
  };
  const authenticated = async () => {
    const api = client();
    let result = await api.auth.getSession();
    if (result.error) throw result.error;
    let session = result.data.session;
    if (!session) throw { code: 'LOGIN_REQUIRED' };
    C.account = { id: session.user.id, email: session.user.email };
    if (C.kitchen?.userId && C.kitchen.userId !== session.user.id) {
      throw { code: 'LOGIN_REQUIRED', message: 'Please use the original account' };
    }
    return session.user.id;
  };
  const findFamilies = async () => {
    if (!C.account || C.kitchen) return;
    const result = await client().from('med_kitchens').select('id,name').order('created_at', { ascending: false });
    if (result.error) throw result.error;
    C.existing = result.data;
  };
  C.localChanged = () => {
    if (C.applying) return;
    const next = snapshot();
    if (C.kitchen && C.account) {
      for (const name of new Set([...C.baseline.keys(), ...next.keys()])) {
        if (C.baseline.has(name) !== next.has(name) || C.baseline.get(name) !== next.get(name)) C.outbox.set(name, operation(name, next.has(name), next.get(name) || false));
      }
      try { remember(); } catch { C.message = '待同步记录暂时无法保存，请保持页面打开并重试。'; }
    }
    C.baseline = next; C.paint();
    if (C.kitchen && C.account && C.outbox.size) C.sync();
  };
  const apply = rows => {
    const merged = new Map();
    for (const row of rows) {
      const name = M.canonicalIngredient(row.ingredient);
      if (row.available) merged.set(name, Boolean(row.priority));
    }
    for (const op of C.outbox.values()) { if (op.available) merged.set(op.name, op.priority); else merged.delete(op.name); }
    C.applying = true;
    try {
      M.state.pantry = [...merged.keys()]; M.state.priority = [...merged].filter(([, priority]) => priority).map(([name]) => name);
      C.baseline = snapshot(); M.save();
    } finally { C.applying = false; }
    const focused = document.activeElement?.dataset?.search;
    const position = document.activeElement?.selectionStart;
    M.refresh();
    if (focused) { const input = document.querySelector(`input[data-search="${focused}"]`); input?.focus({ preventScroll: true }); try { input?.setSelectionRange(position, position); } catch {} }
    if (M.ui.modal === 'cook-ingredients' && M.ui.cook) {
      const list = document.querySelector('#modal-backdrop .ingredient-list');
      if (list) list.innerHTML = M.ingredientRows(M.getRecipe(M.ui.cook.id));
    }
  };
  const subscribe = () => {
    if (!C.kitchen || C.channel) return;
    C.channel = client().channel('med-inventory:' + C.kitchen.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'med_inventory', filter: 'kitchen_id=eq.' + C.kitchen.id }, () => C.sync())
      .subscribe(status => { C.realtime = status === 'SUBSCRIBED'; if (C.realtime) C.sync(); });
  };
  C.sync = async () => {
    if (!C.kitchen) return;
    if (!navigator.onLine) { C.paint(); return; }
    if (C.busy) { C.again = true; return; }
    C.busy = true; C.paint();
    const epoch = C.epoch, kitchen = C.kitchen.id;
    try {
      await authenticated();
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
        const [household, stock] = await Promise.all([
          client().from('med_kitchens').select('name').eq('id', kitchen).single(),
          client().from('med_inventory').select('ingredient,available,priority').eq('kitchen_id', kitchen)
        ]);
        if (household.error || stock.error) throw household.error || stock.error;
        if (C.epoch !== epoch) return;
        C.kitchen.name = household.data.name; C.message = ''; C.failures = 0;
        apply(stock.data); remember(); subscribe();
      } while (C.again && C.kitchen && navigator.onLine);
    } catch (error) {
      if (error?.code === 'LOGIN_REQUIRED') C.account = null;
      C.message = friendly(error);
      clearTimeout(C.retry);
      if (error?.code !== 'LOGIN_REQUIRED') C.retry = setTimeout(() => { if (!document.hidden) C.sync(); }, Math.min(30000, 2000 * 2 ** Math.min(C.failures || 0, 4)));
      C.failures = (C.failures || 0) + 1;
    } finally { C.busy = false; C.paint(); }
  };
  C.show = () => {
    if (!C.account) {
      M.sheet('登录家庭库存', '<p class="panel-subtitle">登录后，与家人共同维护食材。</p><label class="family-label" for="family-email">邮箱</label><input class="family-input" id="family-email" type="email" autocomplete="username" inputmode="email" placeholder="你的邮箱"><label class="family-label" for="family-password">密码</label><input class="family-input" id="family-password" type="password" autocomplete="current-password" placeholder="输入密码"><button class="primary-button block-button" data-action="cloud-login">登录</button><p class="small-note">账号由管理员创建，浏览菜谱无需登录。</p>', 'cloud');
      document.querySelector('#modal-backdrop .sheet-body').insertAdjacentHTML('beforeend', `<p class="family-error" role="status" data-cloud-error ${C.message ? '' : 'hidden'}>${e(C.message)}</p>`);
      return;
    }
    const connected = C.kitchen;
    const code = connected?.code || '';
    const formatted = code.match(/.{1,8}/g)?.join('-') || code;
    M.sheet('家庭库存', connected ? `<div class="family-heading"><strong>${e(connected.name)}</strong><span data-cloud-status>${e(C.status())}</span></div><p class="small-note">添加、用完和优先使用会同步给家人。</p><label class="family-label" for="family-invite">家庭邀请码</label><input class="family-code" id="family-invite" readonly value="${e(formatted)}" aria-label="家庭邀请码"><button class="secondary-button block-button" data-action="cloud-copy">复制邀请码</button><div class="settings-group family-manage"><button class="settings-row" data-action="cloud-sync"><span>重新同步</span>${M.icon('download')}</button><button class="settings-row" data-action="cloud-leave"><span>退出家庭库存</span>${M.icon('back')}</button></div><p class="small-note">邀请码只分享给家人。收藏、采购和烹饪进度保存在各自设备。</p>` : `<p class="panel-subtitle">家人用同一个邀请码，共享一份库存。</p><label class="family-label" for="family-name">创建家庭</label><input class="family-input" id="family-name" maxlength="40" placeholder="我们的厨房" autocomplete="off"><button class="primary-button block-button" data-action="cloud-create">创建并同步现有食材</button><div class="family-divider"><span>或加入已有家庭</span></div><label class="family-label" for="family-join-code">家庭邀请码</label><input class="family-input" id="family-join-code" maxlength="80" placeholder="粘贴家人发来的邀请码" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="secondary-button block-button" data-action="cloud-join">加入家庭库存</button><p class="small-note">加入后使用家庭库存；本机收藏、采购和烹饪进度保留。</p>`, 'cloud');
    const body = document.querySelector('#modal-backdrop .sheet-body');
    if (connected && !code) {
      body.querySelector('label[for="family-invite"]')?.remove();
      body.querySelector('#family-invite')?.remove();
      body.querySelector('[data-action="cloud-copy"]')?.remove();
      body.querySelector('.family-manage').insertAdjacentHTML('beforebegin', '<p class="small-note">如需邀请家人，请从已保存邀请码的设备复制邀请码。</p>');
    }
    if (!connected && C.existing.length) body.insertAdjacentHTML('afterbegin', `<div class="family-label" style="margin-top:0">已有家庭</div><div class="settings-group">${C.existing.map(kitchen => `<button class="settings-row" data-action="cloud-open-existing" data-id="${e(kitchen.id)}"><span>${e(kitchen.name)}</span>${M.icon('chevron')}</button>`).join('')}</div>`);
    document.querySelector('#modal-backdrop .sheet-body').insertAdjacentHTML('beforeend', `<p class="family-error" role="status" data-cloud-error ${C.message ? '' : 'hidden'}>${e(C.message)}</p>`);
    document.querySelector('#modal-backdrop .sheet-body').insertAdjacentHTML('beforeend', `<button class="text-link family-signout" data-action="cloud-logout">退出登录 · ${e(C.account.email)}</button>`);
  };
  const perform = async fn => {
    if (C.actionBusy) return;
    C.actionBusy = true;
    document.querySelectorAll('#modal-backdrop [data-action^="cloud-"]').forEach(button => { button.disabled = true; });
    try { C.message = ''; await fn(); }
    catch (error) { C.message = friendly(error); C.paint(); }
    finally { C.actionBusy = false; document.querySelectorAll('#modal-backdrop [data-action^="cloud-"]').forEach(button => { button.disabled = false; }); }
  };
  C.login = () => perform(async () => {
    const email = document.getElementById('family-email').value.trim();
    const password = document.getElementById('family-password').value;
    if (!email || !password) { C.message = '请填写邮箱和密码。'; C.paint(); return; }
    const result = await client().auth.signInWithPassword({ email, password });
    if (result.error) throw result.error;
    const user = result.data.user;
    if (C.kitchen && C.kitchen.userId !== user.id) {
      await client().auth.signOut({ scope: 'local' });
      C.message = '请使用原账号登录，以保留这台设备的家庭库存记录。'; C.paint(); return;
    }
    C.account = { id: user.id, email: user.email }; C.message = '';
    if (C.kitchen) await C.sync();
    else { try { await findFamilies(); } catch (error) { C.message = friendly(error); } }
    C.show(); M.refresh();
  });
  C.logout = () => perform(async () => {
    if (C.outbox.size || C.busy) return M.toast('先完成同步，再退出登录');
    const result = await client().auth.signOut({ scope: 'local' });
    if (result.error) throw result.error;
    C.epoch++; clearTimeout(C.retry);
    if (C.channel) await client().removeChannel(C.channel);
    C.channel = null; C.account = null; C.existing = []; C.message = ''; C.baseline = snapshot(); C.show(); M.refresh();
  });
  C.create = () => perform(async () => {
    if (C.kitchen) return;
    const name = document.getElementById('family-name').value.trim() || '我们的厨房';
    const userId = await authenticated();
    const items = M.state.pantry.map(ingredient => operation(ingredient, true, M.state.priority.includes(ingredient)));
    const result = await client().rpc('med_create_kitchen', { p_name: name, p_items: items });
    if (result.error) throw result.error;
    C.kitchen = { ...result.data, userId }; C.outbox.clear(); C.baseline = snapshot(); C.epoch++; remember();
    await C.sync(); M.refresh(); C.show();
  });
  C.join = () => perform(async () => {
    if (C.kitchen) return;
    const code = document.getElementById('family-join-code').value.replace(/[\s-]/g, '').toUpperCase();
    if (!/^[A-F0-9]{32}$/.test(code)) { C.message = '请粘贴完整的家庭邀请码。'; C.paint(); return; }
    const userId = await authenticated();
    const result = await client().rpc('med_join_kitchen', { p_code: code });
    if (result.error) throw result.error;
    const stock = await client().from('med_inventory').select('ingredient,available,priority').eq('kitchen_id', result.data.id);
    if (stock.error) throw stock.error;
    // Retain the original inventory in exported backups before switching the active view.
    M.state.localPantry = { pantry: [...M.state.pantry], priority: [...M.state.priority] };
    C.kitchen = { ...result.data, code, userId }; C.outbox.clear(); C.baseline = snapshot(); C.epoch++; remember();
    apply(stock.data);
    await C.sync(); M.refresh(); C.show();
  });
  C.openExisting = id => perform(async () => {
    if (C.kitchen || !C.account) return;
    const kitchen = C.existing.find(item => item.id === id);
    if (!kitchen) return;
    const userId = await authenticated();
    const stock = await client().from('med_inventory').select('ingredient,available,priority').eq('kitchen_id', id);
    if (stock.error) throw stock.error;
    M.state.localPantry = { pantry: [...M.state.pantry], priority: [...M.state.priority] };
    C.kitchen = { ...kitchen, userId }; C.outbox.clear(); C.baseline = snapshot(); C.epoch++; remember();
    apply(stock.data); await C.sync(); M.refresh(); C.show();
  });
  C.copy = async () => {
    try { await navigator.clipboard.writeText(C.kitchen.code); M.toast('邀请码已复制'); }
    catch { const input = document.getElementById('family-invite'); input.focus(); input.select(); M.toast('长按选中的邀请码即可复制'); }
  };
  C.leave = () => {
    if (C.outbox.size || C.busy) return M.toast('先完成同步，再退出家庭库存');
    M.sheet('退出家庭库存？', '<p class="panel-subtitle">本机保留当前食材记录，之后不再接收家人的修改。</p><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">取消</button><button class="primary-button" data-action="cloud-leave-confirm">退出</button></div>', 'cloud');
  };
  C.confirmLeave = () => perform(async () => {
    if (C.outbox.size || C.busy) return M.toast('先完成同步，再退出家庭库存');
    const result = await client().rpc('med_leave_kitchen', { p_kitchen: C.kitchen.id });
    if (result.error) throw result.error;
    C.epoch++; clearTimeout(C.retry);
    if (C.channel) await client().removeChannel(C.channel);
    C.channel = null; C.kitchen = null; C.message = ''; C.outbox.clear(); C.baseline = snapshot(); localStorage.removeItem(KEY);
    M.closeSheet(); M.refresh(); M.toast('已退出，当前食材保留在本机');
  });
  C.preserveSharedState = parsed => { if (C.kitchen && C.account) { parsed.pantry = [...M.state.pantry]; parsed.priority = [...M.state.priority]; } return parsed; };
  C.showLocalBackup = () => {
    const backup = M.state.localPantry;
    if (!backup) return;
    M.sheet('本机食材副本', `<p class="panel-subtitle">加入家庭前的 ${backup.pantry.length} 种食材</p><div class="pantry-chips">${backup.pantry.map(name => `<span class="ingredient-chip">${e(M.ingredientLabel(name))}</span>`).join('')}</div><p class="small-note">导出备份会一并保存这份副本。</p><button class="secondary-button block-button" data-action="export">导出备份</button>${!C.kitchen || !C.account ? '<button class="primary-button block-button" style="margin-top:12px" data-action="cloud-restore-local">恢复到本机库存</button>' : '<p class="small-note">退出家庭库存后，可恢复到本机库存。</p>'}`);
  };
  C.restoreLocal = () => {
    if (!M.state.localPantry || (C.kitchen && C.account)) return;
    const backup = M.state.localPantry;
    M.state.localPantry = { pantry: [...M.state.pantry], priority: [...M.state.priority] };
    M.state.pantry = [...backup.pantry]; M.state.priority = [...backup.priority];
    C.baseline = snapshot(); M.save(); M.closeSheet(); M.refresh(); M.toast('已恢复，切换前的库存仍保留副本');
  };
  C.start = () => {
    if (!window.MEDITERRANEAN_CLOUD?.enabled) return;
    client().auth.getSession().then(result => {
      const user = result.data.session?.user;
    if (user) C.account = { id: user.id, email: user.email };
    if (C.kitchen && C.account) C.sync();
      else if (C.account) findFamilies().then(C.paint).catch(() => {});
      C.paint();
    }).catch(() => {});
    window.addEventListener('online', () => C.sync());
    window.addEventListener('offline', C.paint);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) C.sync(); });
    setInterval(() => { if (C.kitchen && C.account && !document.hidden && !C.realtime) C.sync(); }, 20000);
  };
})();
