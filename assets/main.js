const state = {
  products: [],
  filtered: [],
  activeCategory: 'all',
  query: '',
  config: null,
  syncMeta: null
};

async function safeFetchJson(url) {
  try {
    if (location.protocol === 'file:') throw new Error('skip fetch on file protocol');
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (error) {
    return null;
  }
}

async function loadConfig() {
  const fetched = await safeFetchJson('data/site-config.json');
  state.config = fetched || window.KOMPUTERRA_DEFAULT_CONFIG || {};
  applySiteConfig();
}

function applySiteConfig() {
  if (!state.config) return;
  document.title = state.config.siteTitle || 'КОМПУТЕРРА — Каталог-прайс';
  document.querySelectorAll('[data-phone-display]').forEach(el => el.textContent = state.config.phoneDisplay || '096 044 64 46');
  document.querySelectorAll('[data-phone-href]').forEach(el => el.href = state.config.phoneHref || 'tel:+380960446446');
  document.querySelectorAll('[data-address]').forEach(el => el.textContent = state.config.address || 'м. Світловодськ, вул. Городоцька, 13');
}

function publicFallbackProducts() {
  const source = window.KOMPUTERRA_DEFAULT_PRODUCTS || [];
  return source.filter(item => !item.hiddenByAdmin && !item.hiddenBySheet);
}

async function loadProducts() {
  const result = window.KOMPUTERRA_fetchSupabaseProducts
    ? await window.KOMPUTERRA_fetchSupabaseProducts()
    : { products: [], meta: { status: 'disabled' } };

  if (result.products?.length) {
    state.products = result.products;
    state.syncMeta = result.meta;
  } else {
    state.products = publicFallbackProducts();
    state.syncMeta = result.meta || { status: 'error', source: 'supabase', error: 'empty' };
  }

  state.filtered = [...state.products];
  renderSyncState();
}

function normalize(text='') {
  return text.toString().trim().toLowerCase();
}

function formatPrice(n) {
  return new Intl.NumberFormat('uk-UA').format(Number(n || 0)) + ' грн';
}

function statusText(item) {
  if (item.status === 'в наявності') return 'В наявності';
  if (item.status === 'в дорозі') return item.eta ? `В дорозі · ${item.eta}` : 'В дорозі';
  return 'Відсутній';
}

function statusClass(item) {
  if (item.status === 'в наявності') return 'instock';
  if (item.status === 'в дорозі') return 'transit';
  return 'out';
}

function renderSyncState() {
  const el = document.querySelector('[data-sync-note]');
  if (!el) return;
  const meta = state.syncMeta;
  if (!meta) {
    el.textContent = '';
    return;
  }
  if (meta.status === 'live') {
    el.textContent = `Ціни та наявність завантажено з Supabase: ${new Date(meta.syncedAt).toLocaleString('uk-UA')}`;
  } else {
    el.textContent = 'Не вдалося завантажити дані з Supabase. Показано резервні дані сайту.';
  }
}

function renderCategories() {
  const wrap = document.querySelector('[data-categories]');
  if (!wrap) return;
  const categories = ['all', ...new Set(state.products.map(p => p.category).filter(Boolean))];
  wrap.innerHTML = categories.map(cat => {
    const label = cat === 'all' ? 'Усі товари' : cat;
    const active = state.activeCategory === cat ? 'active' : '';
    return `<button class="category-pill ${active}" type="button" data-cat="${cat}">${label}</button>`;
  }).join('');
  wrap.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
    state.activeCategory = btn.dataset.cat;
    filterProducts();
  }));
}

function filterProducts() {
  const q = normalize(state.query);
  state.filtered = state.products.filter(item => {
    const matchesCategory = state.activeCategory === 'all' || item.category === state.activeCategory;
    const hay = normalize([item.name, item.model, item.brand, item.specs, item.category].join(' '));
    const matchesQuery = !q || hay.includes(q);
    return matchesCategory && matchesQuery;
  });
  renderCategories();
  renderCatalog();
}

function renderCatalog() {
  const tableBody = document.querySelector('[data-catalog-body]');
  const mobileList = document.querySelector('[data-mobile-list]');
  const count = document.querySelector('[data-count]');
  if (!tableBody || !mobileList) return;
  if (count) count.textContent = `${state.filtered.length} позицій`;

  if (!state.filtered.length) {
    tableBody.innerHTML = '<tr><td colspan="6" style="padding:24px;color:var(--muted)">Товари поки не знайдено.</td></tr>';
    mobileList.innerHTML = '<div class="panel-card"><p class="note">Товари поки не знайдено.</p></div>';
    return;
  }

  tableBody.innerHTML = state.filtered.map(item => `
    <tr>
      <td>${item.category}</td>
      <td>
        <a class="name-cell" href="product.html?id=${encodeURIComponent(item.id)}">
          <strong>${item.name}</strong>
          <span>${item.model || ''}</span>
        </a>
      </td>
      <td>${item.specs || ''}</td>
      <td><span class="price">${formatPrice(item.price)}</span></td>
      <td>${item.warranty || ''}</td>
      <td><span class="badge ${statusClass(item)}">${statusText(item)}</span></td>
    </tr>
  `).join('');

  mobileList.innerHTML = state.filtered.map(item => `
    <a class="item-card" href="product.html?id=${encodeURIComponent(item.id)}">
      <div class="item-sep"></div>
      <div class="item-grid">
        <div>
          <div class="item-key">Товар</div>
          <div class="item-val"><strong>${item.name}</strong></div>
        </div>
        <div>
          <div class="item-key">Ціна</div>
          <div class="item-val"><strong>${formatPrice(item.price)}</strong></div>
        </div>
      </div>
      <div class="item-grid">
        <div>
          <div class="item-key">Категорія</div>
          <div class="item-val">${item.category}</div>
        </div>
        <div>
          <div class="item-key">Характеристики</div>
          <div class="item-val">${item.specs || ''}</div>
        </div>
      </div>
      <div class="item-grid">
        <div>
          <div class="item-key">Гарантія</div>
          <div class="item-val">${item.warranty || ''}</div>
        </div>
        <div>
          <div class="item-key">Наявність</div>
          <div class="item-val"><span class="badge ${statusClass(item)}">${statusText(item)}</span></div>
        </div>
      </div>
    </a>
  `).join('');
}

function initMobileMenu() {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (!toggle || !menu) return;
  const closeMenu = () => {
    menu.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };
  const openMenu = () => {
    menu.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  toggle.addEventListener('click', () => {
    if (menu.classList.contains('open')) closeMenu();
    else openMenu();
  });
  menu.addEventListener('click', (e) => {
    if (e.target === menu || e.target.closest('.mobile-menu-link')) closeMenu();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

async function boot() {
  initMobileMenu();
  await loadConfig();
  await loadProducts();
  renderCategories();
  renderCatalog();
  const search = document.querySelector('[data-search]');
  if (search) {
    search.addEventListener('input', (e) => {
      state.query = e.target.value || '';
      filterProducts();
    });
  }
}

boot();
