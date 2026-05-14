const API_BASE = (window.API_BASE || localStorage.getItem('apiBase') || '').trim().replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);
const PLACEHOLDER_IMAGE = '/assets/placeholder.svg';

const state = {
  products: [],
  filtered: [],
  page: 1,
  pageSize: 12,
  settings: {
    shopInfo: {},
    shipping: { fee: 150, freeAbove: 5000 },
    announcement: ''
  },
  filters: {
    search: '',
    categories: [],
    brands: [],
    minPrice: null,
    maxPrice: null,
    featured: false,
    bestSeller: false,
    inStock: false,
    sort: 'popular'
  }
};

const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

function normalizeWhatsappNumber(raw, defaultCountryCode = '91') {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `${defaultCountryCode}${digits.slice(1)}`;
  return digits;
}

function buildWaMeUrl(rawNumber, text) {
  const normalized = normalizeWhatsappNumber(rawNumber);
  if (!normalized) return 'https://wa.me/';
  const base = `https://wa.me/${normalized}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}

const currency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

async function loadShopInfo() {
  try {
    const res = await fetch(apiUrl('/api/settings'));
    if (!res.ok) return;
    const data = await res.json();
    const shop = data.shopInfo || {};
    const shipping = data.shipping || {};
    state.settings = {
      shopInfo: shop,
      shipping: {
        fee: Number(shipping.fee) || 0,
        freeAbove: Number(shipping.freeAbove) || 0
      },
      announcement: data.announcement || ''
    };
    const phoneEl = document.getElementById('topbar-phone');
    const whatsappEl = document.getElementById('topbar-whatsapp');
    const locationEl = document.getElementById('topbar-location');
    const announcementEl = document.getElementById('topbar-announcement');
    if (phoneEl && shop.phone) {
      phoneEl.textContent = `Call: ${shop.phone}`;
      phoneEl.href = `tel:${shop.phone}`;
    }
    if (whatsappEl && shop.whatsapp) {
      whatsappEl.href = buildWaMeUrl(shop.whatsapp);
    }
    if (locationEl && shop.address) {
      locationEl.textContent = shop.address.split(',')[0] || shop.address;
    }
    if (announcementEl) {
      if (state.settings.announcement) {
        announcementEl.textContent = state.settings.announcement;
        announcementEl.classList.remove('hidden');
      } else {
        announcementEl.classList.add('hidden');
      }
    }
  } catch {
    // ignore
  }
}

function getCart() {
  return storage.get('cart', []);
}

function setCart(cart) {
  storage.set('cart', cart);
  updateCartCount();
  renderCart();
}

function getWishlist() {
  return storage.get('wishlist', []);
}

function setWishlist(list) {
  storage.set('wishlist', list);
  updateWishlistCount();
  renderWishlist();
}

function getCompare() {
  return storage.get('compare', []);
}

function setCompare(list) {
  storage.set('compare', list);
  renderCompareBar();
}

function getRecentlyViewed() {
  return storage.get('recentlyViewed', []);
}

function addRecentlyViewed(productId) {
  const list = getRecentlyViewed().filter(id => id !== productId);
  list.unshift(productId);
  storage.set('recentlyViewed', list.slice(0, 6));
}

function renderRecentlyViewed() {
  const section = document.getElementById('recently-viewed-section');
  const grid = document.getElementById('recently-viewed-grid');
  if (!section || !grid) return;
  const list = getRecentlyViewed();
  const items = list.map(id => state.products.find(p => p.id === id)).filter(Boolean);
  if (!items.length) {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');
  grid.innerHTML = items.map(product => {
    const image = (product.images && product.images[0]) || PLACEHOLDER_IMAGE;
    return `
      <div class="product-card">
        <a href="product.html?id=${product.id}" class="product-image">
          <img src="${image}" alt="${product.name}" loading="lazy" />
        </a>
        <div class="product-title">${product.name}</div>
        <div class="price">${currency(product.price)}</div>
      </div>
    `;
  }).join('');
}

function updateCartCount() {
  const countEl = document.getElementById('cart-count');
  if (!countEl) return;
  const cart = getCart();
  const total = cart.reduce((sum, item) => sum + item.qty, 0);
  countEl.textContent = total;
}

function updateWishlistCount() {
  const countEl = document.getElementById('wishlist-count');
  if (!countEl) return;
  countEl.textContent = getWishlist().length;
}

function openDrawer(id) {
  const drawer = document.getElementById(id);
  const overlay = document.getElementById('overlay');
  if (!drawer || !overlay) return;
  drawer.classList.add('open');
  overlay.classList.add('show');
}

function closeDrawers() {
  document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.classList.remove('show');
}

function renderCart() {
  const container = document.getElementById('cart-items');
  const subtotalEl = document.getElementById('cart-subtotal');
  if (!container || !subtotalEl) return;

  const cart = getCart();
  if (!cart.length) {
    container.innerHTML = '<div class="muted">Cart is empty.</div>';
    subtotalEl.textContent = currency(0);
    return;
  }

  const items = cart.map(item => {
    const product = state.products.find(p => p.id === item.productId) || {};
    const image = (product.images && product.images[0]) || PLACEHOLDER_IMAGE;
    return {
      ...item,
      name: product.name || 'Item',
      price: product.price || 0,
      image
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  subtotalEl.textContent = currency(subtotal);

  container.innerHTML = items.map(item => `
    <div class="drawer-item">
      <img src="${item.image}" alt="${item.name}" />
      <div>
        <div>${item.name}</div>
        <div class="muted">${currency(item.price)}</div>
        <div class="qty-control" data-id="${item.productId}">
          <button type="button" data-action="dec">-</button>
          <span>${item.qty}</span>
          <button type="button" data-action="inc">+</button>
          <button type="button" data-action="remove">Remove</button>
        </div>
      </div>
      <strong>${currency(item.price * item.qty)}</strong>
    </div>
  `).join('');
}

function renderWishlist() {
  const container = document.getElementById('wishlist-items');
  if (!container) return;
  const list = getWishlist();
  if (!list.length) {
    container.innerHTML = '<div class="muted">Wishlist is empty.</div>';
    return;
  }
  container.innerHTML = list.map(id => {
    const product = state.products.find(p => p.id === id) || {};
    const image = (product.images && product.images[0]) || PLACEHOLDER_IMAGE;
    return `
      <div class="drawer-item">
        <img src="${image}" alt="${product.name || 'Item'}" />
        <div>
          <div>${product.name || 'Item'}</div>
          <div class="muted">${currency(product.price || 0)}</div>
          <div class="qty-control" data-id="${id}">
            <button type="button" data-action="add">Add to cart</button>
            <button type="button" data-action="remove">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCompareBar() {
  const bar = document.getElementById('compare-bar');
  const list = getCompare();
  if (!bar) return;
  if (!list.length) {
    bar.classList.remove('show');
    return;
  }
  const container = document.getElementById('compare-items');
  if (container) {
    container.innerHTML = list.map(id => {
      const product = state.products.find(p => p.id === id) || {};
      return `<span class="filter-chip">${product.name || 'Item'}</span>`;
    }).join('');
  }
  bar.classList.add('show');
}

function renderCompareModal() {
  const modal = document.getElementById('compare-modal');
  const table = document.getElementById('compare-table');
  if (!modal || !table) return;
  const list = getCompare();
  if (!list.length) return;
  const products = list.map(id => state.products.find(p => p.id === id)).filter(Boolean);
  const rows = [
    ['Brand', p => p.brand || '-'],
    ['Price', p => currency(p.price || 0)],
    ['Category', p => p.category || '-'],
    ['Stock', p => (p.stock || 0) > 0 ? `${p.stock} available` : 'Out of stock'],
    ['Rating', p => `${p.rating || 0} (${p.ratingCount || 0})`]
  ];

  table.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr>
          <th>Spec</th>
          ${products.map(p => `<th>${p.name}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map(([label, fn]) => `
          <tr>
            <td>${label}</td>
            ${products.map(p => `<td>${fn(p)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  modal.classList.add('show');
}

function applyFilters() {
  const { search, categories, brands, minPrice, maxPrice, featured, bestSeller, inStock, sort } = state.filters;
  const query = search.toLowerCase();

  let filtered = state.products.filter(product => {
    const matchesSearch = !query || `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query);
    const matchesCategory = !categories.length || categories.includes(product.category);
    const matchesBrand = !brands.length || brands.includes(product.brand);
    const price = Number(product.price || 0);
    const matchesPrice = (minPrice === null || price >= minPrice) && (maxPrice === null || price <= maxPrice);
    const matchesFeatured = !featured || product.featured;
    const matchesBest = !bestSeller || product.bestSeller;
    const matchesStock = !inStock || product.stock > 0;
    return matchesSearch && matchesCategory && matchesBrand && matchesPrice && matchesFeatured && matchesBest && matchesStock;
  });

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === 'popular') filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  state.filtered = filtered;
  state.page = 1;
  renderProducts();
  renderActiveFilters();
  renderResultsCount();
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  const loadMore = document.getElementById('load-more');
  if (!grid) return;
  const end = state.page * state.pageSize;
  const slice = state.filtered.slice(0, end);

  grid.innerHTML = slice.map(product => {
    const image = (product.images && product.images[0]) || PLACEHOLDER_IMAGE;
    const inStock = Number(product.stock || 0) > 0;
    const badges = [
      product.featured ? '<span class="badge featured">Featured</span>' : '',
      product.bestSeller ? '<span class="badge best">Best seller</span>' : '',
      !inStock ? '<span class="badge out">Out of stock</span>' : ''
    ].filter(Boolean).join('');
    return `
      <div class="product-card" data-id="${product.id}">
        <a href="product.html?id=${product.id}" class="product-image">
          <img src="${image}" alt="${product.name}" loading="lazy" />
        </a>
        <div class="product-meta">${product.brand || 'Brand'} - ${product.category || 'Category'}</div>
        <div class="product-badges">${badges}</div>
        <div class="product-title">${product.name}</div>
        <div class="rating">★ ${product.rating || 0} (${product.ratingCount || 0})</div>
        <div class="price-row">
          <div class="price">${currency(product.price)}</div>
          ${product.mrp ? `<strike>${currency(product.mrp)}</strike>` : ''}
        </div>
        <div class="product-actions">
          <button class="btn btn-dark" data-action="add" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to cart' : 'Out of stock'}</button>
          <button class="btn btn-ghost" data-action="wish">Wishlist</button>
          <button class="btn btn-light" data-action="compare">Compare</button>
        </div>
      </div>
    `;
  }).join('');

  if (loadMore) {
    loadMore.style.display = state.filtered.length > end ? 'inline-flex' : 'none';
  }
}

function renderResultsCount() {
  const el = document.getElementById('results-count');
  if (el) el.textContent = `${state.filtered.length} items`;
}

function renderActiveFilters() {
  const container = document.getElementById('active-filters');
  if (!container) return;
  const chips = [];
  state.filters.categories.forEach(c => chips.push(`Category: ${c}`));
  state.filters.brands.forEach(b => chips.push(`Brand: ${b}`));
  if (state.filters.minPrice !== null) chips.push(`Min: ${currency(state.filters.minPrice)}`);
  if (state.filters.maxPrice !== null) chips.push(`Max: ${currency(state.filters.maxPrice)}`);
  if (state.filters.featured) chips.push('Featured');
  if (state.filters.bestSeller) chips.push('Best sellers');
  if (state.filters.inStock) chips.push('In stock');
  container.innerHTML = chips.map(c => `<span class="filter-chip">${c}</span>`).join('');
}

function toggleListFilter(list, value) {
  const idx = list.indexOf(value);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(value);
}

function renderFilters() {
  const categories = Array.from(new Set(state.products.map(p => p.category).filter(Boolean)));
  const brands = Array.from(new Set(state.products.map(p => p.brand).filter(Boolean)));

  const categoryList = document.getElementById('filter-categories');
  const brandList = document.getElementById('filter-brands');
  const categoryNav = document.getElementById('category-list');
  if (categoryList) {
    categoryList.innerHTML = categories.map(cat => `
      <label class="check-pill">
        <input type="checkbox" value="${cat}" /> ${cat}
      </label>
    `).join('');
  }
  if (brandList) {
    brandList.innerHTML = brands.map(brand => `
      <label class="check-pill">
        <input type="checkbox" value="${brand}" /> ${brand}
      </label>
    `).join('');
  }
  if (categoryNav) {
    categoryNav.innerHTML = categories.map(cat => `
      <button class="category-chip" data-category="${cat}" type="button">${cat}</button>
    `).join('');
  }

  categoryList?.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      toggleListFilter(state.filters.categories, input.value);
      applyFilters();
    });
  });

  brandList?.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      toggleListFilter(state.filters.brands, input.value);
      applyFilters();
    });
  });

  categoryNav?.querySelectorAll('.category-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters.categories = [btn.dataset.category];
      categoryNav.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
}

