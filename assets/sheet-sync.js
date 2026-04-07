(function () {
  const DEFAULT_CONFIG = {
    enabled: false,
    mode: 'apps-script-jsonp',
    appsScriptUrl: '',
    refreshMinutes: 60,
    localOverrideKey: 'retailSheetSyncOverrideV4',
    cacheKey: 'retailSheetSyncCacheV4',
    lastSyncKey: 'retailSheetLastSyncV4',
    timeoutMs: 20000,
    demoCsvUrl: 'data/retail-sheet-demo.csv',
  };

  function normalizeValue(value) {
    return (value || '').toString().trim();
  }

  function getConfig() {
    const base = Object.assign({}, DEFAULT_CONFIG, window.KOMPUTERRA_SHEET_SYNC_CONFIG || {});
    try {
      const raw = localStorage.getItem(base.localOverrideKey || DEFAULT_CONFIG.localOverrideKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Object.assign(base, parsed || {});
      }
    } catch (e) {}
    return base;
  }

  function setConfigOverride(next) {
    const cfg = getConfig();
    const key = cfg.localOverrideKey || DEFAULT_CONFIG.localOverrideKey;
    let current = {};
    try {
      current = JSON.parse(localStorage.getItem(key) || '{}') || {};
    } catch (e) {}
    const merged = Object.assign({}, current, next || {});
    localStorage.setItem(key, JSON.stringify(merged));
    return merged;
  }

  function clearConfigOverride() {
    const cfg = getConfig();
    localStorage.removeItem(cfg.localOverrideKey || DEFAULT_CONFIG.localOverrideKey);
  }

  function slugify(value) {
    return (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яіїєґ0-9]+/gi, '-')
      .replace(/(^-|-$)/g, '');
  }

  function normalizeHeader(value) {
    return (value || '').toString().trim().toLowerCase().replace(/\s+/g, '_');
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (inQuotes) {
        if (char === '"' && next === '"') {
          value += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          value += char;
        }
        continue;
      }
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(value);
        value = '';
      } else if (char === '\n') {
        row.push(value);
        rows.push(row);
        row = [];
        value = '';
      } else if (char === '\r') {
        continue;
      } else {
        value += char;
      }
    }
    if (value.length || row.length) {
      row.push(value);
      rows.push(row);
    }
    return rows.filter(r => r.some(cell => normalizeValue(cell) !== ''));
  }

  function rowToObject(headers, row) {
    const item = {};
    headers.forEach((header, index) => {
      item[header] = normalizeValue(row[index]);
    });
    return item;
  }

  function parseRowsFromCsv(csvText) {
    const matrix = parseCsv(csvText || '');
    if (!matrix.length) return [];
    const headers = (matrix.shift() || []).map(normalizeHeader);
    return matrix.map(row => rowToObject(headers, row)).filter(item => item.product_id || item.title || item.model);
  }

  function parseRowsFromPayload(payload) {
    if (!payload) return [];
    const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.data) ? payload.data : [];
    return rows.map(row => {
      const next = {};
      Object.keys(row || {}).forEach(key => {
        next[normalizeHeader(key)] = normalizeValue(row[key]);
      });
      return next;
    }).filter(item => item.product_id || item.title || item.model);
  }

  function toBoolean(value, fallbackTrue) {
    const normalized = normalizeValue(value).toLowerCase();
    if (!normalized) return fallbackTrue;
    if (['1', 'true', 'yes', 'y', 'так', 'да'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n', 'ні', 'нет'].includes(normalized)) return false;
    return fallbackTrue;
  }

  function mapStatus(value) {
    const normalized = normalizeValue(value).toLowerCase();
    if (['in_stock', 'в наявності', 'наявність', 'instock', '+'].includes(normalized)) return 'в наявності';
    if (['in_transit', 'в дорозі', 'дорога', 'transit'].includes(normalized)) return 'в дорозі';
    if (['out_of_stock', 'відсутній', 'немає', 'out', '-'].includes(normalized)) return 'відсутній';
    return normalized || 'в наявності';
  }

  function formatEta(value) {
    const raw = normalizeValue(value);
    if (!raw) return '';
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(raw)) return raw;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-');
      return `${d}.${m}.${y}`;
    }
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
      const [m, d, y] = raw.split('/');
      return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`;
    }
    return raw;
  }

  function toPrice(value, fallback) {
    const raw = normalizeValue(value)
      .replace(/\u00a0/g, '')
      .replace(/\u202f/g, '')
      .replace(/\s/g, '')
      .replace(',', '.');
    if (!raw) return Number(fallback || 0);
    const num = Number(raw);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function generateDescription(item) {
    const specs = item.specs ? ` з характеристиками ${item.specs}` : '';
    if ((item.category || '').includes('інвертори')) {
      return `${item.name} — сучасний гібридний інвертор${specs}.\nПідходить для систем резервного живлення та сонячної генерації.`;
    }
    if ((item.category || '').includes('акумулятори')) {
      return `${item.name} — акумулятор для систем резервного живлення${specs}. Підходить для роботи з інверторами та домашніми енергосистемами.`;
    }
    return `${item.name} — сонячна панель${specs}.\nОптимальне рішення для приватних та комерційних СЕС.`;
  }

  function buildProductFromSheetRow(row, existing) {
    const category = row.category || existing?.category || '';
    const name = row.title || existing?.name || [row.brand, row.model].filter(Boolean).join(' ');
    const product = {
      id: row.product_id || existing?.id || slugify(row.model || name),
      category,
      brand: row.brand || existing?.brand || '',
      model: row.model || existing?.model || '',
      name,
      specs: row.characteristics || existing?.specs || '',
      price: toPrice(row.retail_price_uah, existing?.price),
      warranty: row.warranty || existing?.warranty || '',
      status: mapStatus(row.availability_status || existing?.status),
      eta: formatEta(row.eta_date || existing?.eta),
      description: row.short_description || existing?.description || '',
      image: row.image_url || existing?.image || '',
      pdf: row.pdf_url || existing?.pdf || '#',
      sheetActive: toBoolean(row.sheet_active, true),
      hiddenByAdmin: !!existing?.hiddenByAdmin,
      hiddenBySheet: false,
    };

    if (!product.description) product.description = generateDescription(product);
    if (window.KOMPUTERRA_normalizeAssetPath) {
      product.image = window.KOMPUTERRA_normalizeAssetPath(product.image || (window.KOMPUTERRA_placeholderForCategory ? window.KOMPUTERRA_placeholderForCategory(category) : 'assets/placeholder-inverter.svg'));
      product.pdf = window.KOMPUTERRA_normalizeAssetPath(product.pdf || '#') || '#';
    }
    return product;
  }

  function mergeSheetIntoProducts(baseProducts, rows) {
    const reconciledBase = (window.KOMPUTERRA_reconcileProducts ? window.KOMPUTERRA_reconcileProducts(baseProducts || []) : (baseProducts || [])).map(item => Object.assign({}, item));
    const byId = new Map(reconciledBase.map(item => [item.id, item]));
    const updates = [];

    rows.forEach(row => {
      const candidateId = row.product_id || slugify(row.model || row.title || '');
      if (!candidateId) return;
      const existing = byId.get(candidateId)
        || reconciledBase.find(item => item.model === row.model)
        || reconciledBase.find(item => item.name === row.title)
        || null;
      const targetId = existing?.id || candidateId;
      const next = buildProductFromSheetRow(Object.assign({}, row, { product_id: targetId }), existing);
      next.hiddenBySheet = !next.sheetActive;
      updates.push(next);
    });

    const merged = reconciledBase.map(item => {
      const update = updates.find(candidate => candidate.id === item.id);
      if (!update) {
        return Object.assign({}, item, { hiddenBySheet: true });
      }
      return Object.assign({}, item, update, {
        hiddenByAdmin: !!item.hiddenByAdmin,
        hiddenBySheet: !!update.hiddenBySheet,
      });
    });

    updates.forEach(item => {
      if (!merged.some(existing => existing.id === item.id)) {
        merged.push(item);
      }
    });

    return window.KOMPUTERRA_reconcileProducts ? window.KOMPUTERRA_reconcileProducts(merged) : merged;
  }

  function readCache() {
    const cfg = getConfig();
    try {
      const raw = localStorage.getItem(cfg.cacheKey || DEFAULT_CONFIG.cacheKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeCache(rows, meta) {
    const cfg = getConfig();
    try {
      localStorage.setItem(cfg.cacheKey || DEFAULT_CONFIG.cacheKey, JSON.stringify({ rows, meta }));
      localStorage.setItem(cfg.lastSyncKey || DEFAULT_CONFIG.lastSyncKey, JSON.stringify(meta || {}));
    } catch (e) {}
  }

  function resolveUrl(raw) {
    const value = normalizeValue(raw);
    if (!value || /^https?:/i.test(value) || value.startsWith('/')) return value;
    if (window.location.pathname.includes('/admin/')) {
      return '../' + value.replace(/^\.\//, '').replace(/^\/+/, '');
    }
    return value.replace(/^\.\//, '');
  }

  async function fetchTextLocal(url) {
    const resolved = resolveUrl(url);
    const response = await fetch(`${resolved}${resolved.includes('?') ? '&' : '?'}t=${Math.floor(Date.now() / 60000)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  async function fetchJsonp(url, timeoutMs) {
    const resolved = resolveUrl(url);
    if (!resolved) throw new Error('Apps Script URL is empty.');
    return new Promise((resolve, reject) => {
      const callbackName = `__komputerraSheetSync${Date.now()}${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Apps Script sync timeout.'));
      }, timeoutMs || 20000);

      function cleanup() {
        clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = (payload) => {
        cleanup();
        resolve(payload);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('Unable to load Apps Script endpoint.'));
      };

      const sep = resolved.includes('?') ? '&' : '?';
      script.src = `${resolved}${sep}callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
      document.head.appendChild(script);
    });
  }

  async function loadRemoteRows() {
    const cfg = getConfig();
    const mode = normalizeValue(cfg.mode || 'apps-script-jsonp');

    if (mode === 'apps-script-jsonp') {
      const payload = await fetchJsonp(cfg.appsScriptUrl, cfg.timeoutMs);
      const rows = parseRowsFromPayload(payload);
      return {
        rows,
        meta: {
          enabled: true,
          status: 'live',
          source: 'apps-script',
          syncedAt: payload?.syncedAt || new Date().toISOString(),
          rows: rows.length,
          endpoint: cfg.appsScriptUrl,
        }
      };
    }

    const csvText = await fetchTextLocal(cfg.demoCsvUrl || DEFAULT_CONFIG.demoCsvUrl);
    const rows = parseRowsFromCsv(await csvText);
    return {
      rows,
      meta: {
        enabled: true,
        status: 'live',
        source: 'demo-csv',
        syncedAt: new Date().toISOString(),
        rows: rows.length,
      }
    };
  }

  async function syncProductsWithSheet(baseProducts, options) {
    const opts = Object.assign({ allowRemote: true, useCacheOnError: true }, options || {});
    const cfg = getConfig();

    if (!cfg.enabled) {
      return {
        products: window.KOMPUTERRA_reconcileProducts ? window.KOMPUTERRA_reconcileProducts(baseProducts || []) : (baseProducts || []),
        meta: { enabled: false, status: 'disabled' },
      };
    }

    if (!opts.allowRemote) {
      const cached = readCache();
      if (cached?.rows?.length) {
        return {
          products: mergeSheetIntoProducts(baseProducts, cached.rows),
          meta: Object.assign({ enabled: true, status: 'cached' }, cached.meta || {}),
        };
      }
      return { products: baseProducts || [], meta: { enabled: true, status: 'skipped' } };
    }

    try {
      const fetched = await loadRemoteRows();
      const synced = mergeSheetIntoProducts(baseProducts, fetched.rows);
      writeCache(fetched.rows, fetched.meta);
      return { products: synced, meta: fetched.meta };
    } catch (error) {
      if (opts.useCacheOnError) {
        const cached = readCache();
        if (cached?.rows?.length) {
          return {
            products: mergeSheetIntoProducts(baseProducts, cached.rows),
            meta: Object.assign({ enabled: true, status: 'cached', error: error.message }, cached.meta || {}),
          };
        }
      }
      return {
        products: window.KOMPUTERRA_reconcileProducts ? window.KOMPUTERRA_reconcileProducts(baseProducts || []) : (baseProducts || []),
        meta: { enabled: true, status: 'error', error: error.message },
      };
    }
  }

  function publicProducts(products) {
    return (products || []).filter(item => !item.hiddenByAdmin && !item.hiddenBySheet && item.sheetActive !== false);
  }

  window.KOMPUTERRA_getSheetSyncConfig = getConfig;
  window.KOMPUTERRA_setSheetConfigOverride = setConfigOverride;
  window.KOMPUTERRA_clearSheetConfigOverride = clearConfigOverride;
  window.KOMPUTERRA_syncProductsWithSheet = syncProductsWithSheet;
  window.KOMPUTERRA_filterPublicProducts = publicProducts;
})();
