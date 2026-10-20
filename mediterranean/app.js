/* Local interactions and optional authenticated family inventory. */
(() => {
  'use strict';
  const M = window.Med;
  if (!M) return;
  const e = M.esc;
  const overlay = document.getElementById('overlay-root');
  M.refresh = () => { const y = scrollY; M.render(); scrollTo(0, y); };
  const setInert = value => { document.querySelectorAll('.app-shell,.tabbar').forEach(x => x.inert = value); const cook = document.getElementById('cook-screen'); if (cook) cook.inert = Boolean(M.ui.modal); };
  M.closeSheet = () => {
    document.getElementById('modal-backdrop')?.remove(); M.ui.modal = null;
    document.body.classList.remove('modal-open'); setInert(Boolean(M.ui.cook));
    if (M.ui.focusReturn?.isConnected && !M.ui.focusReturn.closest('[inert]')) M.ui.focusReturn.focus({ preventScroll: true });
  };
  M.sheet = (title, body, name = 'sheet') => {
    M.closeSheet(); M.ui.focusReturn = document.activeElement; M.ui.modal = name;
    overlay.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" id="modal-backdrop"><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title"><div class="sheet-handle"></div><header class="sheet-header"><h2 id="sheet-title">${title}</h2><button class="icon-button" data-action="close-sheet" aria-label="关闭面板">${M.icon('close')}</button></header><div class="sheet-body">${body}</div></section></div>`);
    document.body.classList.add('modal-open'); setInert(true);
    document.querySelector('#modal-backdrop .sheet-header button')?.focus({ preventScroll: true });
  };
  M.settings = () => {
    const status = M.ui.offline;
    M.sheet('设置', `<div class="settings-label">显示</div><div class="settings-group"><div class="settings-row"><span>外观</span><select id="theme-select" aria-label="选择外观">${[['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(([id, label]) => `<option value="${id}" ${M.state.theme === id ? 'selected' : ''}>${label}</option>`).join('')}</select></div></div>
      <div class="settings-label">共享</div><div class="settings-group"><div class="settings-row"><span>当前身份</span><small data-cloud-role>${M.cloud.isAdmin() ? '管理员' : '已授权设备'}</small></div><button class="settings-row" data-action="cloud-invite" data-cloud-admin ${M.cloud.isAdmin() ? '' : 'hidden'}><span>生成邀请码</span><small>10 分钟有效</small>${M.icon('chevron')}</button><button class="settings-row" data-action="cloud-settings"><span>共享库存</span><small data-cloud-status>${e(M.cloud.status())}</small>${M.icon('chevron')}</button></div>
      <p class="family-error" role="status" data-cloud-error ${M.cloud.message ? '' : 'hidden'}>${e(M.cloud.message)}</p><div class="settings-label">个人数据</div><div class="settings-group"><button class="settings-row" data-action="export"><span>导出备份</span>${M.icon('download')}</button><button class="settings-row" data-action="import"><span>导入备份</span>${M.icon('upload')}</button></div><div class="settings-label">离线与安装</div><div class="settings-group"><div class="settings-row"><span>${status.ready ? '离线就绪' : status.images ? `已缓存 ${status.images} / ${M.recipes.length} 张配图` : '正在准备离线内容'}</span>${M.icon(status.ready ? 'check' : 'download')}</div><button class="settings-row" data-action="install-help"><span>添加到 iPhone 主屏幕</span>${M.icon('chevron')}</button></div><p class="small-note">库存自动同步，个人记录建议定期备份。</p><div class="settings-about">Mediterranean · 地中海<br>${M.recipes.length} 道菜谱</div><input type="file" id="backup-input" accept="application/json,.json" hidden>`, 'settings');
    if (M.state.localPantry) document.querySelector('#modal-backdrop [data-action="export"]')?.closest('.settings-group').insertAdjacentHTML('beforeend', `<button class="settings-row" data-action="cloud-local-backup"><span>本机食材副本</span>${M.icon('pantry')}</button>`);
  };
  M.shoppingMenu = () => {
    const done = M.state.shopping.filter(x => x.done).length;
    M.sheet('清单管理', `<div class="settings-group"><button class="settings-row" data-action="shopping-to-pantry" ${done ? '' : 'disabled'}><span>已购食材入库</span>${M.icon('pantry')}</button><button class="settings-row" data-action="shopping-clear" ${done ? '' : 'disabled'}><span>清理已购项目</span>${M.icon('trash')}</button>${M.ui.shoppingUndo?.length ? `<button class="settings-row" data-action="shopping-undo"><span>撤销上次删除</span>${M.icon('back')}</button>` : ''}</div>`, 'shopping-menu');
  };
  M.showShoppingPicker = r => {
    M.ui.pickerRecipe = r.id;
    const rows = r.ingredients.map((i, index) => ({ ...i, index })).filter(i => !i.options.every(x => x === '水'));
    M.sheet('这道菜，需要买什么', `<p class="panel-subtitle">${e(r.title)} · 1 人份</p><div class="add-shopping-list">${rows.map(i => { const exists = M.state.shopping.some(x => x.key === `${r.id}:${i.index}`); return `<label class="ingredient-row"><input type="checkbox" name="shop-pick" value="${i.index}" ${!M.hasIngredient(i) && !i.optional && !exists ? 'checked' : ''} ${exists ? 'disabled' : ''}><span class="ingredient-text">${e(i.raw)}</span>${exists ? '<span class="available-tag">已在清单</span>' : M.hasIngredient(i) ? '<span class="available-tag">家里有</span>' : ''}</label>`; }).join('')}</div><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">暂时不用</button><button class="primary-button" data-action="confirm-shopping">加入清单</button></div>`, 'shopping-picker');
  };
  M.confirmShopping = () => {
    const r = M.getRecipe(M.ui.pickerRecipe);
    if (!r) return;
    const selected = [...document.querySelectorAll('input[name="shop-pick"]:checked')].filter(x => !x.disabled);
    if (!selected.length) return M.toast('先勾选需要采购的食材');
    for (const input of selected) { const index = Number(input.value); const i = r.ingredients[index]; const key = `${r.id}:${index}`; if (!i || M.state.shopping.some(x => x.key === key)) continue; M.state.shopping.push({ key, name: i.name, raw: i.raw, group: i.group, recipeId: r.id, done: false }); }
    M.save(); M.closeSheet(); M.refresh(); M.toast(`已加入 ${selected.length} 项食材`);
  };
  M.showCustomShopping = () => M.sheet('补充一项采购', `<label class="small-note" for="custom-shopping-name">食材名称</label><div class="search-box" style="margin:8px 0 16px"><input id="custom-shopping-name" maxlength="40" placeholder="例如：香蕉" autocomplete="off"></div><label class="small-note" for="custom-shopping-amount">数量或备注（选填）</label><div class="search-box" style="margin-top:8px"><input id="custom-shopping-amount" maxlength="100" placeholder="例如：3 根" autocomplete="off"></div><div class="sheet-actions"><button class="primary-button" data-action="confirm-custom-shopping">加入清单</button></div>`, 'custom-shopping');
  M.addCustomShopping = (name, amount) => {
    name = M.canonicalIngredient(name);
    M.state.shopping.push({ key: 'custom:' + crypto.randomUUID(), name, raw: amount || '按需购买', group: M.ingredientGroup(name), recipeId: null, done: false });
    M.ui.pendingShoppingAmount = null; M.save(); M.closeSheet(); M.refresh(); M.toast('已加入采购清单');
  };
  M.updatePantry = name => {
    const keepAdding = !M.state.pantry.length && !M.ui.modal;
    name = M.canonicalIngredient(name);
    const index = M.state.pantry.indexOf(name);
    if (index >= 0) { M.state.pantry.splice(index, 1); M.state.priority = M.state.priority.filter(x => x !== name); }
    else M.state.pantry.push(name);
    M.save(); M.refresh(); M.paintCatalog();
    if (keepAdding) M.showPantryAdd();
  };
  M.paintCatalog = () => {
    const focusedName = document.activeElement?.dataset?.name;
    document.querySelectorAll('[data-pantry-catalog]').forEach(target => { target.innerHTML = M.viewPantryCatalog(); });
    const family = M.catalogFamilies.find(f => f.name === M.ui.familyName);
    const choices = document.getElementById('family-choices');
    if (choices && family) choices.innerHTML = family.members.map(name => M.ingredients.find(i => i.name === name)).filter(Boolean).map(M.catalogChoice).join('');
    if (focusedName) [...document.querySelectorAll('[data-action="pantry-toggle"]')].find(n => n.dataset.name === focusedName)?.focus({ preventScroll: true });
  };
  M.showPantryAdd = () => M.sheet('添加食材', M.viewPantryAdd(), 'pantry-add');
  M.showPantryFamily = name => {
    const family = M.catalogFamilies.find(f => f.name === name);
    if (!family) return;
    M.ui.familyName = name;
    M.sheet(name, '<p class="panel-subtitle">按家里的实际种类选择，可多选。</p><div class="pantry-chips family-choices" id="family-choices"></div><button class="text-link" data-action="pantry-add">返回食材目录</button>', 'pantry-family');
    M.paintCatalog();
  };
  M.showPantryManage = name => {
    const group = M.inventoryGroups().find(g => g.name === name);
    if (!group) return;
    M.ui.manageName = name;
    M.sheet(group.name, group.items.map(i => `<div class="pantry-manage-row"><strong>${e(M.ingredientLabel(i.name))}</strong><button class="secondary-button ${M.state.priority.includes(i.name) ? 'is-priority' : ''}" data-action="priority" data-name="${e(i.name)}" aria-pressed="${M.state.priority.includes(i.name)}">${M.state.priority.includes(i.name) ? '取消优先' : '优先用掉'}</button><button class="text-link" data-action="pantry-remove" data-name="${e(i.name)}">标记用完</button></div>`).join(''), 'pantry-manage');
  };
  M.showCook = (r, step) => {
    M.closeSheet(); const steps = M.cookSteps(r);
    const index = Math.max(0, Math.min(step ?? M.state.progress[r.id]?.step ?? 0, steps.length - 1));
    M.ui.cook = { id: r.id, step: index }; M.state.progress[r.id] = { step: index }; M.save();
    document.body.classList.add('cook-active'); document.getElementById('cook-screen')?.remove();
    const durations = [...steps[index].text.matchAll(/(\d+(?:\.\d+)?)\s*(?:[—–~～-]\s*(\d+(?:\.\d+)?))?\s*(分钟|秒)/g)].map(x => ({ seconds: Number(x[2] || x[1]) * (x[3] === '分钟' ? 60 : 1), label: (x[2] || x[1]) + x[3] })).filter(x => x.seconds >= 10 && x.seconds <= 7200);
    const unique = [...new Map(durations.map(x => [x.seconds, x])).values()];
    const current = steps[index];
    overlay.insertAdjacentHTML('beforeend', `<section id="cook-screen" class="cook-screen" role="dialog" aria-modal="true" aria-label="${e(r.title)}烹饪模式"><div class="cook-top"><div><p>${e(r.title)}</p></div><button class="icon-button" data-action="close-cook" aria-label="离开并保存烹饪进度">${M.icon('close')}</button></div><div class="cook-progress" aria-label="第 ${index + 1} 步，共 ${steps.length} 步">${steps.map((_, i) => `<span class="${i <= index ? 'passed' : ''}"></span>`).join('')}</div><div class="cook-body"><div class="cook-step-number">${steps[index].label} · ${String(index + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}</div><h1 tabindex="-1" id="current-cook-step">${e(steps[index].text)}</h1>${current.ingredients.length ? `<div class="cook-mise"><span>备料用量</span><div>${current.ingredients.map(i => `<span>${e(i.raw)}</span>`).join('')}</div></div>` : ''}${current.notes.length ? `<div class="cook-notes">${current.notes.map(note => `<p>${e(note)}</p>`).join('')}</div>` : ''}${current.checkpoint ? `<div class="cook-checkpoint">${M.icon('check-circle')}<span>${e(current.checkpoint)}</span></div>` : ''}<div class="cook-support"><button class="secondary-button" data-action="cook-ingredients">${M.icon('list')}查看食材</button>${unique.map(d => `<button class="secondary-button" data-action="timer-start" data-seconds="${d.seconds}">${M.icon('clock')}计时 ${d.label}</button>`).join('')}${'wakeLock' in navigator ? `<button class="secondary-button" data-action="wake-lock">${M.icon('sun')}${M.ui.keepAwake ? '已开启常亮' : '保持亮屏'}</button>` : ''}</div><div id="timer-slot"></div></div><div class="cook-bottom"><button class="secondary-button" data-action="cook-prev" ${index === 0 ? 'disabled' : ''}>上一步</button><button class="primary-button" data-action="cook-next">${index === steps.length - 1 ? '做好了' : '下一步'}${M.icon(index === steps.length - 1 ? 'check' : 'arrow')}</button></div></section>`);
    setInert(true); document.getElementById('current-cook-step')?.focus({ preventScroll: true }); M.paintTimer();
  };
  M.closeCook = () => { M.closeSheet(); M.ui.cook = null; M.ui.keepAwake = false; M.ui.wakeLock?.release().catch(() => {}); document.getElementById('cook-screen')?.remove(); document.body.classList.remove('cook-active'); setInert(false); M.refresh(); };
  M.finishCook = r => {
    delete M.state.progress[r.id]; if (M.state.timer?.recipeId === r.id) M.state.timer = null; M.save();
    const cook = document.getElementById('cook-screen');
    cook.innerHTML = `<div class="cook-top"><span></span><button class="icon-button" data-action="close-cook" aria-label="返回菜谱">${M.icon('close')}</button></div><div class="cook-body"><div class="empty-state" style="border:0"><div class="empty-icon">${M.icon('check')}</div><h1 style="font-size:29px;line-height:1.5">这一餐，做好了。</h1><button class="secondary-button" data-action="used-up" data-id="${r.id}">标记用完的食材</button></div></div><button class="primary-button block-button" data-action="close-cook">返回菜谱</button>`;
    cook.querySelector('h1')?.setAttribute('tabindex', '-1'); cook.querySelector('h1')?.focus();
  };
  M.paintTimer = () => {
    const slot = document.getElementById('timer-slot'); if (!slot) return;
    const timer = M.state.timer; if (!timer || timer.recipeId !== M.ui.cook?.id) { slot.innerHTML = ''; return; }
    const seconds = Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000));
    const label = seconds ? `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : '时间到';
    slot.innerHTML = `<div class="timer-panel">${M.icon('clock')}<div><strong role="timer" aria-live="off">${label}</strong><small>第 ${timer.step + 1} 步</small></div><button data-action="timer-stop">结束计时</button></div><p class="small-note">锁屏后不保证提醒</p>`;
  };
  setInterval(M.paintTimer, 1000);
  const actions = {
    'access-mode': el => { M.cloud.mode = el.dataset.mode; M.cloud.message = ''; M.cloud.renderGate(); },
    'cloud-local-backup': () => M.cloud.showLocalBackup(), 'cloud-merge-local': () => M.cloud.mergeLocal(),
    'cloud-login': () => M.cloud.login(), 'cloud-logout': () => M.cloud.logout(),
    'cloud-settings': () => M.cloud.show(), 'cloud-join': () => M.cloud.join(), 'cloud-invite': () => M.cloud.issueInvite(),
    'cloud-copy': () => M.cloud.copy(), 'cloud-sync': () => M.cloud.sync(), 'cloud-logout-confirm': () => M.cloud.confirmLogout(),
    'shopping-menu': M.shoppingMenu,
    settings: M.settings, 'close-sheet': M.closeSheet, 'shop-recipe': el => M.showShoppingPicker(M.getRecipe(el.dataset.id)), 'confirm-shopping': M.confirmShopping,
    favorite: el => { const id = el.dataset.id; if (!M.getRecipe(id)) return; M.state.favorites = M.isFavorite(id) ? M.state.favorites.filter(x => x !== id) : [...M.state.favorites, id]; M.save(); M.refresh(); },
    'load-more': () => { M.ui.limit += M.ui.pageSize; M.refresh(); },
    'clear-search': el => { const input = el.closest('.search-box').querySelector('input'); input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); },
    'pantry-add': M.showPantryAdd, 'pantry-family': el => M.showPantryFamily(el.dataset.name), 'pantry-manage': el => M.showPantryManage(el.dataset.name),
    'pantry-toggle': el => M.updatePantry(el.dataset.name),
    'pantry-remove': el => { const name = el.dataset.name; if (!M.state.pantry.includes(name)) return; M.ui.pantryUndo = { name, priority: M.state.priority.includes(name) }; M.state.pantry = M.state.pantry.filter(x => x !== name); M.state.priority = M.state.priority.filter(x => x !== name); M.save(); M.closeSheet(); M.refresh(); M.toast('已标记用完，可在食材页撤销'); },
    'pantry-undo': () => { const undo = M.ui.pantryUndo; if (!undo) return; M.state.pantry = M.uniqueIngredients([...M.state.pantry, undo.name]); if (undo.priority) M.state.priority = M.uniqueIngredients([...M.state.priority, undo.name]); M.ui.pantryUndo = null; M.save(); M.refresh(); },
    'pantry-custom': () => { const name = M.canonicalIngredient(M.ui.pantryQuery.trim().slice(0, 40)); if (!name || M.ingredients.some(i => M.searchIngredient(i.name, name))) return M.toast('请先选择目录中的食材'); if (M.state.pantry.includes(name)) return M.toast('这项食材已经添加'); M.state.pantry.push(name); M.save(); M.closeSheet(); M.refresh(); M.toast('已添加'); },
    'pantry-group': el => { M.ui.filterGroup = el.dataset.group; M.ui.pantryQuery = ''; if (M.ui.modal === 'pantry-add') M.showPantryAdd(); else M.refresh(); },
    priority: el => { const name = el.dataset.name; if (!M.state.pantry.includes(name)) return; M.state.priority = M.state.priority.includes(name) ? M.state.priority.filter(x => x !== name) : [...M.state.priority, name]; M.save(); M.refresh(); if (M.ui.modal === 'pantry-manage') M.showPantryManage(M.ui.manageName); },
    'shopping-custom': M.showCustomShopping,
    'confirm-custom-shopping': () => {
      const name = M.canonicalIngredient(document.getElementById('custom-shopping-name').value.trim()), amount = document.getElementById('custom-shopping-amount').value.trim();
      if (!name) return M.toast('请填写食材名称');
      const choices = M.ingredients.filter(i => M.searchIngredient(i.name, name));
      if (!M.ingredients.some(i => i.name === name) && choices.length) {
        M.ui.pendingShoppingAmount = amount;
        M.sheet('选择具体食材', '<p class="panel-subtitle">请选择家里需要的种类。</p><div class="family-choices">' + choices.map(i => '<button class="ingredient-chip" data-action="shopping-custom-choice" data-name="' + e(i.name) + '">' + e(M.ingredientLabel(i.name)) + '</button>').join('') + '</div>');
        return;
      }
      M.addCustomShopping(name, amount);
    },
    'shopping-custom-choice': el => M.addCustomShopping(el.dataset.name, M.ui.pendingShoppingAmount || ''),
    'shopping-remove': el => { const key = decodeURIComponent(el.dataset.key); M.ui.shoppingUndo = M.state.shopping.filter(x => x.group + '|' + x.name === key); M.state.shopping = M.state.shopping.filter(x => x.group + '|' + x.name !== key); M.save(); M.refresh(); M.toast('已移除，可在清单管理中撤销'); },
    'shopping-undo': () => { for (const x of M.ui.shoppingUndo || []) if (!M.state.shopping.some(i => i.key === x.key)) M.state.shopping.push(x); M.ui.shoppingUndo = null; M.save(); M.closeSheet(); M.refresh(); },
    'shopping-clear': () => M.sheet('清理已购项目？', '<p class="panel-subtitle">清理后，已购项目会从清单中移除。尚未入库的食材不会自动加入食材库。</p><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">取消</button><button class="primary-button" data-action="confirm-clear-shopping">清理已购</button></div>'),
    'confirm-clear-shopping': () => { M.ui.shoppingUndo = M.state.shopping.filter(x => x.done); M.state.shopping = M.state.shopping.filter(x => !x.done); M.save(); M.closeSheet(); M.refresh(); M.toast('已清理已购项目'); },
    'shopping-to-pantry': () => { const items = [...new Set(M.state.shopping.filter(x => x.done).flatMap(x => { const original = x.recipeId ? M.getRecipe(x.recipeId)?.ingredients[Number(x.key.split(':')[1])] : null; return original?.all ? original.options : [x.name]; }))]; for (const name of items) if (!M.state.pantry.includes(name)) M.state.pantry.push(name); M.save(); M.closeSheet(); M.refresh(); M.toast(`已入库 ${items.length} 种食材`); },
    cook: el => M.showCook(M.getRecipe(el.dataset.id)), 'close-cook': M.closeCook,
    'cook-prev': () => { const c = M.ui.cook; if (c) M.showCook(M.getRecipe(c.id), c.step - 1); },
    'cook-next': () => { const c = M.ui.cook; if (!c) return; const r = M.getRecipe(c.id); if (c.step === M.cookSteps(r).length - 1) M.finishCook(r); else M.showCook(r, c.step + 1); },
    'cook-ingredients': () => { const r = M.getRecipe(M.ui.cook.id); M.sheet('随时看一眼食材', `<p class="panel-subtitle">${e(r.title)} · 1 人份</p><div class="ingredient-list">${M.ingredientRows(r)}</div>`, 'cook-ingredients'); },
    'timer-start': el => { const c = M.ui.cook; if (!c) return; if (M.state.timer && M.state.timer.deadline > Date.now()) return M.toast('已有计时，请先结束当前计时'); M.state.timer = { recipeId: c.id, step: c.step, deadline: Date.now() + Number(el.dataset.seconds) * 1000 }; M.save(); M.paintTimer(); },
    'timer-stop': () => { M.state.timer = null; M.save(); M.paintTimer(); },
    'wake-lock': async () => { if (!('wakeLock' in navigator)) return; try { if (M.ui.keepAwake) { M.ui.keepAwake = false; await M.ui.wakeLock?.release(); } else { M.ui.wakeLock = await navigator.wakeLock.request('screen'); M.ui.keepAwake = true; } M.showCook(M.getRecipe(M.ui.cook.id), M.ui.cook.step); } catch { M.toast('当前设备暂时无法保持亮屏'); } },
    'used-up': el => { const r = M.getRecipe(el.dataset.id); const names = M.uniqueIngredients(r.ingredients.flatMap(i => i.options)).filter(x => M.state.pantry.includes(x)); M.sheet('哪些食材用完了？', `<p class="panel-subtitle">只勾选已经用完的，其他食材会继续保留。</p>${names.length ? `<div class="ingredient-list">${names.map(name => `<label class="ingredient-row"><input type="checkbox" name="used-up" value="${e(name)}"><span class="ingredient-text">${e(M.ingredientLabel(name))}</span></label>`).join('')}</div><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">跳过</button><button class="primary-button" data-action="confirm-used-up">更新食材库</button></div>` : '<p class="small-note">这道菜使用的食材还没有登记，无需更新。</p>'}`); },
    'confirm-used-up': () => { const names = [...document.querySelectorAll('input[name="used-up"]:checked')].map(x => x.value); M.state.pantry = M.state.pantry.filter(x => !names.includes(x)); M.state.priority = M.state.priority.filter(x => !names.includes(x)); M.save(); M.closeSheet(); M.toast(names.length ? `已更新 ${names.length} 种食材` : '已保留全部食材'); },
    export: () => { const blob = new Blob([JSON.stringify({ ...M.state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Mediterranean-backup-' + new Date().toLocaleDateString('sv-SE') + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); M.toast('备份已准备下载'); },
    import: () => document.getElementById('backup-input')?.click(),
    'confirm-import': () => { if (!M.ui.pendingImport) return; M.state = M.cloud.preserveSharedState(M.ui.pendingImport); M.ui.pendingImport = null; M.save(); M.applyTheme(); M.closeSheet(); M.refresh(); M.toast('已恢复备份'); },
    'install-help': () => M.sheet('放到 iPhone 主屏幕', '<div class="note-box"><strong>用 Safari 打开已发布的网址</strong>点击分享按钮，选择“添加到主屏幕”，保留“作为网页 App 打开”，再点击添加。</div><p class="small-note">首次联网打开后，等待设置中的离线状态变为就绪。此后可以从桌面图标打开。</p><p class="small-note">如果 Safari 和主屏幕应用的数据没有共享，可使用导出与导入备份迁移。</p>'),
  };
  document.addEventListener('click', event => {
    if (event.target.id === 'modal-backdrop') return M.closeSheet();
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    if (!M.cloud.canEnter() && !['access-mode', 'cloud-login', 'cloud-join', 'export'].includes(el.dataset.action)) return;
    const action = actions[el.dataset.action]; if (action) { event.preventDefault(); Promise.resolve(action(el)).catch(() => M.toast('这次操作没有完成，请重试')); }
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-access-form]');
    if (!form) return;
    event.preventDefault();
    if (form.dataset.accessForm === 'admin') M.cloud.login(); else M.cloud.join();
  });
  document.addEventListener('toggle', event => {
    const disclosure = event.target;
    if (disclosure.matches?.('[data-ingredient-disclosure]') && disclosure.isConnected) M.ui.ingredientCollapsed[disclosure.dataset.id] = !disclosure.open;
  }, true);
  let searchTimeout;
  document.addEventListener('input', event => {
    const input = event.target;
    if (!input.matches('[data-search]')) return;
    if (input.dataset.search === 'pantry') { M.ui.pantryQuery = input.value.slice(0, 60); M.paintCatalog(); return; }
    clearTimeout(searchTimeout); const value = input.value.slice(0, 100); const position = input.selectionStart;
    searchTimeout = setTimeout(() => { M.ui.limit = M.ui.pageSize; M.ui.focusSearch = { kind: 'recipes', position }; const hash = M.url('browse', { ...(M.route().path === 'browse' ? M.currentOptions() : {}), q: value }); if (M.route().path !== 'browse') M.go(hash); else { history.replaceState(null, '', hash); M.ui.route = hash; M.refresh(); } }, 240);
  });
  document.addEventListener('change', async event => {
    const input = event.target;
    if (input.dataset.filter) { M.ui.limit = M.ui.pageSize; M.go(M.url('browse', { ...M.currentOptions(), [input.dataset.filter]: input.value })); }
    if (input.dataset.prepared) M.ui.prepared[input.dataset.prepared] = input.checked;
    if (input.dataset.shopping) { const key = decodeURIComponent(input.dataset.shopping); for (const item of M.state.shopping) if (item.group + '|' + item.name === key) item.done = input.checked; M.save(); M.refresh(); }
    if (input.id === 'theme-select') { M.state.theme = input.value; M.applyTheme(); M.save(); }
    if (input.id === 'backup-input' && input.files[0]) { const file = input.files[0]; if (file.size > 2000000) return M.toast('备份文件过大，请检查文件'); try { const parsed = M.validate(JSON.parse(await file.text())); M.ui.pendingImport = parsed; M.sheet('恢复这份备份？', `<p class="panel-subtitle">包含 ${parsed.favorites.length} 道收藏、${parsed.pantry.length} 种食材、${parsed.shopping.length} 项采购。<br>${M.cloud?.kitchen ? '恢复本机记录，家庭库存保持同步状态。' : '恢复后将替换当前个人数据。'}</p><div class="sheet-actions"><button class="secondary-button" data-action="close-sheet">取消</button><button class="primary-button" data-action="confirm-import">确认恢复</button></div>`); } catch { M.toast('无法识别这份备份，请选择本应用导出的 JSON'); } }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { if (M.ui.modal) M.closeSheet(); else if (M.ui.cook) M.closeCook(); }
    if (event.key !== 'Tab') return;
    const dialog = document.querySelector('#modal-backdrop .sheet') || document.getElementById('cook-screen'); if (!dialog) return;
    const items = [...dialog.querySelectorAll('button:not(:disabled),a,input:not(:disabled),select,[tabindex="0"]')].filter(x => x.offsetParent !== null);
    if (!items.length) return;
    if (event.shiftKey && (document.activeElement === items[0] || !items.includes(document.activeElement))) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && (document.activeElement === items.at(-1) || !dialog.contains(document.activeElement))) { event.preventDefault(); items[0].focus(); }
  });
  window.addEventListener('hashchange', () => {
    clearTimeout(searchTimeout); const previous = M.ui.route || '#home'; M.ui.positions[previous] = scrollY; M.ui.limits[previous] = M.ui.limit;
    if (M.route().id && !previous.startsWith('#recipe/')) M.ui.lastBrowse = previous;
    M.ui.route = location.hash || '#home'; M.ui.limit = M.ui.limits[M.ui.route] || M.ui.pageSize;
    if (M.ui.modal) M.closeSheet(); if (M.ui.cook) M.closeCook(); M.render();
    scrollTo(0, M.ui.positions[M.ui.route] || 0);
  });
  document.addEventListener('visibilitychange', async () => { M.paintTimer(); if (!document.hidden && M.ui.keepAwake && M.ui.cook) { try { M.ui.wakeLock = await navigator.wakeLock.request('screen'); } catch {} } });
  document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) { const img = event.target; img.style.opacity = '.15'; img.parentElement?.classList.add('image-fallback'); } }, true);
  M.ui.route = location.hash || '#home'; M.render();
  M.cloud?.start();
  const offlineStatus = async () => { try { const names = await caches.keys(); const name = names.filter(x => x.startsWith('mediterranean:' + new URL('./', location.href).href + ':')).at(-1); if (!name) return; const cache = await caches.open(name); const requests = await cache.keys(); M.ui.offline.images = requests.filter(x => /assets\/recipes\/\d+\.webp/.test(x.url)).length; M.ui.offline.ready = M.ui.offline.images === M.recipes.length; } catch {} };
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    // The worker activates and refreshes open pages automatically, including cooking mode.
    navigator.serviceWorker.addEventListener('controllerchange', offlineStatus);
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'APP_UPDATED') location.reload();
    });
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
      M.ui.registration = registration;
      const activateWaiting = () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      const watch = worker => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed') { activateWaiting(); offlineStatus(); }
        });
      };
      registration.addEventListener('updatefound', () => watch(registration.installing));
      watch(registration.installing); activateWaiting();
      const check = () => {
        if (navigator.onLine && !document.hidden) registration.update().catch(() => {});
      };
      window.addEventListener('online', check);
      document.addEventListener('visibilitychange', check);
      setInterval(check, 60000);
      return navigator.serviceWorker.ready;
    }).then(offlineStatus).catch(() => { M.ui.offline.error = true; });
  }
})();