async function loadProducts() {
  try {
    const res = await fetch(apiUrl('/api/products?limit=200'));
    const data = await res.json();
    state.products = data.products || [];
    state.filtered = state.products.slice();
    renderFilters();
    applyFilters();
    renderCart();
    renderWishlist();
    renderCompareBar();
    renderRecentlyViewed();
  } catch {
    const grid = document.getElementById('product-grid');
    if (grid) grid.innerHTML = '<p class="muted">Failed to load products. Please check the backend.</p>';
  }
}

function initShop() {
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const sortSelect = document.getElementById('sort-select');
  const minPrice = document.getElementById('min-price');
  const maxPrice = document.getElementById('max-price');
  const applyPrice = document.getElementById('apply-price');
  const loadMore = document.getElementById('load-more');
  const clearFilters = document.getElementById('clear-filters');

  searchInput?.addEventListener('input', (e) => {
    state.filters.search = e.target.value;
    applyFilters();
  });
  searchBtn?.addEventListener('click', () => applyFilters());

  sortSelect?.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    applyFilters();
  });

  applyPrice?.addEventListener('click', () => {
    state.filters.minPrice = minPrice?.value ? Number(minPrice.value) : null;
    state.filters.maxPrice = maxPrice?.value ? Number(maxPrice.value) : null;
    applyFilters();
  });

  loadMore?.addEventListener('click', () => {
    state.page += 1;
    renderProducts();
  });

  clearFilters?.addEventListener('click', () => {
    state.filters = {
      ...state.filters,
      search: '',
      categories: [],
      brands: [],
      minPrice: null,
      maxPrice: null,
      featured: false,
      bestSeller: false,
      inStock: false
    };
    document.querySelectorAll('.filters input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
    if (minPrice) minPrice.value = '';
    if (maxPrice) maxPrice.value = '';
    if (searchInput) searchInput.value = '';
    applyFilters();
  });

  document.getElementById('filter-featured')?.addEventListener('change', (e) => {
    state.filters.featured = e.target.checked;
    applyFilters();
  });
  document.getElementById('filter-bestseller')?.addEventListener('change', (e) => {
    state.filters.bestSeller = e.target.checked;
    applyFilters();
  });
  document.getElementById('filter-instock')?.addEventListener('change', (e) => {
    state.filters.inStock = e.target.checked;
    applyFilters();
  });

  document.getElementById('filter-toggle')?.addEventListener('click', () => {
    document.getElementById('filters')?.classList.toggle('open');
  });

  document.getElementById('product-grid')?.addEventListener('click', (e) => {
    const action = e.target?.getAttribute('data-action');
    const card = e.target?.closest('.product-card');
    if (!action || !card) return;
    const productId = card.dataset.id;
    if (action === 'add') addToCart(productId);
    if (action === 'wish') toggleWishlist(productId);
    if (action === 'compare') toggleCompare(productId);
  });
}

