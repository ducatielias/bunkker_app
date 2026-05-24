// app.js

document.addEventListener('DOMContentLoaded', () => {

  // 🔹 ESTADO GLOBAL DEL BUSCADOR Y MODO SECRETO
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchOptions = document.getElementById('searchOptions');
  const searchEnginesList = document.getElementById('searchEnginesList');
  const mainContent = document.getElementById('mainContent');
  
  let currentQuery = '';
  let isSecretMode = false;
  localStorage.setItem('secretMode', 'false'); // Siempre iniciamos en modo normal

  // 🔹 FUNCIONES DE DATOS (ENLACES DINÁMICOS)
  function getRawLinks() {
    const saved = localStorage.getItem('customLinks');
    if (saved) { try { return JSON.parse(saved).categories || DEFAULT_LINKS; } catch (e) {} }
    return DEFAULT_LINKS;
  }

  function getRawSecretLinks() {
    const saved = localStorage.getItem('customSecretLinks');
    if (saved) { try { return JSON.parse(saved).categories || DEFAULT_SECRET_LINKS; } catch (e) {} }
    return DEFAULT_SECRET_LINKS;
  }

  // Te devuelve los enlaces normales o los secretos dependiendo de dónde estés
  function getCurrentLinks() {
    return isSecretMode ? getRawSecretLinks() : getRawLinks();
  }

  // Guarda en la base de datos correcta dependiendo de dónde estés
  function saveCurrentLinks(categories) {
    const key = isSecretMode ? 'customSecretLinks' : 'customLinks';
    localStorage.setItem(key, JSON.stringify({ version: 2, categories }));
    renderLinks();
  }

  // 🔹 FUNCIONES DE DATOS (BUSCADORES)
  function loadSearchEngines() {
    const saved = localStorage.getItem('customEngines');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return DEFAULT_ENGINES;
  }
  function saveSearchEngines(engines) {
    localStorage.setItem('customEngines', JSON.stringify(engines));
    updateSearchUI(); 
    renderSearchEnginesEditor(); 
  }

  // 🔹 COLAPSAR/EXPANDIR
  window.toggleCategory = (catId) => {
    const card = document.getElementById(`cat_${catId}`);
    const chevron = document.getElementById(`chev_${catId}`);
    if (!card) return;
    
    if (card.style.display === 'none') {
      card.style.display = 'block';
      chevron.classList.remove('collapsed');
      localStorage.setItem(`collapsed_${catId}`, 'false');
    } else {
      card.style.display = 'none';
      chevron.classList.add('collapsed');
      localStorage.setItem(`collapsed_${catId}`, 'true');
    }
  };

  function applyCollapseState(catId, defaultCollapsed = false) {
    const stored = localStorage.getItem(`collapsed_${catId}`);
    const isCollapsed = stored !== null ? stored === 'true' : defaultCollapsed;
    
    if (isCollapsed) {
      const card = document.getElementById(`cat_${catId}`);
      const chevron = document.getElementById(`chev_${catId}`);
      if (card) card.style.display = 'none';
      if (chevron) chevron.classList.add('collapsed');
      
      if (stored === null) localStorage.setItem(`collapsed_${catId}`, 'true');
    }
  }

  // 🔹 RENDERIZADO Y CRUD DE ENLACES
  function renderLinks() {
    const categories = getCurrentLinks(); // Lee la base de datos que toque
    const container = document.getElementById('linksContainer');
    let html = '';

    Object.entries(categories).forEach(([catName, links]) => {
      const catId = catName.replace(/\s+/g, '_');
      
      html += `
        <div class="category-header">
          <div class="category-title-wrapper" onclick="toggleCategory('${catId}')">
            <h2 class="section-title">${catName}</h2>
            <span class="chevron" id="chev_${catId}">▼</span>
          </div>
          <span style="font-size:22px; color:var(--blue-ios); cursor:pointer; padding: 0 5px;" onclick="addLink('${catName}')">＋</span>
        </div>
        
        <div class="ios-card" id="cat_${catId}">
          <div class="app-grid">
      `;
      
      if (links.length === 0) {
        html += `<p style="color:var(--text-secondary); font-size:13px; grid-column: 1/-1;">No hay enlaces.</p>`;
      }

      links.forEach(link => {
        const domain = new URL(link.url).hostname;
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        
        html += `
          <div class="app-icon-wrapper">
            <a href="${link.url}" target="_blank" class="app-icon" title="${link.title}">
              <img src="${iconUrl}" onerror="this.style.display='none'; this.parentElement.innerText='${domain.charAt(0).toUpperCase()}'; this.parentElement.style.color='#fff'; this.parentElement.style.fontSize='24px'; this.parentElement.style.background='#8e8e93';">
            </a>
            <span class="app-label" onclick="editLink('${catName}', '${link.id}')">${link.title}</span>
          </div>
        `;
      });
      
      html += `
          </div>
          <div style="margin-top: 15px; text-align:right;">
            <button onclick="deleteCategory('${catName}')" style="background:none; border:none; color:var(--red-ios); font-size:12px; cursor:pointer;">Eliminar sección</button>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    Object.keys(categories).forEach(catName => applyCollapseState(catName.replace(/\s+/g, '_')));
  }

  window.addLink = (cat) => {
    const title = prompt(`Título en "${cat}":`, '');
    if (!title) return;
    const url = prompt(`URL (ej: https://...):`, 'https://');
    if (!url || !url.startsWith('http')) return alert('URL inválida.');
    
    const c = getCurrentLinks(); // Guarda donde toque
    c[cat].push({ id: crypto.randomUUID(), title, url });
    saveCurrentLinks(c);
  };
  
  window.editLink = (cat, id) => {
    const c = getCurrentLinks();
    const link = c[cat].find(l => l.id === id);
    if(!link) return;
    const action = confirm(`¿Quieres editar "${link.title}"?\n\n[Aceptar] = Editar\n[Cancelar] = Eliminar`);
    if (action) {
      const t = prompt('Nuevo título:', link.title);
      const u = prompt('Nueva URL:', link.url);
      if (t && u && u.startsWith('http')) { link.title = t; link.url = u; saveCurrentLinks(c); }
    } else {
      if(confirm('¿Seguro que quieres borrar este enlace?')) {
        c[cat] = c[cat].filter(l => l.id !== id);
        saveCurrentLinks(c);
      }
    }
  };

  window.addCategory = () => {
    const cat = prompt('Nombre de la nueva sección:');
    if(!cat) return;
    const c = getCurrentLinks();
    if(c[cat]) return alert('Ya existe.');
    c[cat] = [];
    saveCurrentLinks(c);
  };

  window.deleteCategory = (cat) => {
    if(!confirm(`¿Borrar la sección "${cat}" y todos sus enlaces?`)) return;
    const c = getCurrentLinks();
    delete c[cat];
    saveCurrentLinks(c);
  };


  // 🔹 BUSCADORES EDITOR
  function renderSearchEnginesEditor() {
    const engines = loadSearchEngines();
    const visibleEngines = engines.filter(e => isSecretMode ? true : !e.secret);
    
    const listEl = document.getElementById('enginesEditorList');
    let html = '';
    
    visibleEngines.forEach(eng => {
      const iconUrl = `https://www.google.com/s2/favicons?domain=${eng.domain}&sz=32`;
      const isEnabled = eng.enabled !== false; 
      const textStyle = isEnabled ? '' : 'text-decoration: line-through; color: var(--text-secondary);';
      
      html += `
        <div class="engine-list-item">
          <div class="engine-info">
            <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleEngineEnabled('${eng.id}')" title="Activar/Desactivar">
            <img src="${iconUrl}" onerror="this.style.display='none'">
            <span style="font-size: 14px; ${textStyle}">${eng.name}</span>
            ${eng.secret ? '<span class="badge-secret">Secreto</span>' : ''}
          </div>
          <div class="engine-actions">
            <button onclick="editSearchEngine('${eng.id}')" title="Editar">✏️</button>
            <button onclick="deleteSearchEngine('${eng.id}')" title="Eliminar">🗑️</button>
          </div>
        </div>
      `;
    });
    
    if(visibleEngines.length === 0) {
      html = '<p style="font-size:13px; color:var(--text-secondary); padding-bottom: 10px;">No hay buscadores visibles.</p>';
    }
    listEl.innerHTML = html;
  }

  window.toggleEngineEnabled = (id) => {
    const engines = loadSearchEngines();
    const eng = engines.find(e => e.id === id);
    if (eng) {
      eng.enabled = eng.enabled === false ? true : false;
      saveSearchEngines(engines);
    }
  };

  window.addSearchEngine = () => {
    const name = prompt('Nombre del buscador (ej: Wikipedia):');
    if (!name) return;
    const url = prompt('URL de búsqueda (Asegúrate de incluir {q} donde va el texto a buscar):', 'https://');
    if (!url || !url.includes('{q}')) return alert('Falta {q} en la URL.');
    
    let domain = '';
    try { domain = new URL(url.replace('{q}', '')).hostname; } catch(e) { domain = 'google.com'; }
    
    const isSecret = confirm('¿Quieres que este buscador solo aparezca en el Modo Secreto? \n[Aceptar] = Sí \n[Cancelar] = No');
    
    const engines = loadSearchEngines();
    engines.push({ id: crypto.randomUUID(), name, url, domain, secret: isSecret, enabled: true });
    saveSearchEngines(engines);
  };

  window.editSearchEngine = (id) => {
    const engines = loadSearchEngines();
    const eng = engines.find(e => e.id === id);
    if(!eng) return;
    
    const newName = prompt('Editar Nombre:', eng.name);
    if (!newName) return;
    const newUrl = prompt('Editar URL (Debe contener {q}):', eng.url);
    if (!newUrl || !newUrl.includes('{q}')) return alert('URL inválida.');
    const newSecret = confirm('¿Debe ser Secreto? \n[Aceptar] = Sí \n[Cancelar] = No');
    
    try { eng.domain = new URL(newUrl.replace('{q}', '')).hostname; } catch(e) {}
    eng.name = newName; eng.url = newUrl; eng.secret = newSecret;
    saveSearchEngines(engines);
  };

  window.deleteSearchEngine = (id) => {
    if (!confirm('¿Eliminar este buscador?')) return;
    let engines = loadSearchEngines();
    engines = engines.filter(e => e.id !== id);
    saveSearchEngines(engines);
  };


  // 🔹 INTERFAZ DEL BUSCADOR UNIFICADO
  function updateSearchUI() {
    if (isSecretMode) {
      searchInput.classList.add('secret-mode');
      searchInput.placeholder = 'Modo Secreto 🔓';
    } else {
      searchInput.classList.remove('secret-mode');
      searchInput.placeholder = 'Buscar...';
    }
    buildSearchList();
    renderSearchEnginesEditor(); 
    
    // Al cambiar de modo, renderizamos los enlaces (para cambiar entre normales y secretos)
    renderLinks(); 
  }

  function buildSearchList() {
    const engines = loadSearchEngines();
    const visibleEngines = engines.filter(e => {
      if (e.enabled === false) return false;
      return isSecretMode ? e.secret : !e.secret;
    });
    
    searchEnginesList.innerHTML = visibleEngines.map(e => `
      <div class="ios-list-item ${isSecretMode ? 'secret-item' : ''}" data-url="${e.url}">
        <img src="https://www.google.com/s2/favicons?domain=${e.domain}&sz=32" />
        <span>Buscar en <b>${e.name}</b></span>
      </div>
    `).join('');
    
    searchEnginesList.querySelectorAll('.ios-list-item').forEach(item => {
      item.addEventListener('click', () => {
        if (!currentQuery) return;
        const url = item.getAttribute('data-url').replace('{q}', encodeURIComponent(currentQuery));
        window.open(url, '_blank');
      });
    });
  }

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    
    if (val.toLowerCase() === 'xxx') {
      isSecretMode = !isSecretMode;
      localStorage.setItem('secretMode', isSecretMode);
      updateSearchUI();
      searchInput.value = '';
      closeSearch();
      return;
    }

    currentQuery = val;
    
    if (currentQuery.length > 0) {
      searchClear.style.display = 'flex';
      searchOptions.classList.add('show');
      mainContent.style.opacity = '0.3'; 
      mainContent.style.pointerEvents = 'none';
    } else {
      closeSearch();
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && currentQuery) {
      const engines = loadSearchEngines();
      const firstEngine = engines.find(e => {
        if(e.enabled === false) return false;
        return isSecretMode ? e.secret : !e.secret;
      });
      if (firstEngine) {
        window.open(firstEngine.url.replace('{q}', encodeURIComponent(currentQuery)), '_blank');
      }
    }
  });

  searchClear.addEventListener('click', closeSearch);

  function closeSearch() {
    searchInput.value = '';
    currentQuery = '';
    searchClear.style.display = 'none';
    searchOptions.classList.remove('show');
    mainContent.style.opacity = '1';
    mainContent.style.pointerEvents = 'auto';
    searchInput.blur();
  }

  // 🔹 AEMET
  function initAemet() {
    applyCollapseState('widget_aemet'); 
    
    const feedUrl = 'https://www.aemet.es/documentos_d/eltiempo/prediccion/avisos/rss/CAP_AFAP7703_ATOM.xml';
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&_=${new Date().getTime()}`;
    const list = document.getElementById('avisos-lista');

    fetch(apiUrl)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        if (data.status !== 'ok') throw new Error('API RSS Error');
        const items = data.items.filter(i => 
          !i.title.toLowerCase().includes('estado completo') && 
          !i.title.toLowerCase().includes('sin avisos')
        );
        
        if (!items.length) { 
          list.innerHTML = '<div style="padding: 10px 0;">✅ No hay avisos meteorológicos activos ahora mismo.</div>'; 
          return; 
        }
        
        let html = '';
        items.forEach(item => {
          let cleanTitle = item.title.replace(/^Aviso\.\s*Nivel\s+\w+\.\s*/i, '');
          let desc = item.description ? item.description.replace(/<[^>]*>/g, '').substring(0, 80) + '...' : '';
          const level = /rojo/i.test(item.title) ? 'nivel-rojo' : /naranja/i.test(item.title) ? 'nivel-naranja' : 'nivel-amarillo';
          
          html += `
            <div class="aviso">
              <div class="${level}">⚠️ ${cleanTitle}</div>
              <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">${desc}</div>
            </div>
          `;
        });
        list.innerHTML = html;
      })
      .catch(() => { 
        list.innerHTML = '<div style="padding: 10px 0;">⚠️ No se ha podido cargar la información de AEMET.</div>'; 
      });
  }

  // 🔹 MENÚS AJUSTES EXPORTAR / IMPORTAR
  document.getElementById('toggleEnginesBtn').addEventListener('click', () => {
    const sec = document.getElementById('enginesSection');
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    document.getElementById('exportSection').style.display = 'none'; 
  });

  document.getElementById('toggleExportBtn').addEventListener('click', () => {
    const sec = document.getElementById('exportSection');
    sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    document.getElementById('enginesSection').style.display = 'none'; 
  });

  // Ahora exportamos tanto los normales como los secretos
  document.getElementById('exportBtn').addEventListener('click', () => {
    const exportData = { 
      version: 2, 
      categories: getRawLinks(), 
      secretCategories: getRawSecretLinks(),
      engines: loadSearchEngines() 
    };
    document.getElementById('dataTextarea').value = JSON.stringify(exportData);
    document.getElementById('importStatus').innerText = "✅ Código copiado en la caja de texto.";
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    const val = document.getElementById('dataTextarea').value.trim();
    try {
      const json = JSON.parse(val);
      
      // Importamos todas las bases de datos que vengan en el archivo
      if(json.categories) localStorage.setItem('customLinks', JSON.stringify({ version: 2, categories: json.categories }));
      if(json.secretCategories) localStorage.setItem('customSecretLinks', JSON.stringify({ version: 2, categories: json.secretCategories }));
      if(json.engines) saveSearchEngines(json.engines);
      
      renderLinks(); // Refrescamos la vista
      document.getElementById('importStatus').innerText = "✅ Importado con éxito.";
    } catch(e) {
      document.getElementById('importStatus').innerText = "❌ Formato incorrecto.";
    }
  });

  // 🔹 INICIALIZACIÓN
  applyCollapseState('ajustes', true); 
  updateSearchUI(); // Esto inicializará la interfaz y cargará los enlaces correspondientes
  initAemet();
});