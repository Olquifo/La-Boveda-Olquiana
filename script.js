// LISTA DE LOS 7 ESCRITOS / ENSAYOS PRE-CARGADOS
const DEFAULT_ESSAYS = [
  { id: '1', title: 'DR. STONE EL ALMA HECHO ANIME', filename: 'DR. STONE EL ALMA HECHO ANIME.pdf', category: 'anime', tag: 'Anime', description: 'Análisis a Dr Stone' },
  { id: '2', title: 'El Anime más Loco de la Historia', filename: 'El Anime mas Loco de la Historia.pdf', category: 'anime', tag: 'Anime', description: 'Análisis a Kaminaki' },
  { id: '3', title: 'El Camino de la Explosión', filename: 'El Camino de la Explosion.pdf', category: 'personaje', tag: 'Personaje', description: 'Análisis a Megumin' },
  { id: '4', title: 'Pasión por Vivir', filename: 'Pasion por Vivir.pdf', category: 'personaje', tag: 'Personaje', description: 'Análisis a Hu Tao' },
  { id: '5', title: 'Una Protagonista Única', filename: 'Una Protagonista Unica.pdf', category: 'personaje', tag: 'Personaje', description: 'Análisis a Monica Everett' },
  { id: '6', title: 'Una Sandía que Brotó', filename: 'Una Sandia que Broto.pdf', category: 'personaje', tag: 'Personaje', description: 'Análisis a Suika' },
  { id: '7', title: 'Una Mirada Filosófica y Antropológica a la Fantasía', filename: 'Una Mirada Filosofica y Antropologica a la Fantasia.pdf', category: 'general', tag: 'General', description: 'Reflexion sobre la conexion de la fantasia con la humanidad' }
];

// ESTADO GENERAL & PERSISTENCIA LOCAL
// Modo público (solo lectura): los datos salen de datos.json y nada se guarda en el navegador
const PUBLIC_MODE = window.__PUBLIC__ === true;
const PUBLISHED = window.__DATA__ || null;
const appStore = PUBLIC_MODE
  ? (() => {
      const m = new Map(Object.entries((PUBLISHED && PUBLISHED.data) || {}));
      return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
    })()
  : localStorage;

let profileBio = appStore.getItem('olquia_bio') || 'Archivo personal de opiniones anime.';
let profileAvatar = appStore.getItem('olquia_avatar') || '';
let topAnimes = JSON.parse(appStore.getItem('olquia_top_animes')) || Array(20).fill(null);
let topCharacters = JSON.parse(appStore.getItem('olquia_top_characters')) || Array(20).fill(null);

let essays = DEFAULT_ESSAYS;
let episodes = readJSON('olquia_episodes', []);

// ANIMES (series): ahora viven junto a sus comentarios de episodios.
// Migra los datos de la antigua pestaña "Animes" la primera vez.
function loadSeries() {
  const stored = readJSON('olquia_series', null);
  if (Array.isArray(stored)) return stored;

  const legacy = readJSON('olquia_animes', []);
  const list = legacy.map(a => ({
    id: String(a.id || uid()),
    title: a.title,
    image: a.image || '',
    status: a.status || 'Viendo',
    score: parseInt(a.score) >= 1 ? parseInt(a.score) : null,
    review: a.review || ''
  }));
  // Animes que solo existían como comentarios de episodios
  episodes.forEach(ep => {
    if (!list.some(s => s.title.toUpperCase() === ep.animeName.toUpperCase())) list.push(blankSeries(ep.animeName));
  });
  appStore.setItem('olquia_series', JSON.stringify(list));
  return list;
}
let series = loadSeries();

// Hilo (anime) que se está viendo en este momento; null = lista general
let activeSeriesId = null;

// NAVEGACIÓN DE PESTAÑAS
function switchTab(tabId) {
  ['profile', 'essays', 'episodes', 'tops'].forEach(tab => {
    const section = document.getElementById(`tab-${tab}`);
    if (section) section.classList.add('hidden');
    
    const btnDesktop = document.getElementById(`nav-${tab}`);
    const btnMob = document.getElementById(`mob-nav-${tab}`);
    
    if (tab === tabId) {
      if (btnDesktop) btnDesktop.className = "px-4 py-2 rounded-lg text-sm font-medium transition-all bg-indigo-600 text-white shadow";
      if (btnMob) btnMob.className = "flex flex-col items-center py-1 px-3 text-indigo-400 font-medium text-xs";
    } else {
      if (btnDesktop) btnDesktop.className = "px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-all";
      if (btnMob) btnMob.className = "flex flex-col items-center py-1 px-3 text-slate-400 font-medium text-xs";
    }
  });
  
  const activeSection = document.getElementById(`tab-${tabId}`);
  if (activeSection) activeSection.classList.remove('hidden');

  // Si salimos de episodios, cerramos el hilo activo
  if (tabId !== 'episodes') {
    activeSeriesId = null;
  }
}