function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const container = document.getElementById('product-detail');
  if (!id || !container) return;

  fetch(apiUrl(`/api/products/${id}`))
    .then(res => res.json())
    .then(product => {
      const image = (product.images && product.images[0]) || PLACEHOLDER_IMAGE;
      const inStock = Number(product.stock || 0) > 0;
      const badges = [
        product.featured ? '<span class="badge featured">Featured</span>' : '',
        product.bestSeller ? '<span class="badge best">Best seller</span>' : '',
        !inStock ? '<span class="badge out">Out of stock</span>' : ''
      ].filter(Boolean).join('');
      addRecentlyViewed(product.id);
      container.innerHTML = `
        <div class="detail-card">
          <div class="product-image">
            <img src="${image}" alt="${product.name}" />
          </div>
        </div>
        <div class="detail-card">
          <p class="muted">${product.brand || ''} - ${product.category || ''}</p>
          <div class="product-badges">${badges}</div>
          <h1>${product.name}</h1>
          <p class="muted">SKU: ${product.sku || 'N/A'}</p>
          <div class="rating">★ ${product.rating || 0} (${product.ratingCount || 0})</div>
          <div class="price-row">
            <div class="price">${currency(product.price)}</div>
            ${product.mrp ? `<strike>${currency(product.mrp)}</strike>` : ''}
          </div>
          <p class="muted">${inStock ? `${product.stock} in stock` : 'Out of stock'}</p>
          <p>${product.shortDesc || ''}</p>
          <p class="muted">${product.longDesc || ''}</p>
          <div class="detail-actions">
            <button class="btn btn-accent" id="detail-add" ${inStock ? '' : 'disabled'}>${inStock ? 'Add to cart' : 'Out of stock'}</button>
            <button class="btn btn-ghost" id="detail-wish">Wishlist</button>
          </div>
        </div>
      `;
      document.getElementById('detail-add')?.addEventListener('click', () => addToCart(product.id));
      document.getElementById('detail-wish')?.addEventListener('click', () => toggleWishlist(product.id));
    });
}

