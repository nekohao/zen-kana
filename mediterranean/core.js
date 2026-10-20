/* Shared application state, ingredient matching, and small UI primitives. */
(() => {
  'use strict';
  const data = window.MEDITERRANEAN_DATA;
  if (!data) return;
  const M = window.Med = { data, recipes: data.recipes, categories: data.categories };
  const KEY = 'mediterranean.v1';
  const defaults = () => ({ version: 1, favorites: [], pantry: [], priority: [], localPantry: null, shopping: [], progress: {}, recent: [], theme: 'system', timer: null });
  const validIds = new Set(M.recipes.map(r => r.id));
  M.esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  M.normalize = value => String(value).trim().toLowerCase().replace(/\s+/g, '').replace(/西红柿/g, '番茄').replace(/马铃薯/g, '土豆');
  const catalog = window.MEDITERRANEAN_INGREDIENTS;
  const ingredientAliases = catalog.aliases;
  M.canonicalIngredient = value => { const name = String(value).trim(); return ingredientAliases[name] || name; };
  M.uniqueIngredients = names => [...new Set(names.map(M.canonicalIngredient).filter(Boolean))];
  M.ingredientLabel = name => name === '甜椒' ? '甜椒（彩椒）' : name;
  M.searchIngredient = (name, query) => {
    const canonical = M.canonicalIngredient(name);
    const family = catalog.families.find(f => f.members.includes(canonical));
    return [canonical, ...(catalog.searchTerms[canonical] || []), family?.name || '', ...(family?.terms || []), ...Object.keys(ingredientAliases).filter(alias => ingredientAliases[alias] === canonical)].some(term => M.normalize(term).includes(M.normalize(query)));
  };
  const catalogGroups = { '干百里香': '调味与香草', '土豆': '蔬菜水果', '四季豆': '蔬菜水果' };
  M.ingredients = [...new Map(data.ingredients.map(i => { const name = M.canonicalIngredient(i.name); return [name, { ...i, name, group: catalogGroups[name] || i.group }]; })).values()];
  M.ingredientGroup = (name, fallback = '其他') => M.ingredients.find(i => i.name === M.canonicalIngredient(name))?.group || fallback;
  M.catalogFamilies = catalog.families;
  M.groupCatalog = list => {
    const grouped = new Map();
    for (const item of list) {
      const family = catalog.families.find(f => f.members.includes(item.name));
      const key = family?.name || item.name;
      if (!grouped.has(key)) grouped.set(key, { name: key, family, items: [] });
      grouped.get(key).items.push(item);
    }
    return [...grouped.values()];
  };
  M.validate = input => {
    if (!input || input.version !== 1 || typeof input !== 'object') throw Error('不是有效的 Mediterranean 备份');
    const out = defaults();
    const strings = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && x.length < 100))].slice(0, 500) : [];
    out.favorites = strings(input.favorites).filter(x => validIds.has(x));
    out.recent = strings(input.recent).filter(x => validIds.has(x)).slice(0, 10);
    out.pantry = M.uniqueIngredients(strings(input.pantry));
    out.priority = M.uniqueIngredients(strings(input.priority)).filter(x => out.pantry.includes(x));
    if (input.localPantry && typeof input.localPantry === 'object') {
      const pantry = M.uniqueIngredients(strings(input.localPantry.pantry));
      out.localPantry = { pantry, priority: M.uniqueIngredients(strings(input.localPantry.priority)).filter(x => pantry.includes(x)) };
    }
    out.theme = ['system', 'light', 'dark'].includes(input.theme) ? input.theme : 'system';
    if (Array.isArray(input.shopping)) out.shopping = input.shopping.filter(x => x && typeof x.key === 'string' && x.key.length < 200 && typeof x.name === 'string' && x.name.length < 100 && typeof x.raw === 'string' && x.raw.length < 300 && (x.recipeId == null || validIds.has(x.recipeId))).slice(0, 1500).map(x => ({ key: x.key, name: M.canonicalIngredient(x.name), raw: x.raw, group: typeof x.group === 'string' ? x.group.slice(0, 40) : '其他', recipeId: x.recipeId || null, done: Boolean(x.done) }));
    for (const [id, p] of Object.entries(input.progress || {})) if (validIds.has(id) && p && Number.isInteger(p.step) && p.step >= 0 && p.step < 100) out.progress[id] = { step: p.step };
    if (input.timer && validIds.has(input.timer.recipeId) && Number.isFinite(input.timer.deadline) && input.timer.deadline > Date.now() - 86400000 && input.timer.deadline < Date.now() + 86400000) out.timer = { recipeId: input.timer.recipeId, deadline: input.timer.deadline, step: Number(input.timer.step) || 0 };
    return out;
  };
  try { const saved = localStorage.getItem(KEY); M.state = saved ? M.validate(JSON.parse(saved)) : defaults(); }
  catch { M.state = defaults(); }
  M.ui = { pageSize: 16, limit: 16, limits: {}, filterGroup: '常用', pantryQuery: '', prepared: {}, ingredientCollapsed: {}, positions: {}, route: '', lastBrowse: '#home', cook: null, modal: null, offline: { ready: false, images: 0 }, focusReturn: null };
  M.save = () => {
    M.state.pantry = M.uniqueIngredients(M.state.pantry);
    M.state.priority = M.uniqueIngredients(M.state.priority).filter(name => M.state.pantry.includes(name));
    M.state.shopping.forEach(item => { item.name = M.canonicalIngredient(item.name); item.group = M.ingredientGroup(item.name, item.group); });
    try { localStorage.setItem(KEY, JSON.stringify(M.state)); }
    catch { if (!M.ui.storageWarned) { M.ui.storageWarned = true; M.toast('本机存储不可用，建议导出备份'); } }
    M.updateNav?.();
    M.cloud?.localChanged();
  };
  M.getRecipe = id => M.recipes.find(r => r.id === String(id));
  M.getCategory = id => M.categories.find(c => c.id === id);
  M.isFavorite = id => M.state.favorites.includes(String(id));
  M.hasIngredient = ing => {
    const available = value => value === '水' || M.state.pantry.some(x => M.normalize(M.canonicalIngredient(x)) === M.normalize(M.canonicalIngredient(value)));
    return ing.all ? ing.options.every(available) : ing.options.some(available);
  };
  M.match = r => {
    const required = r.ingredients.filter(i => !i.optional && !i.options.every(x => x === '水'));
    const missing = required.filter(i => !M.hasIngredient(i));
    const missingMain = missing.filter(i => !i.seasoning);
    const main = required.filter(i => !i.seasoning);
    const mainAvailable = main.length - missingMain.length;
    const mainCoverage = main.length ? mainAvailable / main.length : 0;
    const coverage = required.length ? (required.length - missing.length) / required.length : 0;
    const priority = required.filter(i => i.options.some(x => M.state.priority.includes(M.canonicalIngredient(x)))).length;
    return { missing, missingMain, priority, mainAvailable, mainCoverage, coverage, ready: missing.length === 0, total: required.length };
  };
  M.compareMatches = (a, b) => Number(b.ready) - Number(a.ready) || b.mainCoverage - a.mainCoverage || b.priority - a.priority || b.coverage - a.coverage || a.missingMain.length - b.missingMain.length || a.missing.length - b.missing.length;
  M.matches = () => M.recipes.map(r => ({ recipe: r, match: M.match(r) })).sort((a, b) => M.compareMatches(a.match, b.match) || Number(a.recipe.id) - Number(b.recipe.id));
  M.ingredientTerms = ingredient => {
    const terms = ingredient.options.flatMap(name => [name, name.replace(/^(?:原味|无糖|低脂|熟|干|生)+/g, '')]);
    const aliases = { '全麦面包': ['面包', '吐司'], '全麦脆面包': ['脆面包', '脆饼'], '大麦脆饼': ['脆饼'], '北豆腐': ['豆腐'], '鸡胸肉': ['鸡胸', '鸡肉'], '鸡腿肉': ['鸡腿', '鸡肉'], '鲈鱼柳': ['鲈鱼', '鱼柳', '鱼'], '三文鱼': ['鲑鱼', '鱼'], '鲭鱼': ['鱼'], '虾仁': ['虾'], '带壳鲜虾': ['虾'], '小番茄': ['番茄'], '鲜香菇': ['香菇', '菌菇'], '蘑菇': ['菌菇'], '口蘑': ['蘑菇', '菌菇'], '无糖希腊酸奶': ['酸奶'], '熟白芸豆': ['白豆', '白芸豆', '大白豆'], '熟鹰嘴豆': ['鹰嘴豆', '豆泥'], '熟糙米饭': ['糙米饭', '米饭'] };
    ingredient.options.forEach(name => terms.push(...(aliases[name] || [])));
    return [...new Set(terms)].filter(x => x && x !== '水');
  };
  M.cookSteps = r => {
    const plan = [{ text: r.prep.join('；') + '。', label: '准备食材', notes: [] }, ...r.steps.map(text => ({ text, label: '开始烹饪', notes: [] }))];
    // Keep operational advice, leaving historical/nutrition/source commentary in the data.
    const omitted = { '4': [0, 1, 2], '6': [2], '11': [1, 2], '19': [0], '20': [0, 2], '21': [0], '29': [0], '30': [2], '31': [0], '32': [0], '33': [0] };
    r.tip.split(/[；;]/).map(x => x.trim()).filter(Boolean).forEach((note, index) => {
      if (omitted[r.id]?.includes(index) || plan.some(step => step.text.includes(note))) return;
      const relevant = r.ingredients.flatMap(M.ingredientTerms).filter(term => note.includes(term));
      let best = 0, score = 0;
      plan.forEach((step, i) => { const value = relevant.filter(term => step.text.includes(term)).length; if (value > score) { best = i; score = value; } });
      plan[best].notes.push(note);
    });
    plan.at(-1).checkpoint = r.success;
    return plan.map(step => ({ ...step, ingredients: r.ingredients.filter(i => !i.seasoning && M.ingredientTerms(i).some(term => step.text.includes(term))).slice(0, 4) }));
  };
  M.matchLabel = match => {
    if (match.ready) return '食材已登记齐全';
    if (!match.missingMain.length) return `主料齐 · 缺 ${match.missing.length} 味调料`;
    const missing = match.missingMain.length ? match.missingMain : match.missing;
    return '缺 ' + missing.slice(0, 2).map(i => i.name).join('、') + (match.missing.length > Math.min(missing.length, 2) ? '等' : '');
  };
  M.route = () => {
    const [path, search = ''] = location.hash.slice(1).split('?');
    const params = new URLSearchParams(search);
    return { path: path || 'home', params, id: path?.startsWith('recipe/') ? path.split('/')[1] : null };
  };
  M.url = (path, options = {}) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(options)) if (value !== '' && value != null) params.set(key, value); return '#' + path + (params.size ? '?' + params.toString() : ''); };
  M.currentOptions = () => Object.fromEntries(M.route().params);
  M.go = hash => { if (location.hash === hash) M.render(); else location.hash = hash; };
  M.applyTheme = () => {
    const dark = M.state.theme === 'dark' || (M.state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#171d19' : '#f7f8f5';
  };
  M.applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', M.applyTheme);
  const paths = {
    recipes: '<path d="M12 5.8C9.2 4 5.7 3.6 3 4.4v14.8c2.7-.8 6.2-.4 9 1.4m0-14.8c2.8-1.8 6.3-2.2 9-1.4v14.8c-2.7-.8-6.2-.4-9 1.4V5.8Z"/><path d="M6.2 8.4c1.1 0 2 .2 2.8.6m6-.6c1-.3 1.9-.5 2.8-.5M6.2 12.1c1.1 0 2 .2 2.8.6"/>',
    pantry: '<path d="M4 9.5h16l-1.1 10a1.7 1.7 0 0 1-1.7 1.5H6.8a1.7 1.7 0 0 1-1.7-1.5L4 9.5Z"/><path d="M3 9.5h18M8 9.5V7a4 4 0 0 1 8 0v2.5M9 13.5v3.8m6-3.8v3.8"/>',
    shopping: '<path d="M5.5 7.5h13l1 12a1.4 1.4 0 0 1-1.4 1.5H5.9a1.4 1.4 0 0 1-1.4-1.5l1-12Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/>',
    heart: '<path d="M12 20.2 4.1 12.6a5.2 5.2 0 0 1 7.4-7.3l.5.5.5-.5a5.2 5.2 0 0 1 7.4 7.3L12 20.2Z"/>',
    search: '<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.5 4.5"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
    people: '<circle cx="12" cy="7" r="3.3"/><path d="M5.5 20.5v-2.8a6.5 6.5 0 0 1 13 0v2.8H5.5Z"/>',
    pan: '<path d="M3 11h15v2a6 6 0 0 1-6 6H9a6 6 0 0 1-6-6v-2Zm15 1 4-3M7.5 7V4m6 3V4"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
    leaf: '<path d="M20 3c1 10-3 17-10 17a7 7 0 0 1-6-11c3-4 10-1 16-6ZM4 21l11-11"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    play: '<path d="m8 4 12 8-12 8V4Z"/>',
    list: '<path d="M9 6h12M9 12h12M9 18h12M3 6h1m-1 6h1m-1 6h1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    'check-circle': '<circle cx="12" cy="12" r="8.2"/><path d="m8.3 12 2.4 2.4 5-5"/>',
    'minus-circle': '<circle cx="12" cy="12" r="8.2"/><path d="M8.5 12h7"/>',
    circle: '<circle cx="12" cy="12" r="8.2"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  };
  M.icon = (name, extra = '') => `<svg ${extra} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.leaf}</svg>`;
  M.toast = text => { const el = document.getElementById('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(M.ui.toastTimeout); M.ui.toastTimeout = setTimeout(() => el.classList.remove('show'), 3000); };
  M.photo = (r, className = '', eager = false) => `<img src="${r.image}" alt="${M.esc(r.title)}" class="${className}" loading="${eager ? 'eager' : 'lazy'}" decoding="async" width="1440" height="1080">`;
  M.searchBox = (value = '', placeholder = '搜索菜名或食材', kind = 'recipes') => `<label class="search-box ${kind === 'home' ? 'home-search' : ''}">${M.icon('search')}<input type="search" data-search="${kind}" aria-label="${placeholder}" placeholder="${placeholder}" value="${M.esc(value)}" autocomplete="off">${value ? '<button class="search-clear" data-action="clear-search" aria-label="清空搜索">×</button>' : ''}</label>`;
  M.header = (title, subtitle, extra = '') => `<div class="page-header"><div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${extra}</div>`;
  M.empty = (icon, title, description, action = '<a class="primary-button" href="#home">去选一道菜</a>') => `<div class="empty-state"><div class="empty-icon">${M.icon(icon)}</div><h2>${title}</h2><p>${description}</p>${action}</div>`;
  M.card = (r, match = null) => {
    if (!match && M.state.pantry.length) match = M.match(r);
    return `<article class="recipe-card"><a class="recipe-image-link" href="#recipe/${r.id}" aria-label="查看${M.esc(r.title)}">${M.photo(r)}</a><button class="favorite-button ${M.isFavorite(r.id) ? 'on' : ''}" data-action="favorite" data-id="${r.id}" aria-pressed="${M.isFavorite(r.id)}" aria-label="${M.isFavorite(r.id) ? '取消收藏' : '收藏'}${M.esc(r.title)}">${M.icon('heart')}</button><a href="#recipe/${r.id}"><h3>${M.esc(r.title)}</h3></a>${!M.route().params.get('category') ? `<div class="recipe-meta">${M.esc(M.getCategory(r.category)?.name || '')}</div>` : ''}${match ? `<div class="match-label ${match.ready ? '' : 'missing'}">${match.ready ? M.icon('check') : ''}${M.esc(M.matchLabel(match))}</div>` : ''}</article>`;
  };
  M.updateNav = () => {
    const route = M.route().path;
    const active = route === 'pantry' ? 'pantry' : route === 'shopping' ? 'shopping' : route === 'favorites' ? 'favorites' : 'home';
    const entries = [['home', '菜谱', 'recipes'], ['pantry', '食材', 'pantry'], ['shopping', '采购', 'shopping'], ['favorites', '收藏', 'heart']];
    const count = M.state.shopping.filter(x => !x.done).length;
    const html = entries.map(([id, name, icon]) => `<a class="nav-link ${active === id ? 'active' : ''}" href="#${id}" ${active === id ? 'aria-current="page"' : ''}>${M.icon(icon)}<span>${name}</span>${id === 'shopping' && count ? `<span class="nav-count">${count > 99 ? '99+' : count}</span>` : ''}</a>`).join('');
    document.getElementById('mobile-nav').innerHTML = html;
  };
})();
