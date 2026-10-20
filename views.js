/* View templates. Recipe text comes from the supplied cookbook, never generated at runtime. */
(() => {
  'use strict';
  const M = window.Med;
  if (!M) return;
  const e = M.esc;
  M.viewHome = () => {
    const resume = Object.entries(M.state.progress).find(([id]) => M.getRecipe(id));
    return `<div class="page-header"><div><h1>今天，想吃什么？</h1><p>简单食材，好好吃饭。</p></div></div>
      ${M.searchBox('', '搜索菜名或食材', 'home')}
      <div class="section-heading"><h2>按菜品选</h2><a class="text-link" href="#browse">全部 ${M.recipes.length} 道 ${M.icon('chevron')}</a></div>
      <div class="category-grid">${M.categories.map(c => `<a class="category-card" href="${M.url('browse', { category: c.id })}" aria-label="${c.name}，${M.recipes.filter(r => r.category === c.id).length}道菜"><div class="category-copy"><span class="category-name">${c.name}</span><span class="category-description">${c.subtitle}</span><span class="category-count">${M.recipes.filter(r => r.category === c.id).length} 道 ${M.icon('chevron')}</span></div><div class="category-photo">${M.photo(M.getRecipe(c.cover), '', true)}</div></a>`).join('')}</div>
      <a class="pantry-invitation" href="${M.state.pantry.length ? '#browse?match=1' : '#pantry'}"><span class="invitation-icon">${M.icon('pantry')}</span><span><strong>${M.state.pantry.length ? '现在能做什么' : '看看家里有什么'}</strong>${M.state.pantry.length ? `<small>${M.state.pantry.length} 种食材 · ${M.matches().filter(x => x.match.ready).length} 道食材已齐</small>` : ''}</span>${M.icon('chevron', 'class="arrow"')}</a>
      ${resume ? `<a class="home-shortcut resume-link" href="#recipe/${resume[0]}">${M.icon('play')}<span><strong>继续烹饪</strong><small>${e(M.getRecipe(resume[0]).title)}</small></span>${M.icon('chevron', 'class="arrow"')}</a>` : ''}`;
  };
  M.filteredRecipes = options => {
    let list = M.recipes;
    if (options.category) list = list.filter(r => r.category === options.category);
    if (options.q) { const terms = M.normalize(options.q).split(/[，,、]+/).filter(Boolean); list = list.filter(r => terms.every(term => M.normalize(r.title + r.fullTitle + r.ingredients.map(i => i.raw + i.name).join(' ')).includes(term))); }
    if (options.match === '1') list = list.filter(r => M.match(r).mainAvailable > 0);
    if (M.state.pantry.length) {
      const matched = list.map(recipe => ({ recipe, match: M.match(recipe) }));
      if (matched.some(x => x.match.mainAvailable > 0)) list = matched.sort((a, b) => M.compareMatches(a.match, b.match) || Number(a.recipe.id) - Number(b.recipe.id)).map(x => x.recipe);
    }
    return list;
  };
  M.viewBrowse = () => {
    const o = M.currentOptions();
    const category = M.getCategory(o.category);
    const list = M.filteredRecipes(o);
    const matching = M.state.pantry.length && list.some(r => M.match(r).mainAvailable > 0);
    return `<a href="#home" class="back-link">${M.icon('back')}菜谱</a>${M.header(category ? category.name : o.q ? '搜索结果' : o.match ? '按现有食材选菜' : '全部菜谱', '', `<span class="count-label">${list.length} 道</span>`)}
      ${M.searchBox(o.q || '')}${matching || o.q ? `<div class="results-summary"><span>${matching ? '现有食材优先' : ''}</span>${o.q ? `<a class="text-link" href="${M.url('browse', { category: o.category, match: o.match })}">清空搜索</a>` : ''}</div>` : '<div class="results-spacer"></div>'}
      ${list.length ? `<div class="recipe-grid">${list.slice(0, M.ui.limit).map(r => M.card(r)).join('')}</div>${list.length > M.ui.limit ? '<button class="load-more" data-action="load-more">查看更多</button>' : ''}` : M.empty('search', '暂时没找到', '换一个菜名或食材试试。', `<a class="secondary-button" href="${M.url('browse', { category: o.category })}">查看此分类</a>`)}`;
  };
  M.viewCollection = recent => {
    const ids = recent ? M.state.recent : M.state.favorites;
    const recipes = ids.map(M.getRecipe).filter(Boolean);
    return `${recent ? `<a href="#home" class="back-link">${M.icon('back')}菜谱</a>` : ''}${M.header(recent ? '最近看过' : '我的收藏', '', recipes.length ? `<span class="count-label">${recipes.length} 道</span>` : '')}${recipes.length ? `<div class="recipe-grid">${recipes.map(r => M.card(r)).join('')}</div>` : M.empty(recent ? 'clock' : 'heart', recent ? '还没有浏览记录' : '还没有收藏', recent ? '打开菜谱后会自动记录。' : '点一下菜图上的爱心即可收藏。')}`;
  };
  M.ingredientRows = r => r.ingredients.map(i => {
    const known = M.state.pantry.length > 0;
    const have = known && M.hasIngredient(i);
    const missing = known && !have && !i.optional;
    const status = have ? 'available' : missing ? 'missing' : 'neutral';
    return `<div class="ingredient-row ingredient-status-row ${status}" data-state="${status}"><span class="ingredient-status">${M.icon(have ? 'check-circle' : missing ? 'minus-circle' : 'circle')}</span><span class="ingredient-text">${e(i.raw)}</span>${have ? '<span class="stock-badge">已有</span>' : missing ? '<span class="stock-badge">缺少</span>' : i.optional ? '<span class="optional-badge">可选</span>' : ''}</div>`;
  }).join('');
  M.viewRecipe = r => {
    const progress = M.state.progress[r.id];
    const match = M.match(r);
    const known = M.state.pantry.length > 0;
    const availableCount = r.ingredients.filter(i => M.hasIngredient(i)).length;
    const plan = M.cookSteps(r);
    const annotations = step => `${step.notes.map(note => `<p class="step-note">${e(note)}</p>`).join('')}${step.checkpoint ? `<p class="step-checkpoint">${M.icon('check-circle')}${e(step.checkpoint)}</p>` : ''}`;
    return `<a href="${e(M.ui.lastBrowse)}" class="back-link">${M.icon('back')}返回选菜</a><div class="detail-layout"><div class="detail-visual">${M.photo(r, 'detail-photo', true)}</div><div class="detail-content"><div class="detail-heading"><span class="origin-tag">${e(r.origin)}</span><div class="detail-title-row"><h1>${e(r.title)}</h1><button class="icon-button" data-action="favorite" data-id="${r.id}" aria-label="${M.isFavorite(r.id) ? '取消收藏' : '收藏此菜'}" aria-pressed="${M.isFavorite(r.id)}">${M.icon('heart', M.isFavorite(r.id) ? 'style="fill:currentColor"' : '')}</button></div><div class="detail-stats"><span class="detail-stat">${M.icon('people')}1 人份</span><span class="detail-stat">${M.icon('pan')}${r.method}</span></div></div>
      <details class="content-section ingredient-disclosure" data-ingredient-disclosure data-id="${r.id}" ${M.ui.ingredientCollapsed[r.id] ? '' : 'open'}><summary><h2>食材</h2><span class="stock-summary">${known ? `<span>已有 ${availableCount}</span>${match.missing.length ? `<span class="missing-count">缺 ${match.missing.length}</span>` : ''}` : ''}</span><span class="ingredient-toggle"><span class="disclosure-open">收起</span><span class="disclosure-closed">展开</span>${M.icon('chevron')}</span></summary><div class="ingredient-disclosure-body">${!known ? '<a class="stock-entry" href="#pantry">登记家中食材</a>' : ''}<div class="ingredient-list stock-list">${M.ingredientRows(r)}</div><div class="ingredient-actions"><button class="secondary-button block-button" data-action="shop-recipe" data-id="${r.id}">${M.icon('shopping')}${known ? '采购缺少的食材' : '加入采购清单'}</button></div></div></details>
      <section class="content-section"><h2>先准备好</h2><p class="small-note">${M.icon('pan')} ${e(r.equipment)}</p><ol class="step-list">${r.prep.map(x => `<li><div>${e(x)}</div></li>`).join('')}</ol>${annotations(plan[0])}</section>
      <section class="content-section"><h2>开始做菜 <small>${r.steps.length} 步</small></h2><ol class="step-list">${plan.slice(1).map(step => `<li><div>${e(step.text)}${annotations(step)}</div></li>`).join('')}</ol></section>
      <div class="detail-actions sticky-cook"><button class="primary-button" data-action="cook" data-id="${r.id}">${M.icon('play')}${progress ? '继续烹饪' : '开始烹饪'}</button></div></div></div>`;
  };
  const commonNames = ['鸡蛋', '番茄', '菠菜', '黄瓜', '鸡胸肉', '鸡腿肉', '虾仁', '北豆腐', '西兰花', '南瓜', '洋葱', '鲜香菇', '全麦面包', '熟鹰嘴豆', '橄榄油', '盐', '蒜', '黑胡椒'];
  M.catalogList = () => {
    let list = M.ingredients;
    if (M.ui.pantryQuery) list = list.filter(i => M.searchIngredient(i.name, M.ui.pantryQuery));
    else if (M.ui.filterGroup === '常用') list = commonNames.map(name => list.find(i => i.name === name)).filter(Boolean);
    else list = list.filter(i => i.group === M.ui.filterGroup);
    return list;
  };
  M.viewPantryCatalog = () => {
    const list = M.catalogList();
    return `<div class="pantry-chips">${list.map(i => `<button class="ingredient-chip ${M.state.pantry.includes(i.name) ? 'selected' : ''}" data-action="pantry-toggle" data-name="${e(i.name)}" aria-pressed="${M.state.pantry.includes(i.name)}">${M.icon(M.state.pantry.includes(i.name) ? 'check' : 'plus')}${e(M.ingredientLabel(i.name))}</button>`).join('')}</div>${!list.length ? `<p class="small-note">暂时没找到这个名称，可添加自定义食材。</p>` : ''}${M.ui.pantryQuery && !M.ingredients.some(i => M.normalize(i.name) === M.normalize(M.canonicalIngredient(M.ui.pantryQuery))) ? `<button class="secondary-button block-button" style="margin-top:15px" data-action="pantry-custom">添加“${e(M.ui.pantryQuery)}”</button>` : ''}`;
  };
  M.viewPantry = () => {
    const groups = ['常用', '蔬菜水果', '肉鱼蛋奶', '谷物主食', '豆类坚果', '调味与香草'];
    const matches = M.state.pantry.length ? M.matches() : [];
    const relevant = matches.filter(x => x.recipe.ingredients.some(i => !i.seasoning && !i.optional && M.hasIngredient(i)));
    return `${M.header('我的食材', '', M.state.pantry.length ? `<a class="text-link" href="#browse?match=1">去选菜 ${M.icon('chevron')}</a>` : '')}${M.cloud?.pantryStatus() || ''}<div class="pantry-layout"><section class="panel"><h2 style="margin-bottom:15px">添加食材</h2>${M.searchBox(M.ui.pantryQuery, '搜索食材，如番茄、鸡蛋', 'pantry')}<div class="filter-row">${groups.map(g => `<button class="chip ${M.ui.filterGroup === g ? 'active' : ''}" data-action="pantry-group" data-group="${g}">${g === '调味与香草' ? '调味' : g === '蔬菜水果' ? '蔬果' : g === '肉鱼蛋奶' ? '肉鱼蛋奶' : g === '谷物主食' ? '主食' : g === '豆类坚果' ? '豆类坚果' : g}</button>`).join('')}</div><div id="pantry-catalog">${M.viewPantryCatalog()}</div></section><section class="panel"><div class="section-heading"><h2>家里有</h2><span class="count-label">${M.state.pantry.length} 种</span></div>${M.state.pantry.length ? M.state.pantry.map(name => `<div class="pantry-row"><span>${e(M.ingredientLabel(name))}</span><button class="priority-button ${M.state.priority.includes(name) ? 'on' : ''}" data-action="priority" data-name="${e(name)}" aria-pressed="${M.state.priority.includes(name)}">${M.state.priority.includes(name) ? '优先使用中' : '优先用掉'}</button><button class="icon-button" data-action="pantry-remove" data-name="${e(name)}" aria-label="标记${e(name)}已用完">${M.icon('close')}</button></div>`).join('') : '<p class="panel-subtitle" style="margin:25px 0">还没有添加食材</p>'}</section></div><section class="pantry-recommendation"><div class="section-heading"><h2>更适合现在做的</h2>${relevant.length ? `<span class="count-label">${relevant.filter(x => x.match.ready).length} 道食材已齐</span>` : ''}</div>${relevant.length ? `<div class="recipe-grid">${relevant.slice(0, 4).map(x => M.card(x.recipe, x.match)).join('')}</div><a class="load-more" href="#browse?match=1">查看更多匹配菜谱</a>` : M.empty('leaf', M.state.pantry.length ? '再添加几样主食材试试' : '先记下几样食材', M.state.pantry.length ? '只有调味料时，暂时还不足以帮你选出一餐。' : '添加后，就能看到食材已齐或还缺几样的菜。', '<a class="secondary-button" href="#home">也可以直接去选菜</a>')}</section>`;
  };
  M.shoppingGroups = () => {
    const groups = new Map();
    for (const item of M.state.shopping) { const key = item.group + '|' + item.name; if (!groups.has(key)) groups.set(key, { name: item.name, group: item.group, items: [] }); groups.get(key).items.push(item); }
    return [...groups.values()];
  };
  M.viewShopping = () => {
    const count = M.state.shopping.length;
    const done = M.state.shopping.filter(x => x.done).length;
    const grouped = M.shoppingGroups();
    const groups = [...new Set(grouped.map(x => x.group))];
    const actions = `<span class="header-actions"><button class="icon-button" data-action="shopping-custom" aria-label="添加采购食材">${M.icon('plus')}</button><button class="icon-button" data-action="shopping-menu" aria-label="清单管理">${M.icon('more')}</button></span>`;
    return `${M.header('采购清单', '', actions)}${count ? `<div class="shopping-toolbar"><div class="shopping-progress">已买 ${done} / ${count} 项<div class="progress-track"><span style="width:${done / count * 100}%"></span></div></div></div><div class="shopping-groups">${groups.map(group => `<section class="shopping-group"><h2>${e(group)}<small>${grouped.filter(x => x.group === group).length} 种</small></h2>${grouped.filter(x => x.group === group).map(x => { const checked = x.items.every(i => i.done); const key = encodeURIComponent(x.group + '|' + x.name); return `<div class="shopping-row ${checked ? 'done' : ''}"><input type="checkbox" data-shopping="${key}" aria-label="${e(x.name)}已买" ${checked ? 'checked' : ''}><div class="shopping-item-copy"><span class="shopping-item-name">${e(M.ingredientLabel(x.name))}</span>${x.items.map(i => `<span class="shopping-item-amount">${e(i.raw)}</span>${i.recipeId ? `<a class="shopping-item-source" href="#recipe/${i.recipeId}">${e(M.getRecipe(i.recipeId).title)}</a>` : ''}`).join('')}</div><button class="icon-button" data-action="shopping-remove" data-key="${key}" aria-label="删除${e(x.name)}">${M.icon('close')}</button></div>`; }).join('')}</section>`).join('')}</div>` : M.empty('shopping', '先选一道想吃的菜', '菜谱里的缺料可以直接加入清单。')}`;
  };
  M.render = () => {
    const route = M.route();
    const main = document.getElementById('main');
    main.dataset.view = route.path;
    const recipe = route.id ? M.getRecipe(route.id) : null;
    if (recipe) {
      M.state.recent = [recipe.id, ...M.state.recent.filter(x => x !== recipe.id)].slice(0, 10);
      M.save(); main.innerHTML = M.viewRecipe(recipe); document.title = recipe.title + ' · Mediterranean';
    } else {
      const views = { home: M.viewHome, browse: M.viewBrowse, pantry: M.viewPantry, shopping: M.viewShopping, favorites: () => M.viewCollection(false), recent: () => M.viewCollection(true) };
      main.innerHTML = views[route.path] ? views[route.path]() : M.empty('search', '这道菜暂时没找到', '回到分类里，重新选一道喜欢的菜吧。');
      document.title = 'Mediterranean · 地中海';
    }
    M.updateNav();
    if (M.ui.focusSearch) { const { kind, position } = M.ui.focusSearch; const input = main.querySelector(`input[data-search="${kind}"]`); if (input) { input.focus({ preventScroll: true }); try { input.setSelectionRange(position, position); } catch {} } M.ui.focusSearch = null; }
  };
})();