function addToCart(productId) {
  const product = state.products.find(p => p.id === productId);
  if (!product || Number(product.stock || 0) <= 0) return;
  const cart = getCart();
  const existing = cart.find(item => item.productId === productId);
  if (existing) existing.qty += 1;
  else cart.push({ productId, qty: 1 });
  setCart(cart);
  openDrawer('cart-drawer');
}

function toggleWishlist(productId) {
  const list = getWishlist();
  const idx = list.indexOf(productId);
  if (idx >= 0) list.splice(idx, 1);
  else list.push(productId);
  setWishlist(list);
  openDrawer('wishlist-drawer');
}

function toggleCompare(productId) {
  const list = getCompare();
  const idx = list.indexOf(productId);
  if (idx >= 0) list.splice(idx, 1);
  else if (list.length < 3) list.push(productId);
  setCompare(list);
}

function bindCartEvents() {
  document.getElementById('cart-items')?.addEventListener('click', (e) => {
    const action = e.target?.getAttribute('data-action');
    const row = e.target?.closest('.qty-control');
    if (!action || !row) return;
    const productId = row.dataset.id;
    const cart = getCart();
    const item = cart.find(i => i.productId === productId);
    if (!item) return;
    if (action === 'inc') item.qty += 1;
    if (action === 'dec') item.qty = Math.max(1, item.qty - 1);
    if (action === 'remove') {
      const idx = cart.indexOf(item);
      cart.splice(idx, 1);
    }
    setCart(cart);
  });

  document.getElementById('wishlist-items')?.addEventListener('click', (e) => {
    const action = e.target?.getAttribute('data-action');
    const row = e.target?.closest('.qty-control');
    if (!action || !row) return;
    const productId = row.dataset.id;
    if (action === 'add') addToCart(productId);
    if (action === 'remove') toggleWishlist(productId);
  });
}

