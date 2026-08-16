document.addEventListener('DOMContentLoaded', () => {
  const VERSION = 3;
  const KEYS = { normal: 'bunkkerNormalV3', secret: 'bunkkerSecretV3', collapsed: 'collapsedCategoryStatesV3' };
  const STATIC_IDS = new Set(['widget_aemet', 'ajustes']);
  const $ = id => document.getElementById(id);
  const ui = {
    search: $('searchInput'), clear: $('searchClear'), options: $('searchOptions'), searchList: $('searchEnginesList'),
    main: $('mainContent'), links: $('linksContainer'), section: $('shortcutsSection'), export: $('exportSection'),
    categories: $('categoryManagerList'), shortcuts: $('shortcutsEditorList'), form: $('shortcutForm'),
    formTitle: $('shortcutFormTitle'), name: $('shortcutNameInput'), url: $('shortcutUrlInput'),
    searchUrl: $('shortcutSearchUrlInput'), show: $('shortcutShowInSearchInput'), category: $('shortcutCategoryInput')
  };
  let secretMode = false;
  let query = '';
  let normalData;
  let secretData;
  let editingShortcutId = null;

  function uid(prefix) {
    const value = globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    return prefix + '_' + value;
  }
  function httpUrl(value) {
    if (typeof value !== 'string') return null;
    try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' ? url : null; } catch (error) { return null; }
  }
  function searchUrl(value, example = 'consulta') {
    return typeof value === 'string' && value.includes('{q}') ? httpUrl(value.replace('{q}', encodeURIComponent(example))) : null;
  }
  function object(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
  function own(value, key) { return Object.prototype.hasOwnProperty.call(value, key); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function emptyData() { return { version: VERSION, categories: [], shortcuts: [] }; }
  function categories(data) { return [...data.categories].sort((a, b) => a.order - b.order); }
  function category(data, id) { return data.categories.find(item => item.id === id); }
  function shortcuts(data, categoryId) { return data.shortcuts.filter(item => item.categoryId === categoryId).sort((a, b) => a.order - b.order); }
  function normalize(data) {
    categories(data).forEach((item, index) => { item.order = index; });
    data.categories.forEach(item => shortcuts(data, item.id).forEach((shortcut, index) => { shortcut.order = index; }));
  }
  function validV3(data) {
    if (!object(data) || data.version !== VERSION || !Array.isArray(data.categories) || !Array.isArray(data.shortcuts)) return false;
    const categoryIds = new Set();
    for (const item of data.categories) {
      if (!object(item) || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !item.name.trim() || !Number.isInteger(item.order) || categoryIds.has(item.id)) return false;
      categoryIds.add(item.id);
    }
    const shortcutIds = new Set();
    return data.shortcuts.every(item => {
      const valid = object(item) && typeof item.id === 'string' && item.id && typeof item.name === 'string' && item.name.trim() &&
        httpUrl(item.url) && typeof item.searchUrl === 'string' && (!item.searchUrl || searchUrl(item.searchUrl)) &&
        typeof item.showInSearch === 'boolean' && (!item.showInSearch || item.searchUrl) && categoryIds.has(item.categoryId) &&
        Number.isInteger(item.order) && !shortcutIds.has(item.id);
      shortcutIds.add(item.id);
      return valid;
    });
  }
  function readV3(mode) {
    const raw = localStorage.getItem(KEYS[mode]);
    if (raw === null) return null;
    try { const data = JSON.parse(raw); return validV3(data) ? data : null; } catch (error) { return null; }
  }
  function validLegacyCategories(value) {
    return object(value) && Object.values(value).every(list => Array.isArray(list) && list.every(link => object(link) && typeof link.title === 'string' && httpUrl(link.url)));
  }
  function validEngine(engine) {
    return object(engine) && typeof engine.name === 'string' && searchUrl(engine.url) &&
      (!own(engine, 'secret') || typeof engine.secret === 'boolean') && (!own(engine, 'enabled') || typeof engine.enabled === 'boolean');
  }
  function legacyCategories(key, fallback) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { const parsed = JSON.parse(raw); if (object(parsed) && validLegacyCategories(parsed.categories)) return parsed.categories; } catch (error) {}
    }
    return fallback;
  }
  function legacyEngines() {
    const raw = localStorage.getItem('customEngines');
    if (raw) { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(validEngine) : []; } catch (error) { return []; } }
    return Array.isArray(DEFAULT_ENGINES) ? DEFAULT_ENGINES.filter(validEngine) : [];
  }
  function searchCategory(data) {
    let item = data.categories.find(categoryItem => categoryItem.name === 'Buscadores');
    if (!item) { item = { id: uid('cat'), name: 'Buscadores', order: data.categories.length }; data.categories.push(item); }
    return item;
  }
  function mergeLegacyEngines(data, engines, secret) {
    engines.filter(engine => Boolean(engine.secret) === secret).forEach(engine => {
      const resolved = searchUrl(engine.url);
      if (!resolved) return;
      const domain = (typeof engine.domain === 'string' && engine.domain || resolved.hostname).toLowerCase();
      const name = engine.name.trim().toLowerCase();
      const matches = data.shortcuts.filter(item => (httpUrl(item.url)?.hostname.toLowerCase() === domain) || item.name.trim().toLowerCase() === name);
      if (matches.length === 1) {
        matches[0].searchUrl = engine.url;
        matches[0].showInSearch = engine.enabled !== false;
        return;
      }
      const destination = searchCategory(data);
      data.shortcuts.push({ id: uid('link'), name: engine.name, url: resolved.origin + '/', searchUrl: engine.url,
        showInSearch: engine.enabled !== false, categoryId: destination.id, order: shortcuts(data, destination.id).length });
    });
  }
  function convertLegacy(source, engines, secret) {
    const data = emptyData();
    Object.entries(source).forEach(([name, list], categoryOrder) => {
      const categoryItem = { id: uid('cat'), name, order: categoryOrder };
      data.categories.push(categoryItem);
      list.forEach((link, order) => {
        if (object(link) && typeof link.title === 'string' && httpUrl(link.url)) {
          data.shortcuts.push({ id: uid('link'), name: link.title, url: link.url, searchUrl: '', showInSearch: false, categoryId: categoryItem.id, order });
        }
      });
    });
    mergeLegacyEngines(data, engines, secret);
    normalize(data);
    return data;
  }
  function parseObject(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '{}'); return object(value) ? value : {}; } catch (error) { return {}; }
  }
  function oldNameToken(name) {
    return Array.from(name, char => char.codePointAt(0).toString(16).padStart(6, '0')).join('-');
  }
  function migratedCollapseStates(normal, secret) {
    const result = parseObject(KEYS.collapsed);
    result.normal = object(result.normal) ? result.normal : {};
    result.secret = object(result.secret) ? result.secret : {};
    const v2 = parseObject('collapsedCategoryStatesV2');
    const records = [...normal.categories.map(item => ({ item, mode: 'normal' })), ...secret.categories.map(item => ({ item, mode: 'secret' }))];
    const counts = new Map();
    records.forEach(({ item }) => { const key = item.name.replace(/\s+/g, '_'); counts.set(key, (counts.get(key) || 0) + 1); });
    records.forEach(({ item, mode }) => {
      if (own(result[mode], item.id)) return;
      const v2State = v2['links_' + mode + '_' + oldNameToken(item.name)];
      if (v2State === 'true' || v2State === 'false') { result[mode][item.id] = v2State; return; }
      const oldId = item.name.replace(/\s+/g, '_');
      const oldState = localStorage.getItem('collapsed_' + oldId);
      if (!STATIC_IDS.has(oldId) && counts.get(oldId) === 1 && (oldState === 'true' || oldState === 'false')) result[mode][item.id] = oldState;
    });
    return result;
  }
  function restore(key, value) { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
  function commit(writes) {
    const previous = new Map(writes.map(write => [write.key, localStorage.getItem(write.key)]));
    const done = [];
    try { writes.forEach(write => { localStorage.setItem(write.key, write.value); done.push(write.key); }); }
    catch (error) {
      let failed = false;
      done.reverse().forEach(key => { try { restore(key, previous.get(key)); } catch (rollbackError) { failed = true; } });
      const result = new Error(failed ? 'ROLLBACK_FAILED' : 'WRITE_FAILED'); result.code = result.message; throw result;
    }
  }
  function bootstrap() {
    const existingNormal = readV3('normal');
    const existingSecret = readV3('secret');
    if (existingNormal && existingSecret) return { normal: existingNormal, secret: existingSecret };
    const engines = legacyEngines();
    const nextNormal = existingNormal || convertLegacy(legacyCategories('customLinks', DEFAULT_LINKS), engines, false);
    const nextSecret = existingSecret || convertLegacy(legacyCategories('customSecretLinks', DEFAULT_SECRET_LINKS), engines, true);
    const writes = [];
    if (!existingNormal) writes.push({ key: KEYS.normal, value: JSON.stringify(nextNormal) });
    if (!existingSecret) writes.push({ key: KEYS.secret, value: JSON.stringify(nextSecret) });
    writes.push({ key: KEYS.collapsed, value: JSON.stringify(migratedCollapseStates(nextNormal, nextSecret)) });
    try { commit(writes); return { normal: nextNormal, secret: nextSecret }; }
    catch (error) {
      console.error('No se ha podido completar la migración V3:', error);
      return { normal: existingNormal || emptyData(), secret: existingSecret || emptyData() };
    }
  }
  function active() { return secretMode ? secretData : normalData; }
  function activeMode() { return secretMode ? 'secret' : 'normal'; }
  function persist() {
    normalize(active());
    localStorage.setItem(KEYS[activeMode()], JSON.stringify(active()));
    refresh();
  }
  function collapseStates() {
    const states = parseObject(KEYS.collapsed);
    return { normal: object(states.normal) ? states.normal : {}, secret: object(states.secret) ? states.secret : {} };
  }
  function saveCollapse(categoryId, collapsed, mode) {
    const states = collapseStates(); states[mode][categoryId] = collapsed ? 'true' : 'false';
    localStorage.setItem(KEYS.collapsed, JSON.stringify(states));
  }
  function toggleDynamic(categoryId, mode) {
    const card = $('cat_dynamic_' + categoryId);
    const chevron = $('chev_dynamic_' + categoryId);
    if (!card) return;
    const collapsed = card.style.display !== 'none';
    card.style.display = collapsed ? 'none' : 'block';
    if (chevron) chevron.classList.toggle('collapsed', collapsed);
    saveCollapse(categoryId, collapsed, mode);
  }
  window.toggleCategory = id => {
    const card = $('cat_' + id); const chevron = $('chev_' + id);
    if (!card) return;
    const collapsed = card.style.display !== 'none';
    card.style.display = collapsed ? 'none' : 'block';
    if (chevron) chevron.classList.toggle('collapsed', collapsed);
    localStorage.setItem('collapsed_' + id, collapsed ? 'true' : 'false');
  };
  function applyStaticCollapse(id, defaultCollapsed) {
    const stored = localStorage.getItem('collapsed_' + id);
    if (stored === 'true' || (stored === null && defaultCollapsed)) {
      const card = $('cat_' + id); const chevron = $('chev_' + id);
      if (card) card.style.display = 'none';
      if (chevron) chevron.classList.add('collapsed');
      if (stored === null) localStorage.setItem('collapsed_' + id, 'true');
    }
  }
  function button(text, title, action) {
    const item = document.createElement('button');
    item.type = 'button'; item.textContent = text; item.title = title; item.addEventListener('click', action);
    return item;
  }
  function favicon(parent, url, size) {
    const safe = httpUrl(url);
    if (!safe) return null;
    const icon = document.createElement('img');
    icon.src = 'https://www.google.com/s2/favicons?domain=' + safe.hostname + '&sz=' + size;
    icon.addEventListener('error', () => { icon.style.display = 'none'; });
    parent.appendChild(icon);
    return icon;
  }
  function applyDynamicCollapse(categoryItem, mode) {
    if (collapseStates()[mode][categoryItem.id] !== 'true') return;
    const card = $('cat_dynamic_' + categoryItem.id); const chevron = $('chev_dynamic_' + categoryItem.id);
    if (card) card.style.display = 'none';
    if (chevron) chevron.classList.add('collapsed');
  }
  function renderLinks() {
    const data = active(); const mode = activeMode();
    ui.links.replaceChildren();
    categories(data).forEach(categoryItem => {
      const header = document.createElement('div'); header.className = 'category-header';
      const titleWrap = document.createElement('div'); titleWrap.className = 'category-title-wrapper';
      titleWrap.addEventListener('click', () => toggleDynamic(categoryItem.id, mode));
      const title = document.createElement('h2'); title.className = 'section-title'; title.textContent = categoryItem.name;
      const chevron = document.createElement('span'); chevron.className = 'chevron'; chevron.id = 'chev_dynamic_' + categoryItem.id; chevron.textContent = '▼';
      titleWrap.append(title, chevron);
      const add = document.createElement('span'); add.textContent = '＋'; add.title = 'Añadir acceso';
      add.style.cssText = 'font-size:22px; color:var(--blue-ios); cursor:pointer; padding:0 5px;';
      add.addEventListener('click', () => openForm(null, categoryItem.id));
      header.append(titleWrap, add);
      const card = document.createElement('div'); card.className = 'ios-card'; card.id = 'cat_dynamic_' + categoryItem.id;
      const grid = document.createElement('div'); grid.className = 'app-grid';
      const items = shortcuts(data, categoryItem.id);
      if (!items.length) { const empty = document.createElement('p'); empty.textContent = 'No hay accesos.'; empty.style.cssText = 'color:var(--text-secondary); font-size:13px; grid-column:1/-1;'; grid.appendChild(empty); }
      items.forEach(shortcut => {
        const wrapper = document.createElement('div'); wrapper.className = 'app-icon-wrapper';
        const link = document.createElement('a'); link.className = 'app-icon'; link.target = '_blank'; link.title = shortcut.name;
        const safe = httpUrl(shortcut.url); link.href = safe ? safe.href : '#';
        if (safe) favicon(link, safe.href, 64); else link.textContent = '?';
        const label = document.createElement('span'); label.className = 'app-label'; label.textContent = shortcut.name;
        label.addEventListener('click', () => openForm(shortcut.id));
        wrapper.append(link, label); grid.appendChild(wrapper);
      });
      card.appendChild(grid); ui.links.append(header, card); applyDynamicCollapse(categoryItem, mode);
    });
  }
  function searchShortcuts(data) {
    const order = new Map(categories(data).map(categoryItem => [categoryItem.id, categoryItem.order]));
    return data.shortcuts.filter(item => item.showInSearch && searchUrl(item.searchUrl))
      .sort((a, b) => (order.get(a.categoryId) - order.get(b.categoryId)) || a.order - b.order);
  }
  function openSearch(template) { const safe = searchUrl(template, query); if (safe) window.open(safe.href, '_blank'); }
  function renderSearch() {
    ui.searchList.replaceChildren();
    searchShortcuts(active()).forEach(shortcut => {
      const item = document.createElement('div'); item.className = 'ios-list-item' + (secretMode ? ' secret-item' : '');
      const holder = document.createElement('span'); const icon = favicon(holder, shortcut.url, 32); if (icon) item.appendChild(icon);
      const text = document.createElement('span'); text.append('Buscar en ');
      const name = document.createElement('b'); name.textContent = shortcut.name; text.appendChild(name);
      item.appendChild(text); item.addEventListener('click', () => { if (query) openSearch(shortcut.searchUrl); });
      ui.searchList.appendChild(item);
    });
  }
  function fillCategorySelect(selected) {
    ui.category.replaceChildren();
    categories(active()).forEach(categoryItem => {
      const option = document.createElement('option'); option.value = categoryItem.id; option.textContent = categoryItem.name; ui.category.appendChild(option);
    });
    ui.category.value = selected || active().categories[0]?.id || '';
  }
  function updateSearchToggle() {
    const available = Boolean(searchUrl(ui.searchUrl.value.trim()));
    ui.show.disabled = !available; if (!available) ui.show.checked = false;
  }
  function openForm(id, preferredCategory) {
    const data = active();
    if (!data.categories.length) return alert('Crea primero una categoría.');
    const shortcut = id ? data.shortcuts.find(item => item.id === id) : null;
    editingShortcutId = shortcut ? shortcut.id : null;
    ui.formTitle.textContent = shortcut ? 'Editar acceso' : 'Nuevo acceso';
    ui.name.value = shortcut ? shortcut.name : ''; ui.url.value = shortcut ? shortcut.url : '';
    ui.searchUrl.value = shortcut ? shortcut.searchUrl : ''; ui.show.checked = Boolean(shortcut?.showInSearch);
    fillCategorySelect(shortcut?.categoryId || preferredCategory); updateSearchToggle(); ui.form.style.display = 'block'; ui.name.focus();
  }
  function closeForm() { editingShortcutId = null; ui.form.style.display = 'none'; }
  function saveForm() {
    const data = active(); const name = ui.name.value.trim(); const url = ui.url.value.trim(); const template = ui.searchUrl.value.trim(); const categoryId = ui.category.value;
    if (!name) return alert('El nombre es obligatorio.');
    if (!httpUrl(url)) return alert('URL inválida.');
    if (template && !searchUrl(template)) return alert('La URL de búsqueda debe incluir {q} y usar http o https.');
    if (ui.show.checked && !template) return alert('Indica una URL de búsqueda antes de mostrar este acceso en búsquedas.');
    if (!category(data, categoryId)) return alert('Selecciona una categoría válida.');
    const current = editingShortcutId && data.shortcuts.find(item => item.id === editingShortcutId);
    if (current) {
      const previous = current.categoryId;
      Object.assign(current, { name, url, searchUrl: template, showInSearch: Boolean(template && ui.show.checked), categoryId });
      if (previous !== categoryId) { normalize(data); current.order = shortcuts(data, categoryId).filter(item => item.id !== current.id).length; }
    } else {
      data.shortcuts.push({ id: uid('link'), name, url, searchUrl: template, showInSearch: Boolean(template && ui.show.checked), categoryId, order: shortcuts(data, categoryId).length });
    }
    closeForm(); persist();
  }
  function moveShortcut(id, direction) {
    const data = active(); const current = data.shortcuts.find(item => item.id === id); if (!current) return;
    const list = shortcuts(data, current.categoryId); const index = list.findIndex(item => item.id === id); const target = list[index + direction]; if (!target) return;
    [current.order, target.order] = [target.order, current.order]; persist();
  }
  function removeShortcut(id) {
    const data = active(); const current = data.shortcuts.find(item => item.id === id);
    if (!current || !confirm('¿Eliminar \"' + current.name + '\"?')) return;
    data.shortcuts = data.shortcuts.filter(item => item.id !== id); normalize(data); persist();
  }
  function addCategory() {
    const name = prompt('Nombre de la nueva categoría:', ''); if (name === null || !name.trim()) return;
    active().categories.push({ id: uid('cat'), name: name.trim(), order: active().categories.length }); persist();
  }
  function renameCategory(id) {
    const item = category(active(), id); if (!item) return;
    const name = prompt('Nuevo nombre de la categoría:', item.name); if (name === null || !name.trim()) return;
    item.name = name.trim(); persist();
  }
  function moveCategory(id, direction) {
    const list = categories(active()); const index = list.findIndex(item => item.id === id); const target = list[index + direction]; if (index < 0 || !target) return;
    [list[index].order, target.order] = [target.order, list[index].order]; persist();
  }
  function removeCategory(id) {
    const data = active(); const item = category(data, id); if (!item) return;
    if (data.shortcuts.some(shortcut => shortcut.categoryId === id)) return alert('No puedes eliminar una categoría con accesos. Muévelos o elimínalos primero.');
    if (!confirm('¿Eliminar la categoría \"' + item.name + '\"?')) return;
    data.categories = data.categories.filter(categoryItem => categoryItem.id !== id); normalize(data); persist();
  }
  function managementRow(titleText, detailText, actions) {
    const row = document.createElement('div'); row.className = 'management-row';
    const info = document.createElement('div'); info.className = 'management-info';
    const title = document.createElement('span'); title.className = 'management-title'; title.textContent = titleText;
    const detail = document.createElement('span'); detail.className = 'management-detail'; detail.textContent = detailText;
    const controls = document.createElement('div'); controls.className = 'management-actions'; controls.append(...actions);
    info.append(title, detail); row.append(info, controls); return row;
  }
  function renderManagement() {
    const data = active(); ui.categories.replaceChildren(); ui.shortcuts.replaceChildren();
    categories(data).forEach(categoryItem => {
      ui.categories.appendChild(managementRow(categoryItem.name, shortcuts(data, categoryItem.id).length + ' accesos', [
        button('↑', 'Subir categoría', () => moveCategory(categoryItem.id, -1)), button('↓', 'Bajar categoría', () => moveCategory(categoryItem.id, 1)),
        button('✏️', 'Renombrar categoría', () => renameCategory(categoryItem.id)), button('🗑️', 'Eliminar categoría', () => removeCategory(categoryItem.id))
      ]));
      shortcuts(data, categoryItem.id).forEach(shortcut => {
        ui.shortcuts.appendChild(managementRow(shortcut.name, shortcut.showInSearch ? categoryItem.name + ' · visible en búsquedas' : categoryItem.name, [
          button('✏️', 'Editar acceso', () => openForm(shortcut.id)), button('↑', 'Subir acceso', () => moveShortcut(shortcut.id, -1)),
          button('↓', 'Bajar acceso', () => moveShortcut(shortcut.id, 1)), button('🗑️', 'Eliminar acceso', () => removeShortcut(shortcut.id))
        ]));
      });
    });
    if (!data.categories.length) { const empty = document.createElement('p'); empty.className = 'management-detail'; empty.textContent = 'No hay categorías.'; ui.categories.appendChild(empty); }
    if (!data.shortcuts.length) { const empty = document.createElement('p'); empty.className = 'management-detail'; empty.textContent = 'No hay accesos.'; ui.shortcuts.appendChild(empty); }
  }
  function refresh() {
    ui.search.classList.toggle('secret-mode', secretMode); ui.search.placeholder = secretMode ? 'Modo Secreto 🔓' : 'Buscar...';
    renderSearch(); renderLinks(); renderManagement();
  }
  function closeSearch() {
    ui.search.value = ''; query = ''; ui.clear.style.display = 'none'; ui.options.classList.remove('show');
    ui.main.style.opacity = '1'; ui.main.style.pointerEvents = 'auto'; ui.search.blur();
  }
  function initAemet() {
    applyStaticCollapse('widget_aemet', false);
    const feed = 'https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAP7703_ATOM.xml';
    const api = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(feed) + '&_=' + Date.now();
    const list = $('avisos-lista');
    fetch(api).then(response => response.ok ? response.json() : Promise.reject()).then(data => {
      if (data.status !== 'ok') throw new Error('RSS');
      const items = data.items.filter(item => !item.title.toLowerCase().includes('estado completo') && !item.title.toLowerCase().includes('sin avisos'));
      if (!items.length) { const message = document.createElement('div'); message.style.padding = '10px 0'; message.textContent = '✅ No hay avisos meteorológicos activos ahora mismo.'; list.replaceChildren(message); return; }
      list.replaceChildren();
      items.forEach(item => {
        const warning = document.createElement('div'); warning.className = 'aviso';
        const title = document.createElement('div'); title.className = /rojo/i.test(item.title) ? 'nivel-rojo' : /naranja/i.test(item.title) ? 'nivel-naranja' : 'nivel-amarillo';
        title.textContent = '⚠️ ' + item.title.replace(/^Aviso\.\s*Nivel\s+\w+\.\s*/i, '');
        const description = document.createElement('div'); description.style.cssText = 'font-size:13px; color:var(--text-secondary); margin-top:4px;';
        description.textContent = item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 80) + '...' : '';
        warning.append(title, description); list.appendChild(warning);
      });
    }).catch(() => { const message = document.createElement('div'); message.style.padding = '10px 0'; message.textContent = '⚠️ No se ha podido cargar la información de AEMET.'; list.replaceChildren(message); });
  }
  function prepareImport(json) {
    if (!object(json)) throw new Error('INVALID_IMPORT');
    if (json.version === VERSION) {
      if (!validV3(json.normal) || !validV3(json.secret)) throw new Error('INVALID_IMPORT');
      return { normal: copy(json.normal), secret: copy(json.secret) };
    }
    if (!own(json, 'categories') && !own(json, 'secretCategories') && !own(json, 'engines')) throw new Error('INVALID_IMPORT');
    if (own(json, 'categories') && !validLegacyCategories(json.categories)) throw new Error('INVALID_IMPORT');
    if (own(json, 'secretCategories') && !validLegacyCategories(json.secretCategories)) throw new Error('INVALID_IMPORT');
    if (own(json, 'engines') && (!Array.isArray(json.engines) || !json.engines.every(validEngine))) throw new Error('INVALID_IMPORT');
    const engines = own(json, 'engines') ? json.engines : [];
    const nextNormal = own(json, 'categories') ? convertLegacy(json.categories, [], false) : copy(normalData);
    const nextSecret = own(json, 'secretCategories') ? convertLegacy(json.secretCategories, [], true) : copy(secretData);
    mergeLegacyEngines(nextNormal, engines, false); mergeLegacyEngines(nextSecret, engines, true); normalize(nextNormal); normalize(nextSecret);
    return { normal: nextNormal, secret: nextSecret };
  }

  $('toggleShortcutsBtn').addEventListener('click', () => { ui.section.style.display = ui.section.style.display === 'none' ? 'block' : 'none'; ui.export.style.display = 'none'; });
  $('toggleExportBtn').addEventListener('click', () => { ui.export.style.display = ui.export.style.display === 'none' ? 'block' : 'none'; ui.section.style.display = 'none'; });
  $('addCategoryBtn').addEventListener('click', addCategory);
  $('addShortcutBtn').addEventListener('click', () => openForm());
  $('saveShortcutBtn').addEventListener('click', saveForm);
  $('cancelShortcutBtn').addEventListener('click', closeForm);
  ui.searchUrl.addEventListener('input', updateSearchToggle);
  $('exportBtn').addEventListener('click', () => {
    $('dataTextarea').value = JSON.stringify({ version: VERSION, normal: normalData, secret: secretData });
    $('importStatus').innerText = '✅ Código copiado en la caja de texto.';
  });
  $('importBtn').addEventListener('click', () => {
    let imported;
    try {
      imported = prepareImport(JSON.parse($('dataTextarea').value.trim()));
      commit([{ key: KEYS.normal, value: JSON.stringify(imported.normal) }, { key: KEYS.secret, value: JSON.stringify(imported.secret) }]);
    } catch (error) {
      $('importStatus').innerText = error.code === 'ROLLBACK_FAILED' ? '⚠️ No se ha podido restaurar completamente la configuración anterior; el estado puede ser incierto.' : '❌ Formato incorrecto o importación no guardada.';
      return;
    }
    normalData = imported.normal; secretData = imported.secret; closeForm(); refresh(); $('importStatus').innerText = '✅ Importado con éxito.';
  });
  ui.search.addEventListener('input', event => {
    const value = event.target.value.trim();
    if (value.toLowerCase() === 'xxx') {
      secretMode = !secretMode; localStorage.setItem('secretMode', String(secretMode)); closeForm(); refresh(); closeSearch(); return;
    }
    query = value;
    if (query) { ui.clear.style.display = 'flex'; ui.options.classList.add('show'); ui.main.style.opacity = '0.3'; ui.main.style.pointerEvents = 'none'; }
    else closeSearch();
  });
  ui.search.addEventListener('keydown', event => { if (event.key === 'Enter' && query) { const first = searchShortcuts(active())[0]; if (first) openSearch(first.searchUrl); } });
  ui.clear.addEventListener('click', closeSearch);

  const initial = bootstrap();
  normalData = initial.normal; secretData = initial.secret;
  localStorage.setItem('secretMode', 'false');
  applyStaticCollapse('ajustes', true);
  refresh();
  initAemet();
});
