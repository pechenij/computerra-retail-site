(function(){
  function getConfig() {
    return window.KOMPUTERRA_SUPABASE_CONFIG || { url: '', anonKey: '', table: 'products' };
  }

  function mapRow(row) {
    return {
      id: row.id,
      slug: row.slug,
      category: row.category || '',
      brand: row.brand || '',
      model: row.model || '',
      name: row.name || '',
      specs: row.specs || '',
      description: row.description || '',
      price: Number(row.price || 0),
      warranty: row.warranty || '',
      status: row.status || 'в наявності',
      eta: row.eta || '',
      image: row.image_url || '',
      pdf: row.pdf_url || '#',
      hiddenByAdmin: !!row.hidden_by_admin,
      isActive: row.is_active !== false,
      sortOrder: Number(row.sort_order || 0)
    };
  }

  async function fetchProducts() {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey) {
      return { products: [], meta: { status: 'disabled', source: 'supabase', error: 'missing-config' } };
    }

    const endpoint = new URL(cfg.url.replace(/\/$/, '') + '/rest/v1/' + (cfg.table || 'products'));
    endpoint.searchParams.set('select', 'id,slug,category,brand,model,name,specs,description,price,warranty,status,eta,image_url,pdf_url,is_active,hidden_by_admin,sort_order');
    endpoint.searchParams.set('is_active', 'eq.true');
    endpoint.searchParams.set('hidden_by_admin', 'eq.false');
    endpoint.searchParams.set('order', 'sort_order.asc.nullslast,name.asc');

    try {
      const res = await fetch(endpoint.toString(), {
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          Accept: 'application/json'
        }
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error('HTTP ' + res.status + ' ' + text.slice(0, 200));
      }
      const rows = await res.json();
      return {
        products: Array.isArray(rows) ? rows.map(mapRow) : [],
        meta: {
          status: 'live',
          source: 'supabase',
          syncedAt: new Date().toISOString(),
          rows: Array.isArray(rows) ? rows.length : 0
        }
      };
    } catch (error) {
      return {
        products: [],
        meta: {
          status: 'error',
          source: 'supabase',
          syncedAt: new Date().toISOString(),
          error: error.message || String(error)
        }
      };
    }
  }

  async function fetchProductById(id) {
    const cfg = getConfig();
    if (!cfg.url || !cfg.anonKey || !id) return null;
    const endpoint = new URL(cfg.url.replace(/\/$/, '') + '/rest/v1/' + (cfg.table || 'products'));
    endpoint.searchParams.set('select', 'id,slug,category,brand,model,name,specs,description,price,warranty,status,eta,image_url,pdf_url,is_active,hidden_by_admin,sort_order');
    endpoint.searchParams.set('id', 'eq.' + id);
    endpoint.searchParams.set('limit', '1');
    try {
      const res = await fetch(endpoint.toString(), {
        headers: {
          apikey: cfg.anonKey,
          Authorization: 'Bearer ' + cfg.anonKey,
          Accept: 'application/json'
        }
      });
      if (!res.ok) return null;
      const rows = await res.json();
      return Array.isArray(rows) && rows[0] ? mapRow(rows[0]) : null;
    } catch (error) {
      return null;
    }
  }

  window.KOMPUTERRA_fetchSupabaseProducts = fetchProducts;
  window.KOMPUTERRA_fetchSupabaseProductById = fetchProductById;
})();