function bindDrawerToggles() {
  document.getElementById('cart-btn')?.addEventListener('click', () => openDrawer('cart-drawer'));
  document.getElementById('wishlist-btn')?.addEventListener('click', () => openDrawer('wishlist-drawer'));
  document.getElementById('close-cart')?.addEventListener('click', closeDrawers);
  document.getElementById('close-wishlist')?.addEventListener('click', closeDrawers);
  document.getElementById('overlay')?.addEventListener('click', closeDrawers);
  document.getElementById('compare-btn')?.addEventListener('click', renderCompareModal);
  document.getElementById('close-compare')?.addEventListener('click', () => {
    document.getElementById('compare-modal')?.classList.remove('show');
  });
}

async function initCheckout() {
  const itemsEl = document.getElementById('checkout-items');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const deliveryEl = document.getElementById('checkout-delivery');
  const totalEl = document.getElementById('checkout-total');
  const form = document.getElementById('order-form');
  if (!itemsEl || !form) return;

  const cart = getCart();
  if (!cart.length) {
    itemsEl.innerHTML = '<p class="muted">Your cart is empty.</p>';
    return;
  }

  const productsById = Object.fromEntries(state.products.map(p => [p.id, p]));
  let subtotal = 0;
  itemsEl.innerHTML = cart.map(item => {
    const product = productsById[item.productId] || {};
    const line = (product.price || 0) * item.qty;
    subtotal += line;
    return `
      <div class="drawer-item">
        <img src="${(product.images && product.images[0]) || PLACEHOLDER_IMAGE}" alt="${product.name || 'Item'}" />
        <div>
          <div>${product.name || 'Item'}</div>
          <div class="muted">Qty ${item.qty}</div>
        </div>
        <strong>${currency(line)}</strong>
      </div>
    `;
  }).join('');

  const shipping = state.settings.shipping || {};
  const fee = Number(shipping.fee) || 0;
  const freeAbove = Number(shipping.freeAbove) || 0;
  const delivery = freeAbove > 0 && subtotal >= freeAbove ? 0 : fee;
  subtotalEl.textContent = currency(subtotal);
  deliveryEl.textContent = currency(delivery);
  totalEl.textContent = currency(subtotal + delivery);
  const deliveryNoteEl = document.getElementById('checkout-delivery-note');
  if (deliveryNoteEl) {
    deliveryNoteEl.textContent = freeAbove > 0 ? `Free delivery above ${currency(freeAbove)}` : '';
  }

  const token = storage.get('userToken', '');
  if (token) {
    try {
      const me = await fetch(apiUrl('/api/auth/me'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (me.ok) {
        const user = await me.json();
        form.name.value = user.name || '';
        form.email.value = user.email || '';
        form.phone.value = user.phone || '';
      }
    } catch {
      // ignore
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      items: cart.map(item => ({ productId: item.productId, qty: item.qty })),
      deliveryFee: delivery,
      customer: {
        name: form.name.value,
        phone: form.phone.value,
        email: form.email.value,
        address: form.address.value,
        city: form.city.value,
        state: form.state.value,
        pincode: form.pincode.value,
        notes: form.notes.value
      }
    };
    const res = await fetch(apiUrl('/api/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const msg = document.getElementById('order-message');
    if (res.ok) {
      const order = await res.json();
      setCart([]);
      if (msg) {
        const wa = buildWaMeUrl(state.settings.shopInfo?.whatsapp, `Order ${order.orderNo} - ${order.customer?.name || ''}`);
        msg.innerHTML = `Order placed! Order no: ${order.orderNo}. <a class="btn btn-ghost" href="${wa}" target="_blank" rel="noopener">Send on WhatsApp</a>`;
      }
    } else {
      if (msg) msg.textContent = 'Failed to place order. Please try again.';
    }
  });
}

function initAccount() {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    const payload = { email: fd.get('email'), password: fd.get('password') };
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const msg = document.getElementById('login-message');
    if (res.ok) {
      const data = await res.json();
      storage.set('userToken', data.token);
      if (msg) msg.textContent = 'Signed in successfully.';
    } else {
      if (msg) msg.textContent = 'Login failed. Check your details.';
    }
  });

  signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(signupForm);
    const payload = {
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      password: fd.get('password')
    };
    const res = await fetch(apiUrl('/api/auth/signup'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const msg = document.getElementById('signup-message');
    if (res.ok) {
      const data = await res.json();
      storage.set('userToken', data.token);
      if (msg) msg.textContent = 'Account created. You are signed in.';
    } else {
      if (msg) msg.textContent = 'Signup failed. Try another email.';
    }
  });
}

function initTrack() {
  const form = document.getElementById('track-form');
  const result = document.getElementById('track-result');
  if (!form || !result) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      orderNo: fd.get('orderNo'),
      phone: fd.get('phone')
    };
    result.innerHTML = '<p class="muted">Checking order status...</p>';
    const res = await fetch(apiUrl('/api/orders/track'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      result.innerHTML = '<p class="muted">Order not found. Please check the order number and phone.</p>';
      return;
    }
    const data = await res.json();
    const items = (data.items || []).map(item => `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${currency(item.price)}</td>
        <td>${currency(item.lineTotal)}</td>
      </tr>
    `).join('');
    result.innerHTML = `
      <p><strong>Status:</strong> <span class="status-pill" data-status="${data.status}">${data.status}</span></p>
      <p><strong>Order No:</strong> ${data.orderNo}</p>
      <p><strong>Date:</strong> ${data.createdAt ? new Date(data.createdAt).toLocaleString() : ''}</p>
      <p><strong>Deliver to:</strong> ${data.customer?.name || ''}, ${data.customer?.city || ''} ${data.customer?.pincode || ''}</p>
      <div class="table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
      </div>
      <div class="summary-row">
        <span>Subtotal</span>
        <strong>${currency(data.subtotal)}</strong>
      </div>
      <div class="summary-row">
        <span>Delivery</span>
        <strong>${currency(data.deliveryFee)}</strong>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <strong>${currency(data.total)}</strong>
      </div>
    `;
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  loadShopInfo();
  updateCartCount();
  updateWishlistCount();
  bindDrawerToggles();
  bindCartEvents();
  document.getElementById('hero-cta')?.addEventListener('click', () => {
    window.location.href = 'checkout.html';
  });

  await loadProducts();
  const page = document.body.dataset.page;
  if (page === 'shop') initShop();
  if (page === 'product') initProductPage();
  if (page === 'checkout') initCheckout();
  if (page === 'account') initAccount();
  if (page === 'track') initTrack();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js');
    });
  }
});