// RENDERIZADO DEL PERFIL & TOPS 20
function renderProfile() {
  const bioEl = document.getElementById('profile-bio');
  if (bioEl) bioEl.innerText = profileBio;

  const avatarContainer = document.getElementById('profile-avatar-container');
  if (avatarContainer) {
    if (profileAvatar.trim() !== '') {
      avatarContainer.innerHTML = `<img src="${esc(profileAvatar)}" class="w-full h-full object-cover" alt="Avatar" onerror="this.parentElement.innerHTML='O';">`;
    } else {
      avatarContainer.innerHTML = `O`;
    }
  }

  // Top 20 Animes
  const animeGrid = document.getElementById('top-animes-grid');
  if (animeGrid) {
    animeGrid.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const item = topAnimes[i];
      const card = document.createElement('div');
      card.className = "relative group aspect-[2/3] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow cursor-pointer";
      if (PUBLIC_MODE) card.classList.remove('cursor-pointer');
      else card.onclick = () => openTopItemModal('anime', i + 1);

      if (item) {
        card.innerHTML = `
          <img src="${esc(item.image)}" class="w-full h-full object-cover" alt="${esc(item.name)}">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-between">
            <span class="bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded w-fit">#${i + 1}</span>
            <span class="text-[11px] font-semibold text-white leading-tight line-clamp-2">${esc(item.name)}</span>
          </div>
        `;
      } else {
        if (PUBLIC_MODE) continue; // los puestos vacíos no se muestran al público
        card.className += " flex flex-col items-center justify-center text-slate-600 hover:border-slate-700";
        card.innerHTML = `<span class="text-xs font-bold text-slate-700">#${i + 1}</span><span class="text-[10px] text-slate-600">+ Vacío</span>`;
      }
      animeGrid.appendChild(card);
    }
  }

  // Top 20 Personajes
  const charGrid = document.getElementById('top-characters-grid');
  if (charGrid) {
    charGrid.innerHTML = '';
    for (let i = 0; i < 20; i++) {
      const item = topCharacters[i];
      const card = document.createElement('div');
      card.className = "relative group aspect-[2/3] bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow cursor-pointer";
      if (PUBLIC_MODE) card.classList.remove('cursor-pointer');
      else card.onclick = () => openTopItemModal('character', i + 1);

      if (item) {
        card.innerHTML = `
          <img src="${esc(item.image)}" class="w-full h-full object-cover" alt="${esc(item.name)}">
          <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity p-1.5 flex flex-col justify-between">
            <span class="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded w-fit">#${i + 1}</span>
            <span class="text-[11px] font-semibold text-white leading-tight line-clamp-2">${esc(item.name)}</span>
          </div>
        `;
      } else {
        if (PUBLIC_MODE) continue; // los puestos vacíos no se muestran al público
        card.className += " flex flex-col items-center justify-center text-slate-600 hover:border-slate-700";
        card.innerHTML = `<span class="text-xs font-bold text-slate-700">#${i + 1}</span><span class="text-[10px] text-slate-600">+ Vacío</span>`;
      }
      charGrid.appendChild(card);
    }
  }
}

// EDICIÓN DE BIO Y AVATAR
function openEditBioModal() {
  if (PUBLIC_MODE) return;
  const bioInput = document.getElementById('bio-input');
  if (bioInput) bioInput.value = profileBio;
  const avatarInput = document.getElementById('avatar-input');
  if (avatarInput) avatarInput.value = profileAvatar;

  const bioModal = document.getElementById('bio-modal');
  if (bioModal) bioModal.classList.remove('hidden');
}

function closeEditBioModal() {
  const bioModal = document.getElementById('bio-modal');
  if (bioModal) bioModal.classList.add('hidden');
}

function saveBio() {
  const bioInput = document.getElementById('bio-input');
  const avatarInput = document.getElementById('avatar-input');

  if (bioInput) {
    profileBio = bioInput.value.trim();
    appStore.setItem('olquia_bio', profileBio);
  }
  if (avatarInput) {
    profileAvatar = avatarInput.value.trim();
    appStore.setItem('olquia_avatar', profileAvatar);
  }

  renderProfile();
  closeEditBioModal();
}

// EDICIÓN DE ITEMS TOP 20
function openTopItemModal(type, rank = 1) {
  if (PUBLIC_MODE) return;
  const typeInput = document.getElementById('top-item-type');
  const rankInput = document.getElementById('top-item-rank');
  const titleEl = document.getElementById('top-modal-title');
  const nameInput = document.getElementById('top-item-name');
  const imageInput = document.getElementById('top-item-image');
  const modal = document.getElementById('top-item-modal');

  if (typeInput) typeInput.value = type;
  if (rankInput) rankInput.value = rank;
  if (titleEl) titleEl.innerText = type === 'anime' ? `Editar Puesto #${rank} (Anime)` : `Editar Puesto #${rank} (Personaje)`;
  
  const currentItem = type === 'anime' ? topAnimes[rank - 1] : topCharacters[rank - 1];
  if (nameInput) nameInput.value = currentItem ? currentItem.name : '';
  if (imageInput) imageInput.value = currentItem ? currentItem.image : '';

  if (modal) modal.classList.remove('hidden');
}

function closeTopItemModal() {
  const modal = document.getElementById('top-item-modal');
  if (modal) modal.classList.add('hidden');
}

function saveTopItem() {
  const type = document.getElementById('top-item-type').value;
  const rank = parseInt(document.getElementById('top-item-rank').value) - 1;
  const name = document.getElementById('top-item-name').value.trim();
  const image = document.getElementById('top-item-image').value.trim();

  if (rank < 0 || rank >= 20) return alert('El ranking debe ser entre 1 y 20.');

  const newItem = name && image ? { name, image } : null;

  if (type === 'anime') {
    topAnimes[rank] = newItem;
    appStore.setItem('olquia_top_animes', JSON.stringify(topAnimes));
  } else {
    topCharacters[rank] = newItem;
    appStore.setItem('olquia_top_characters', JSON.stringify(topCharacters));
  }

  renderProfile();
  closeTopItemModal();
}

