const API_BASE = (window.API_BASE || localStorage.getItem('apiBase') || '').trim().replace(/\/+$/, '');
const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

const tokenKey = 'adminToken';

const adminState = {
  products: [],
  orders: [],
  settings: null
};

function setToken(token) {
  localStorage.setItem(tokenKey, token);
}

function getToken() {
  return localStorage.getItem(tokenKey) || '';
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function showDashboard(show) {
  const login = document.getElementById('admin-login');
  const dashboard = document.getElementById('admin-dashboard');
  if (login) login.style.display = show ? 'none' : 'block';
  if (dashboard) dashboard.classList.toggle('hidden', !show);
}

async function loginAdmin(payload) {
  const res = await fetch(apiUrl('/api/admin/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  setToken(data.token);
  return data;
}

async function loadProducts() {
  const res = await fetch(apiUrl('/api/products?limit=200'));
  const data = await res.json();
  adminState.products = data.products || [];
  renderProducts();
}

async function loadOrders() {
  const res = await fetch(apiUrl('/api/orders'), { headers: authHeaders() });
  if (res.status === 401) {
    showDashboard(false);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  adminState.orders = data.orders || [];
  renderOrders();
}

async function loadSettings() {
  const res = await fetch(apiUrl('/api/settings'), { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  adminState.settings = data;

  const form = document.getElementById('settings-form');
  if (!form) return;
  const shop = data.shopInfo || {};
  const shipping = data.shipping || {};
  form.storeName.value = shop.name || '';
  form.phone.value = shop.phone || '';
  form.whatsapp.value = shop.whatsapp || '';
  form.email.value = shop.email || '';
  form.address.value = shop.address || '';
  form.hours.value = shop.hours || '';
  form.deliveryFee.value = shipping.fee ?? '';
  form.freeAbove.value = shipping.freeAbove ?? '';
  form.announcement.value = data.announcement || '';
}

async function saveSettings(form) {
  const payload = {
    faqs: (adminState.settings && adminState.settings.faqs) || [],
    shopInfo: {
      name: form.storeName.value,
      phone: form.phone.value,
      whatsapp: form.whatsapp.value,
      email: form.email.value,
      address: form.address.value,
      hours: form.hours.value
    },
    shipping: {
      fee: form.deliveryFee.value ? Number(form.deliveryFee.value) : 0,
      freeAbove: form.freeAbove.value ? Number(form.freeAbove.value) : 0
    },
    announcement: form.announcement.value
  };

  const res = await fetch(apiUrl('/api/settings'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Save settings failed');
  adminState.settings = await res.json().catch(() => payload);
}

function renderProducts() {
  const tbody = document.getElementById('products-body');
  if (!tbody) return;
  tbody.innerHTML = adminState.products.map(product => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>Rs. ${Number(product.price || 0).toLocaleString('en-IN')}</td>
      <td>${product.stock || 0}</td>
      <td>
        <button class="btn btn-ghost" data-action="edit" data-id="${product.id}">Edit</button>
        <button class="btn btn-ghost" data-action="delete" data-id="${product.id}">Delete</button>
      </td>
    </tr>
  `).join('');
}

function renderOrders() {
  const tbody = document.getElementById('orders-body');
  if (!tbody) return;
  tbody.innerHTML = adminState.orders.map(order => `
    <tr>
      <td>${order.orderNo}</td>
      <td>${order.customer?.name || ''}</td>
      <td>${order.customer?.phone || ''}</td>
      <td>Rs. ${Number(order.total || 0).toLocaleString('en-IN')}</td>
      <td>
        <select data-action="status" data-id="${order.id}">
          ${['new', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'].map(status => `
            <option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>
          `).join('')}
        </select>
      </td>
      <td>${order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</td>
      <td><button class="btn btn-ghost" data-action="view" data-id="${order.id}">View</button></td>
    </tr>
  `).join('');
}

function openOrderModal(order) {
  const modal = document.getElementById('order-modal');
  const body = document.getElementById('order-modal-body');
  if (!modal || !body) return;
  const items = order.items || [];
  body.innerHTML = `
    <p><strong>Order No:</strong> ${order.orderNo}</p>
    <p><strong>Status:</strong> ${order.status}</p>
    <p><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}</p>
    <p><strong>Customer:</strong> ${order.customer?.name || ''}</p>
    <p><strong>Phone:</strong> ${order.customer?.phone || ''}</p>
    <p><strong>Address:</strong> ${order.customer?.address || ''}, ${order.customer?.city || ''} ${order.customer?.pincode || ''}</p>
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
          ${items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.qty}</td>
              <td>Rs. ${Number(item.price || 0).toLocaleString('en-IN')}</td>
              <td>Rs. ${Number(item.lineTotal || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  modal.classList.add('show');
}

function resetProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;
  form.reset();
  form.querySelector('input[name="id"]').value = '';
}

async function saveProduct(form) {
  const fd = new FormData(form);
  const id = fd.get('id');
  const payload = {
    name: fd.get('name'),
    category: fd.get('category'),
    brand: fd.get('brand'),
    sku: fd.get('sku'),
    price: Number(fd.get('price')),
    mrp: fd.get('mrp') ? Number(fd.get('mrp')) : undefined,
    stock: fd.get('stock') ? Number(fd.get('stock')) : undefined,
    rating: fd.get('rating') ? Number(fd.get('rating')) : undefined,
    tags: fd.get('tags'),
    shortDesc: fd.get('shortDesc'),
    longDesc: fd.get('longDesc'),
    imageUrl: fd.get('imageUrl'),
    featured: fd.get('featured') === 'on',
    bestSeller: fd.get('bestSeller') === 'on'
  };

  const res = await fetch(apiUrl(id ? `/api/products/${id}` : '/api/products'), {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Save failed');
  const data = await res.json();

  const file = form.querySelector('input[name="imageFile"]').files[0];
  if (file) {
    const upload = new FormData();
    upload.append('image', file);
    await fetch(apiUrl(`/api/products/${data.id}/image`), {
      method: 'POST',
      headers: authHeaders(),
      body: upload
    });
  }

  await loadProducts();
  resetProductForm();
  return data;
}

async function deleteProduct(id) {
  await fetch(apiUrl(`/api/products/${id}`), {
    method: 'DELETE',
    headers: authHeaders()
  });
  await loadProducts();
}

async function exportOrders() {
  const res = await fetch(apiUrl('/api/orders/export'), { headers: authHeaders() });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orders.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

async function updateOrderStatus(id, status) {
  await fetch(apiUrl(`/api/orders/${id}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status })
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginForm = document.getElementById('admin-login-form');
  const messageEl = document.getElementById('admin-login-message');

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      await loginAdmin({ email: fd.get('email'), password: fd.get('password') });
      showDashboard(true);
      await loadProducts();
      await loadOrders();
      await loadSettings();
    } catch {
      if (messageEl) messageEl.textContent = 'Login failed. Check credentials.';
    }
  });

  if (getToken()) {
    showDashboard(true);
    await loadProducts();
    await loadOrders();
    await loadSettings();
  } else {
    showDashboard(false);
  }

  document.getElementById('admin-logout')?.addEventListener('click', () => {
    localStorage.removeItem(tokenKey);
    showDashboard(false);
  });

  document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('product-message');
    try {
      await saveProduct(form);
      if (msg) msg.textContent = 'Product saved.';
    } catch {
      if (msg) msg.textContent = 'Failed to save product.';
    }
  });

  document.getElementById('product-reset')?.addEventListener('click', resetProductForm);

  document.getElementById('settings-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const msg = document.getElementById('settings-message');
    try {
      await saveSettings(form);
      if (msg) msg.textContent = 'Settings saved.';
    } catch {
      if (msg) msg.textContent = 'Failed to save settings.';
    }
  });

  document.getElementById('products-body')?.addEventListener('click', (e) => {
    const action = e.target?.getAttribute('data-action');
    const id = e.target?.getAttribute('data-id');
    if (!action || !id) return;
    if (action === 'edit') {
      const product = adminState.products.find(p => p.id === id);
      const form = document.getElementById('product-form');
      if (!product || !form) return;
      form.querySelector('input[name="id"]').value = product.id;
      form.querySelector('input[name="name"]').value = product.name || '';
      form.querySelector('input[name="category"]').value = product.category || '';
      form.querySelector('input[name="brand"]').value = product.brand || '';
      form.querySelector('input[name="sku"]').value = product.sku || '';
      form.querySelector('input[name="price"]').value = product.price || '';
      form.querySelector('input[name="mrp"]').value = product.mrp || '';
      form.querySelector('input[name="stock"]').value = product.stock || '';
      form.querySelector('input[name="rating"]').value = product.rating || '';
      form.querySelector('input[name="tags"]').value = (product.tags || []).join(', ');
      form.querySelector('input[name="shortDesc"]').value = product.shortDesc || '';
      form.querySelector('textarea[name="longDesc"]').value = product.longDesc || '';
      form.querySelector('input[name="imageUrl"]').value = (product.images && product.images[0]) || '';
      form.querySelector('input[name="featured"]').checked = Boolean(product.featured);
      form.querySelector('input[name="bestSeller"]').checked = Boolean(product.bestSeller);
      form.scrollIntoView({ behavior: 'smooth' });
    }
    if (action === 'delete') {
      deleteProduct(id);
    }
  });

  document.getElementById('orders-body')?.addEventListener('change', (e) => {
    const select = e.target;
    const id = select.getAttribute('data-id');
    if (!id) return;
    updateOrderStatus(id, select.value);
  });

  document.getElementById('orders-body')?.addEventListener('click', (e) => {
    const action = e.target?.getAttribute('data-action');
    const id = e.target?.getAttribute('data-id');
    if (action !== 'view' || !id) return;
    const order = adminState.orders.find(o => o.id === id);
    if (order) openOrderModal(order);
  });

  document.getElementById('close-order-modal')?.addEventListener('click', () => {
    document.getElementById('order-modal')?.classList.remove('show');
  });

  document.getElementById('order-modal')?.addEventListener('click', (e) => {
    if (e.target?.id === 'order-modal') {
      e.target.classList.remove('show');
    }
  });

  document.getElementById('export-orders')?.addEventListener('click', exportOrders);
});