// RENDERIZADO DE ESCRITOS / ENSAYOS
function renderEssays(filter = 'all') {
  const container = document.getElementById('essays-grid');
  if (!container) return;
  container.innerHTML = '';
  const filtered = filter === 'all' ? essays : essays.filter(e => e.category === filter);

  filtered.forEach(essay => {
    const card = document.createElement('div');
    card.className = "bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md hover:shadow-indigo-500/10";
    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">${esc(essay.tag)}</span>
          <span class="text-xs text-slate-500">PDF</span>
        </div>
        <h3 class="font-bold text-slate-100 text-base leading-snug">${esc(essay.title)}</h3>
        <p class="text-xs text-slate-400 leading-relaxed">${esc(essay.description)}</p>
      </div>
      <div class="pt-4 mt-2 border-t border-slate-800/80 flex gap-2">
        <button onclick="openPdfModalById('${esc(essay.id)}')" class="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs py-2 px-3 rounded-lg font-medium transition-colors border border-indigo-500/30 flex items-center justify-center gap-1">👁️ Leer Escrito</button>
        <a href="${esc(essay.filename)}" download class="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg text-xs flex items-center justify-center border border-slate-700" title="Descargar PDF">📥</a>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterEssays() {
  const filterSelect = document.getElementById('essay-filter');
  if (filterSelect) renderEssays(filterSelect.value);
}

// VISUALIZADOR DE PDF
function openPdfModal(filename, title) {
  const modalTitle = document.getElementById('pdf-modal-title');
  const pdfFrame = document.getElementById('pdf-frame');
  const downloadLink = document.getElementById('pdf-download-link');
  const modal = document.getElementById('pdf-modal');

  if (modalTitle) modalTitle.innerText = title;
  if (pdfFrame) pdfFrame.src = filename;
  if (downloadLink) downloadLink.href = filename;
  if (modal) modal.classList.remove('hidden');
}

function closePdfModal() {
  const modal = document.getElementById('pdf-modal');
  const pdfFrame = document.getElementById('pdf-frame');
  if (modal) modal.classList.add('hidden');
  if (pdfFrame) pdfFrame.src = '';
}

// ============================================================
// UTILIDADES
// ============================================================
const COVER_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="50%" fill="#64748b" font-family="sans-serif" font-size="20" text-anchor="middle">Sin portada</text></svg>'
);

// Escapa texto para meterlo seguro dentro de innerHTML / atributos
function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(appStore.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function blankSeries(title) {
  return { id: uid(), title, image: '', status: 'Viendo', score: null, review: '', year: null };
}

function renderMd(text) {
  return typeof marked !== 'undefined' ? marked.parse(text || '') : esc(text);
}

// ============================================================
// ESCRITOS: filtro con contadores automáticos + visor PDF por id
// ============================================================
function updateEssayFilterCounts() {
  const sel = document.getElementById('essay-filter');
  if (!sel) return;
  const count = c => essays.filter(e => e.category === c).length;
  const current = sel.value || 'all';
  sel.innerHTML = `
    <option value="all">Todos los temas (${essays.length})</option>
    <option value="personaje">Personaje (${count('personaje')})</option>
    <option value="anime">Anime (${count('anime')})</option>
    <option value="general">General (${count('general')})</option>`;
  sel.value = current;
}

function openPdfModalById(id) {
  const essay = essays.find(e => e.id === id);
  if (essay) openPdfModal(essay.filename, essay.title);
}

// ============================================================
// ANIMES + OPINIONES DE EPISODIOS (todo en una sola sección)
// ============================================================
const STATUS_STYLES = {
  'Viendo': 'bg-indigo-600/90 text-white',
  'Completado': 'bg-emerald-600/90 text-white',
  'Pendiente': 'bg-slate-600/90 text-white',
  'Pausado': 'bg-amber-600/90 text-white'
};

function saveSeriesData() { appStore.setItem('olquia_series', JSON.stringify(series)); }
function saveEpisodesData() { appStore.setItem('olquia_episodes', JSON.stringify(episodes)); }

function getSeries(id) { return series.find(s => s.id === id); }
function findSeriesByName(name) {
  const key = String(name || '').trim().toUpperCase();
  return series.find(s => s.title.toUpperCase() === key);
}
function seriesEpisodes(s) {
  return episodes
    .filter(e => e.animeName.toUpperCase() === s.title.toUpperCase())
    .sort((a, b) => parseInt(a.number) - parseInt(b.number));
}

function statusBadge(status, extra = '') {
  return `<span class="${STATUS_STYLES[status] || STATUS_STYLES['Viendo']} font-medium text-[10px] px-2 py-0.5 rounded ${extra}">${esc(status)}</span>`;
}
function scoreBadge(score, extra = '') {
  return score ? `<span class="bg-slate-950/80 backdrop-blur text-amber-400 font-bold text-xs px-2 py-1 rounded-md border border-slate-800 ${extra}">★ ${esc(score)}</span>` : '';
}
function coverSrc(s) { return s.image ? esc(s.image) : COVER_FALLBACK; }

function updateSeriesDatalist() {
  const list = document.getElementById('series-names');
  if (list) list.innerHTML = series.map(s => `<option value="${esc(s.title)}"></option>`).join('');
}

function renderEpisodes() {
  const container = document.getElementById('episodes-list');
  if (!container) return;

  const active = activeSeriesId ? getSeries(activeSeriesId) : null;
  const filtersEl = document.getElementById('series-filters');
  if (active) {
    if (filtersEl) filtersEl.classList.add('hidden');
    renderThread(container, active);
  } else {
    activeSeriesId = null;
    if (filtersEl) filtersEl.classList.remove('hidden');
    renderSeriesList(container);
  }
  updateSeriesDatalist();
}

// ---------- Lista general de animes ----------
function renderSeriesList(container) {
  updateSeriesFilterUI();
  const visible = getVisibleSeries();
  const countEl = document.getElementById('filter-count');
  if (countEl) countEl.textContent = series.length ? `Mostrando ${visible.length} de ${series.length} animes` : '';

  if (series.length > 0 && visible.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">Ningún anime coincide con esos filtros. <button onclick="clearSeriesFilters()" class="text-indigo-400 hover:text-indigo-300 underline">Limpiar filtros</button></p>`;
    return;
  }
  if (series.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 text-center py-8">Aún no hay animes. ¡Agrega el primero con "+ Nuevo Anime" o escribe una impresión!</p>`;
    return;
  }

  let html = `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">`;
  visible.forEach(s => {
    const count = seriesEpisodes(s).length;
    html += `
      <div onclick="openSeries('${esc(s.id)}')" class="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-xl overflow-hidden cursor-pointer transition-all shadow-md hover:shadow-indigo-500/10 flex flex-col justify-between group">
        <div class="h-36 bg-slate-800 relative overflow-hidden">
          <img src="${coverSrc(s)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${esc(s.title)}" onerror="this.onerror=null;this.src=COVER_FALLBACK">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
          ${scoreBadge(s.score, 'absolute top-2 right-2')}
          ${statusBadge(s.status, 'absolute top-2 left-2')}
          <span class="absolute bottom-2 left-3 right-3 font-bold text-sm text-white tracking-wide truncate">${esc(s.title)}</span>
        </div>
        <div class="p-4 flex justify-between items-center bg-slate-900">
          <span class="text-xs text-slate-400">${s.year ? s.year + ' · ' : ''}💬 ${count} ${count === 1 ? 'comentario' : 'comentarios'}</span>
          <span class="text-xs bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg font-medium group-hover:bg-indigo-600 group-hover:text-white transition-colors">Ver Hilo →</span>
        </div>
      </div>`;
  });
  html += `</div>`;
  container.innerHTML = html;
}

// ---------- Hilo de un anime ----------
function renderThread(container, s) {
  const eps = seriesEpisodes(s);
  const sid = esc(s.id);

  const ratingButtons = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `
    <button onclick="rateSeries('${sid}', ${n})" title="Nota ${n}" class="w-7 h-7 rounded-md text-xs font-bold border transition-colors ${s.score === n ? 'bg-amber-500 text-black border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-amber-500/60'}">${n}</button>`).join('');

  let html = `
    <div class="flex items-center justify-between mb-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800">
      <button onclick="backToEpisodesList()" class="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-400 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors">
        ← Volver a la lista de animes
      </button>
      <span class="text-sm font-bold text-slate-200 tracking-wide">Hilo de Opiniones</span>
    </div>

    <div class="flex gap-4 bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4">
      <img src="${coverSrc(s)}" class="w-20 h-28 object-cover rounded-lg border border-slate-800 shrink-0" alt="${esc(s.title)}" onerror="this.onerror=null;this.src=COVER_FALLBACK">
      <div class="flex-1 min-w-0 space-y-2">
        <h3 class="text-lg font-bold text-slate-100 break-words">${esc(s.title)}</h3>
        <div class="flex flex-wrap items-center gap-2">
          ${statusBadge(s.status)}
          ${s.year ? `<span class="text-xs text-slate-400">${s.year}</span>` : ''}
          <span class="text-xs text-slate-500">💬 ${eps.length} ${eps.length === 1 ? 'comentario' : 'comentarios'}</span>
        </div>
        <div>
          <p class="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Nota ${s.score ? `· ${s.score}/10` : '· sin calificar'}</p>
          <div class="flex flex-wrap gap-1 edit-only">${ratingButtons}</div>
        </div>
        <div class="flex flex-wrap gap-2 pt-1 edit-only">
          <button onclick="openEpisodeModal(null, '${sid}')" class="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors">+ Episodio</button>
          <button onclick="openSeriesModal('${sid}')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs px-3 py-1.5 rounded-lg transition-colors">✏️ Editar anime</button>
          <button onclick="deleteSeries('${sid}')" class="text-[11px] text-red-400 hover:text-red-300 px-2">Eliminar anime</button>
        </div>
      </div>
    </div>

    <div class="space-y-4 relative border-l-2 border-indigo-500/30 ml-4 pl-4 sm:ml-6 sm:pl-6">`;

  if (eps.length === 0) {
    html += `<p class="text-xs text-slate-500 py-4">No hay episodios registrados para este anime todavía.</p>`;
  } else {
    eps.forEach((ep, index) => {
      html += `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 relative shadow-md">
          <span class="absolute -left-[27px] sm:-left-[35px] top-4 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center ring-4 ring-slate-950">${index + 1}</span>
          <div class="flex justify-between items-start gap-2">
            <h4 class="text-sm font-bold text-slate-200">Capítulo ${esc(ep.number)} ${ep.title ? `- ${esc(ep.title)}` : ''}</h4>
            <div class="flex gap-3 shrink-0 edit-only">
              <button onclick="openEpisodeModal('${esc(ep.id)}')" class="text-[10px] text-slate-500 hover:text-indigo-400">Editar</button>
              <button onclick="deleteEpisode('${esc(ep.id)}')" class="text-[10px] text-slate-500 hover:text-red-400">Eliminar</button>
            </div>
          </div>
          <div class="text-xs text-slate-300 leading-relaxed border-t border-slate-800/60 pt-2">
            ${renderMd(ep.content)}
          </div>
        </div>`;
    });
  }

  // Opinión general: se edita desde aquí mismo
  html += `
      <div class="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/40 rounded-xl p-5 space-y-3 shadow-lg mt-6">
        <div class="flex items-center justify-between gap-2 border-b border-indigo-500/30 pb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">🏁</span>
            <h4 class="text-sm font-bold text-indigo-300 uppercase tracking-wider">Opinión General / Conclusión del Hilo</h4>
          </div>
          ${s.score ? `<span class="text-amber-400 font-bold text-sm">★ ${s.score}/10</span>` : ''}
        </div>
        ${s.review
          ? `<p class="text-xs text-slate-300 leading-relaxed whitespace-pre-line">${esc(s.review)}</p>`
          : `<p class="text-xs text-slate-500">Todavía no hay opinión general para este anime.</p>`}
        <button onclick="openSeriesModal('${sid}')" class="edit-only text-xs bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors">
          ${s.review ? '✏️ Editar opinión general' : '✍️ Escribir opinión general'}
        </button>
      </div>
    </div>`;

  container.innerHTML = html;
}

// ---------- Filtros y orden de la lista de animes ----------
let seriesFilters = { q: '', year: 'all', score: 'all', sort: 'recent' };

function getVisibleSeries() {
  const f = seriesFilters;
  const q = f.q.trim().toLowerCase();
  const list = series.filter(s => {
    if (q && !s.title.toLowerCase().includes(q)) return false;
    if (f.year === 'none' && s.year) return false;
    if (f.year !== 'all' && f.year !== 'none' && String(s.year || '') !== f.year) return false;
    if (f.score === 'none' && s.score) return false;
    if (f.score !== 'all' && f.score !== 'none' && String(s.score || '') !== f.score) return false;
    return true;
  });
  const byTitle = (a, b) => a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
  const sorters = {
    az: byTitle,
    za: (a, b) => byTitle(b, a),
    'score-desc': (a, b) => (b.score ?? -1) - (a.score ?? -1) || byTitle(a, b),
    'score-asc': (a, b) => (a.score ?? 99) - (b.score ?? 99) || byTitle(a, b),
    'year-desc': (a, b) => (b.year ?? -1) - (a.year ?? -1) || byTitle(a, b),
    'year-asc': (a, b) => (a.year ?? 9999) - (b.year ?? 9999) || byTitle(a, b)
  };
  if (sorters[f.sort]) list.sort(sorters[f.sort]); // 'recent' = orden de carga
  return list;
}

// Rellena las opciones de año con los años que existen y deja los controles al día
function updateSeriesFilterUI() {
  const yearEl = document.getElementById('filter-year');
  if (!yearEl) return;
  const years = [...new Set(series.map(s => s.year).filter(Boolean))].sort((a, b) => b - a);
  const hasNone = series.some(s => !s.year);
  yearEl.innerHTML = '<option value="all">Todos los años</option>'
    + years.map(y => `<option value="${y}">${y}</option>`).join('')
    + (hasNone ? '<option value="none">Sin año</option>' : '');
  yearEl.value = seriesFilters.year;
  if (yearEl.value !== seriesFilters.year) { seriesFilters.year = 'all'; yearEl.value = 'all'; }
  document.getElementById('filter-score').value = seriesFilters.score;
  document.getElementById('filter-sort').value = seriesFilters.sort;
}

function onSeriesFilterChange() {
  seriesFilters = {
    q: document.getElementById('filter-q').value,
    year: document.getElementById('filter-year').value,
    score: document.getElementById('filter-score').value,
    sort: document.getElementById('filter-sort').value
  };
  renderEpisodes();
}

function clearSeriesFilters() {
  seriesFilters = { q: '', year: 'all', score: 'all', sort: 'recent' };
  document.getElementById('filter-q').value = '';
  renderEpisodes();
}

function openSeries(id) {
  activeSeriesId = id;
  renderEpisodes();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToEpisodesList() {
  activeSeriesId = null;
  renderEpisodes();
}

function rateSeries(id, n) {
  const s = getSeries(id);
  if (!s) return;
  s.score = s.score === n ? null : n; // tocar la misma nota otra vez la quita
  saveSeriesData();
  renderEpisodes();
}

// ---------- Modal: crear / editar anime ----------
function openSeriesModal(id = null) {
  if (PUBLIC_MODE) return;
  const s = id ? getSeries(id) : null;
  document.getElementById('series-id').value = s ? s.id : '';
  document.getElementById('series-modal-title').innerText = s ? 'Editar Anime' : 'Agregar Nuevo Anime';
  document.getElementById('series-title').value = s ? s.title : '';
  document.getElementById('series-image').value = s ? s.image : '';
  document.getElementById('series-year').value = s && s.year ? s.year : '';
  document.getElementById('series-status').value = s ? s.status : 'Viendo';
  document.getElementById('series-score').value = s && s.score ? String(s.score) : '';
  document.getElementById('series-review').value = s ? s.review : '';
  document.getElementById('series-modal').classList.remove('hidden');
}

function closeSeriesModal() {
  document.getElementById('series-modal').classList.add('hidden');
}

function saveSeriesForm() {
  const id = document.getElementById('series-id').value;
  const title = document.getElementById('series-title').value.trim();
  if (!title) return alert('Por favor ingresa un título.');

  const clash = findSeriesByName(title);
  if (clash && clash.id !== id) return alert('Ya existe un anime con ese título.');

  const scoreRaw = parseInt(document.getElementById('series-score').value);
  const yearRaw = parseInt(document.getElementById('series-year').value);
  const data = {
    title,
    year: yearRaw >= 1950 && yearRaw <= 2100 ? yearRaw : null,
    image: document.getElementById('series-image').value.trim(),
    status: document.getElementById('series-status').value,
    score: scoreRaw >= 1 && scoreRaw <= 10 ? scoreRaw : null,
    review: document.getElementById('series-review').value.trim()
  };

  if (id) {
    const s = getSeries(id);
    if (s) {
      // Si cambió el título, movemos sus episodios al nuevo nombre
      if (s.title !== title) {
        episodes.forEach(ep => {
          if (ep.animeName.toUpperCase() === s.title.toUpperCase()) ep.animeName = title;
        });
        saveEpisodesData();
      }
      Object.assign(s, data);
    }
  } else {
    series.unshift({ id: uid(), ...data });
  }

  saveSeriesData();
  renderEpisodes();
  closeSeriesModal();
}

function deleteSeries(id) {
  const s = getSeries(id);
  if (!s) return;
  const n = seriesEpisodes(s).length;
  const msg = n > 0
    ? `¿Eliminar "${s.title}" y sus ${n} comentarios de episodios?`
    : `¿Eliminar "${s.title}"?`;
  if (!confirm(msg)) return;

  episodes = episodes.filter(e => e.animeName.toUpperCase() !== s.title.toUpperCase());
  series = series.filter(x => x.id !== id);
  saveEpisodesData();
  saveSeriesData();
  activeSeriesId = null;
  renderEpisodes();
}

// ---------- Modal: crear / editar comentario de episodio ----------
function openEpisodeModal(epId = null, seriesId = null) {
  if (PUBLIC_MODE) return;
  const ep = epId ? episodes.find(e => e.id === epId) : null;
  const preset = seriesId ? getSeries(seriesId) : (activeSeriesId ? getSeries(activeSeriesId) : null);

  document.getElementById('ep-id').value = ep ? ep.id : '';
  document.getElementById('episode-modal-title').innerText = ep ? 'Editar Comentario' : 'Nuevo Comentario de Episodio';

  if (ep) {
    document.getElementById('ep-anime-name').value = ep.animeName;
    document.getElementById('ep-number').value = ep.number;
    document.getElementById('ep-title').value = ep.title || '';
    document.getElementById('ep-content').value = ep.content;
  } else {
    document.getElementById('ep-anime-name').value = preset ? preset.title : '';
    const nums = preset ? seriesEpisodes(preset).map(e => parseInt(e.number) || 0) : [];
    document.getElementById('ep-number').value = nums.length ? Math.max(...nums) + 1 : 1;
    document.getElementById('ep-title').value = '';
    document.getElementById('ep-content').value = '';
  }

  document.getElementById('episode-modal').classList.remove('hidden');
}

function closeEpisodeModal() {
  document.getElementById('episode-modal').classList.add('hidden');
}

function saveEpisode() {
  const id = document.getElementById('ep-id').value;
  const animeName = document.getElementById('ep-anime-name').value.trim();
  const content = document.getElementById('ep-content').value.trim();
  if (!animeName || !content) return alert('Ingresa el anime y tu comentario.');

  // Si el anime no existe todavía, se crea automáticamente
  let s = findSeriesByName(animeName);
  if (!s) {
    s = blankSeries(animeName);
    series.unshift(s);
    saveSeriesData();
  }

  const data = {
    animeName: s.title,
    number: document.getElementById('ep-number').value,
    title: document.getElementById('ep-title').value.trim(),
    content
  };

  const existing = id ? episodes.find(e => e.id === id) : null;
  if (existing) {
    Object.assign(existing, data);
  } else {
    episodes.unshift({ id: uid(), ...data });
  }

  saveEpisodesData();
  renderEpisodes();
  closeEpisodeModal();
}

function deleteEpisode(id) {
  if (confirm('¿Eliminar este comentario?')) {
    episodes = episodes.filter(e => e.id !== id);
    saveEpisodesData();
    renderEpisodes();
  }
}

// ============================================================
// TOPS DEL AÑO (imágenes guardadas en IndexedDB, sin límite de 5 MB)
// ============================================================
const TOP_CATEGORIES = [
  { id: 'esperados',   name: y => `Animes ${y + 1}`, desc: 'Los que más espero' },
  { id: 'anime-anio',  name: () => 'Animes del Año', desc: 'Estrenos del año' },
  { id: 'vistos',      name: () => 'Animes Vistos', desc: y => `No estrenados en ${y}` },
  { id: 'decepciones', name: () => 'Decepciones' },
  { id: 'episodios',   name: () => 'Episodios del Año' },
  { id: 'lecturas',    name: () => 'Lecturas' },
  { id: 'lolis',       name: () => 'Lolis' },
  { id: 'openings',    name: () => 'Openings del Año' },
  { id: 'endings',     name: () => 'Endings del Año' },
  { id: 'ost',         name: () => 'Mejores OST' },
  { id: 'parejas',     name: () => 'Parejas' },
  { id: 'peleas',      name: () => 'Peleas' },
  { id: 'peliculas',   name: () => 'Películas' },
  { id: 'pers-fem',    name: () => 'Personajes Femeninos' },
  { id: 'pers-masc',   name: () => 'Personajes Masculinos' },
  { id: 'tetonas',     name: () => 'Tetonas' },
  { id: 'waifus',      name: () => 'Waifus' }
];

const topLabel = (c, y) => (typeof c.name === 'function' ? c.name(y) : c.name);
const topDesc = (c, y) => (typeof c.desc === 'function' ? c.desc(y) : (c.desc || ''));

// ---- IndexedDB mínimo: clave "AÑO:categoria" -> imagen (data URL) ----
let _topsDb = null;
function topsDb() {
  if (!_topsDb) {
    _topsDb = new Promise((resolve, reject) => {
      const req = indexedDB.open('boveda-olquiana', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('tops');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return _topsDb;
}
function topsTx(fn) {
  return topsDb().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction('tops', 'readwrite');
    fn(tx.objectStore('tops'));
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => reject(tx.error);
  }));
}
function topsGetAll(prefix = '') {
  return topsDb().then(db => new Promise((resolve, reject) => {
    const out = {};
    const range = prefix ? IDBKeyRange.bound(prefix, prefix + '\uffff') : null;
    const req = db.transaction('tops', 'readonly').objectStore('tops').openCursor(range);
    req.onsuccess = () => {
      const cur = req.result;
      if (cur) { out[cur.key] = cur.value; cur.continue(); } else resolve(out);
    };
    req.onerror = () => reject(req.error);
  }));
}
const topsPut = (key, value) => topsTx(s => s.put(value, key));
const topsDelete = key => topsTx(s => s.delete(key));
const topsClear = () => topsTx(s => s.clear());

// ---- Estado ----
let topYears = readJSON('olquia_tops_years', []);
let currentTopYear = new Date().getFullYear();
let topImages = {};
let topPickTarget = null;
let topViewerCat = null;

function initTops() {
  topYears = (Array.isArray(topYears) ? topYears : []).map(Number).filter(y => y >= 2000 && y <= 2100);
  if (!PUBLIC_MODE && !topYears.includes(currentTopYear)) topYears.push(currentTopYear);
  topYears = [...new Set(topYears)].sort((a, b) => b - a);
  if (PUBLIC_MODE && topYears.length) currentTopYear = topYears[0];
  if (!topYears.length) topYears.push(currentTopYear);
  appStore.setItem('olquia_tops_years', JSON.stringify(topYears));
  renderTops();
}

async function renderTops() {
  const y = currentTopYear;
  const grid = document.getElementById('tops-grid');
  if (!grid) return;

  document.getElementById('tops-year').innerHTML = topYears
    .map(yr => `<option value="${yr}" ${yr === y ? 'selected' : ''}>${yr}</option>`).join('');

  let failed = false;
  if (PUBLIC_MODE) {
    const files = (PUBLISHED && PUBLISHED.topFiles) || {};
    topImages = Object.fromEntries(Object.entries(files).filter(([k]) => k.startsWith(`${y}:`)));
  } else {
    try { topImages = await topsGetAll(`${y}:`); } catch { topImages = {}; failed = true; }
  }

  const done = TOP_CATEGORIES.filter(c => topImages[`${y}:${c.id}`]).length;
  document.getElementById('tops-count').textContent = PUBLIC_MODE
    ? `${done} tops de ${y}`
    : failed
    ? 'Este navegador no permite guardar imágenes (IndexedDB bloqueado).'
    : `${done}/${TOP_CATEGORIES.length} tops guardados en ${y}`;

  const cats = PUBLIC_MODE ? TOP_CATEGORIES.filter(c => topImages[`${y}:${c.id}`]) : TOP_CATEGORIES;
  if (!cats.length) {
    grid.innerHTML = '<p class="col-span-full text-xs text-slate-500 text-center py-8">Todavía no hay tops publicados para este año.</p>';
    return;
  }
  grid.innerHTML = cats.map(c => {
    const img = topImages[`${y}:${c.id}`];
    const desc = topDesc(c, y);
    return `
      <div onclick="onTopCardClick('${c.id}')" class="bg-slate-900 border ${img ? 'border-slate-800 hover:border-indigo-500/50' : 'border-dashed border-slate-700 hover:border-indigo-500/50'} rounded-xl overflow-hidden cursor-pointer transition-all shadow-md flex flex-col group">
        <div class="aspect-[3/4] bg-slate-800/60 relative overflow-hidden flex items-center justify-center">
          ${img
            ? `<img src="${esc(img)}" alt="${esc(topLabel(c, y))}" class="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300">`
            : `<span class="text-xs text-slate-500 group-hover:text-indigo-300 transition-colors">＋ Subir imagen</span>`}
        </div>
        <div class="p-3">
          <p class="text-xs font-bold text-slate-200 truncate">${esc(topLabel(c, y))}</p>
          <p class="text-[10px] text-slate-500 truncate">${desc ? esc(desc) : (img ? (PUBLIC_MODE ? '' : '✓ Guardado') : 'Pendiente')}</p>
        </div>
      </div>`;
  }).join('');
}

function changeTopYear(value) {
  currentTopYear = parseInt(value);
  closeTopViewer();
  renderTops();
}

function addTopYear() {
  if (PUBLIC_MODE) return;
  const raw = prompt('¿Qué año querés agregar? (ej. 2027)');
  if (raw === null) return;
  const y = parseInt(raw);
  if (!(y >= 2000 && y <= 2100)) return alert('Ingresá un año válido.');
  if (!topYears.includes(y)) {
    topYears.push(y);
    topYears.sort((a, b) => b - a);
    appStore.setItem('olquia_tops_years', JSON.stringify(topYears));
  }
  changeTopYear(y);
}

function onTopCardClick(catId) {
  if (topImages[`${currentTopYear}:${catId}`]) openTopViewer(catId);
  else pickTopImage(catId);
}

function pickTopImage(catId) {
  if (PUBLIC_MODE) return;
  topPickTarget = catId;
  const input = document.getElementById('top-file-input');
  input.value = '';
  input.click();
}

function onTopFileChosen(input) {
  const file = input.files && input.files[0];
  const catId = topPickTarget;
  if (!file || !catId) return;
  if (!file.type.startsWith('image/')) return alert('Elegí un archivo de imagen (PNG, JPG o WEBP).');
  const year = currentTopYear;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await topsPut(`${year}:${catId}`, reader.result);
    } catch {
      return alert('No se pudo guardar la imagen en este navegador.');
    }
    input.value = '';
    await renderTops();
    if (topViewerCat === catId) openTopViewer(catId);
  };
  reader.readAsDataURL(file);
}

function openTopViewer(catId) {
  const y = currentTopYear;
  const cat = TOP_CATEGORIES.find(c => c.id === catId);
  const img = topImages[`${y}:${catId}`];
  if (!cat || !img) return;
  topViewerCat = catId;
  const label = `${topLabel(cat, y)} ${y}`;
  const ext = img.startsWith('data:') ? (img.match(/^data:image\/(\w+)/) || [, 'png'])[1].replace('jpeg', 'jpg') : (img.split('.').pop() || 'png');
  document.getElementById('top-viewer-title').textContent = label;
  document.getElementById('top-viewer-img').src = img;
  const dl = document.getElementById('top-viewer-download');
  dl.href = img;
  dl.download = `${label}.${ext}`;
  document.getElementById('top-viewer-modal').classList.remove('hidden');
}

function closeTopViewer() {
  topViewerCat = null;
  document.getElementById('top-viewer-modal').classList.add('hidden');
}

async function deleteTopImage(catId) {
  const cat = TOP_CATEGORIES.find(c => c.id === catId);
  if (!cat || !confirm(`¿Eliminar la imagen de "${topLabel(cat, currentTopYear)}"?`)) return;
  try { await topsDelete(`${currentTopYear}:${catId}`); } catch { return alert('No se pudo eliminar.'); }
  closeTopViewer();
  renderTops();
}

// ============================================================
// PUBLICAR (genera datos.json + imágenes de tops para subir al repositorio)
// ============================================================
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = reject;
    document.head.appendChild(el);
  });
}

async function publishData() {
  try {
    if (typeof JSZip === 'undefined') await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  } catch {
    return alert('No se pudo cargar la librería ZIP. Revisá tu conexión a internet.');
  }

  const data = {};
  BACKUP_KEYS.forEach(k => {
    const v = appStore.getItem(k);
    if (v !== null) data[k] = v;
  });

  let images = {};
  try { images = await topsGetAll(); } catch { /* sin imágenes */ }

  const zip = new JSZip();
  const topFiles = {};
  const years = new Set();
  for (const [key, dataUrl] of Object.entries(images)) {
    const [year, cat] = key.split(':');
    if (!TOP_CATEGORIES.some(c => c.id === cat)) continue;
    const m = typeof dataUrl === 'string' && dataUrl.match(/^data:image\/([\w+]+);base64,(.*)$/);
    if (!m) continue;
    const ext = m[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
    const path = `tops/${year}/${cat}.${ext}`;
    zip.file(path, m[2], { base64: true });
    topFiles[key] = path;
    years.add(Number(year));
  }
  // Solo se publican los años que tienen al menos un top con imagen
  data.olquia_tops_years = JSON.stringify([...years].sort((a, b) => b - a));

  zip.file('datos.json', JSON.stringify({ app: 'boveda-olquiana', version: 3, publishedAt: new Date().toISOString(), data, topFiles }, null, 2));
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'boveda-publicar.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================
// RESPALDO (exportar / importar JSON)
// ============================================================
const BACKUP_KEYS = [
  'olquia_bio', 'olquia_avatar', 'olquia_top_animes',
  'olquia_top_characters', 'olquia_series', 'olquia_episodes', 'olquia_tops_years'
];

async function exportData() {
  const data = {};
  BACKUP_KEYS.forEach(k => {
    const v = appStore.getItem(k);
    if (v !== null) data[k] = v;
  });
  let topImagesAll = {};
  try { topImagesAll = await topsGetAll(); } catch { /* sin imágenes de tops */ }
  const payload = { app: 'boveda-olquiana', version: 2, exportedAt: new Date().toISOString(), data, topImages: topImagesAll };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `boveda-olquiana-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(reader.result);
      // Acepta el respaldo completo ({ app, data, topImages }) o directamente el objeto con las claves
      const data = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
      const images = parsed && parsed.topImages && typeof parsed.topImages === 'object' ? parsed.topImages : null;
      const found = BACKUP_KEYS.filter(k => k in data);
      if (found.length === 0 && !images) throw new Error('formato');
      if (!confirm('Esto reemplazará los datos actuales de este navegador. ¿Continuar?')) return;
      BACKUP_KEYS.forEach(k => {
        if (!(k in data) || data[k] === null) return appStore.removeItem(k);
        // Si la clave viene como objeto/array (no como texto), la convertimos a texto
        appStore.setItem(k, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
      });
      // Respaldos viejos (sin imágenes) no tocan los tops ya guardados
      if (images) {
        await topsClear();
        for (const [key, value] of Object.entries(images)) {
          if (typeof value === 'string') await topsPut(key, value);
        }
      }
      location.reload();
    } catch {
      alert('El archivo no es un respaldo válido de La Bóveda Olquiana.');
    } finally {
      input.value = '';
    }
  };
  reader.readAsText(file);
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
function startApp() {
  renderProfile();
  updateEssayFilterCounts();
  renderEssays();
  renderEpisodes();
  initTops();
  if (PUBLIC_MODE && !PUBLISHED) {
    const note = document.createElement('p');
    note.className = 'text-xs text-amber-400 text-center py-2';
    note.textContent = 'No se pudo cargar datos.json: tiene que estar subido junto a index.html.';
    document.querySelector('main').prepend(note);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp);
else startApp();
