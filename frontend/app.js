/* Mahamaya Enterprise v2.1 — API: https://mahamaya-enterprise.onrender.com */
const API_BASE = (window.API_BASE || localStorage.getItem('apiBase') || 'https://mahamaya-enterprise.onrender.com').trim().replace(/\/+$/, '');
const api = p => API_BASE ? `${API_BASE}${p}` : p;
const PLACEHOLDER = '/assets/placeholder.svg';
const Rs = v => `Rs. ${Number(v||0).toLocaleString('en-IN')}`;

// ── STATE ──────────────────────────────────────────────
const S = {
  products: [], filtered: [], page: 1, pageSize: 16,
  settings: { shopInfo:{}, shipping:{fee:150,freeAbove:5000}, announcement:'' },
  filters: { search:'', categories:[], brands:[], minPrice:null, maxPrice:null,
             featured:false, bestSeller:false, inStock:false, onSale:false, sort:'popular' }
};

// ── STORAGE ────────────────────────────────────────────
const store = {
  get:(k,d)=>{ try{ const r=localStorage.getItem(k); return r?JSON.parse(r):d; }catch{return d;} },
  set:(k,v)=>{ localStorage.setItem(k,JSON.stringify(v)); }
};

// ── DARK MODE ──────────────────────────────────────────
function initDark(){
  const saved = store.get('theme','light');
  document.documentElement.setAttribute('data-theme', saved);
  updateDarkBtn(saved);
  document.getElementById('dark-toggle')?.addEventListener('click',()=>{
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',next);
    store.set('theme',next);
    updateDarkBtn(next);
  });
}
function updateDarkBtn(theme){
  const btn = document.getElementById('dark-toggle');
  if(btn) btn.textContent = theme==='dark'?'☀️':'🌙';
}

// ── TOAST ──────────────────────────────────────────────
function toast(msg, type='info', dur=3000){
  const c = document.getElementById('toast-container');
  if(!c) return;
  const icons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t = document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span class="toast-icon">${icons[type]||'ℹ️'}</span><span>${msg}</span>`;
  c.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),350); }, dur);
}

// ── WA URL ─────────────────────────────────────────────
function waUrl(num, text=''){
  const d = String(num||'').replace(/\D/g,'');
  const n = d.length===10?`91${d}`:d;
  return `https://wa.me/${n}${text?'?text='+encodeURIComponent(text):''}`;
}

// ── CART ───────────────────────────────────────────────
const getCart = () => store.get('cart', []);
function setCart(cart) {
  store.set('cart', cart);
  updateCartBadge();
  renderCartDrawer();
  if (document.body.dataset.page === 'checkout') {
    initCheckout();
  }
}
function updateCartBadge() {
  const cart = getCart();
  const count = cart.length;
  document.querySelectorAll('#cart-count, #cart-count-drawer, #cart-badge-mob').forEach(el => {
    if (el) {
      el.textContent = count;
      if (el.id === 'cart-badge-mob') {
        el.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  });
}
function addToCart(productId, qty = null, triggerEl = null, variant = null) {
  const p = S.products.find(x => x.id === productId);
  if (!p) return;

  if (p.variants && p.variants.length > 0 && !variant) {
    openQuickView(productId);
    return;
  }

  const minQty = typeof p.minQty === 'number' ? p.minQty : 1;
  const qtyStep = typeof p.qtyStep === 'number' ? p.qtyStep : 1;
  const targetQty = qty !== null ? Number(qty) : minQty;

  if (targetQty < minQty) {
    toast(`Minimum quantity for ${p.name} is ${minQty}`, 'warning');
    return;
  }
  if (targetQty % qtyStep !== 0) {
    toast(`Quantity for ${p.name} must be in multiples of ${qtyStep}`, 'warning');
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.productId === productId && (item.variant || '') === (variant || ''));
  const currentQty = existing ? existing.qty : 0;
  const nextQty = currentQty + targetQty;

  const stock = typeof p.stock === 'number' ? p.stock : 999999;
  if (nextQty > stock) {
    toast(`Cannot add more. Only ${stock} units available.`, 'warning');
    return;
  }

  if (existing) {
    existing.qty = nextQty;
  } else {
    cart.push({ productId, variant: variant || null, qty: nextQty });
  }

  setCart(cart);
  toast(`${p.name}${variant ? ` (${variant})` : ''} added to cart!`, 'success');

  if (triggerEl) {
    animateCartFly(triggerEl);
  }
}
function animateCartFly(el) {
  const cartBtn = document.getElementById('cart-btn');
  if (!el || !cartBtn) return;
  const rect = el.getBoundingClientRect();
  const cartRect = cartBtn.getBoundingClientRect();
  
  const fly = document.createElement('div');
  fly.className = 'cart-fly-item';
  fly.style.left = `${rect.left}px`;
  fly.style.top = `${rect.top}px`;
  document.body.appendChild(fly);
  
  // Trigger reflow
  fly.offsetWidth;
  
  const dX = cartRect.left - rect.left;
  const dY = cartRect.top - rect.top;
  
  fly.style.transform = `translate(${dX}px, ${dY}px) scale(0.2)`;
  fly.style.opacity = '0';
  
  setTimeout(() => fly.remove(), 800);
}
function renderCartDrawer() {
  // Safe helper — avoids TypeError if element not in DOM on current page
  const setText = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  const el = document.getElementById('cart-items');
  if (!el) return;
  const cart = getCart();
  
  if (!cart.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-ico">🛒</div>
      <p>Your cart is empty.</p>
      <a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Browse Products</a>
    </div>`;
    setText('cart-subtotal', Rs(0));
    setText('cart-delivery', Rs(0));
    setText('cart-total', Rs(0));
    return;
  }
  
  let subtotal = 0;
  el.innerHTML = cart.map(item => {
    const p = S.products.find(x => x.id === item.productId) || {};
    let price = p.price || 0;
    let mrp = p.mrp || p.price || 0;
    
    if (item.variant && p.variants) {
      const v = p.variants.find(x => x.value === item.variant);
      if (v) {
        price = v.price;
        mrp = v.mrp || v.price;
      }
    }
    
    const lineTotal = price * item.qty;
    subtotal += lineTotal;
    
    const img = (p.images && p.images[0]) || PLACEHOLDER;
    const minQty = typeof p.minQty === 'number' ? p.minQty : 1;
    const qtyStep = typeof p.qtyStep === 'number' ? p.qtyStep : 1;
    const stock = typeof p.stock === 'number' ? p.stock : 999999;
    
    const isMin = item.qty <= minQty;
    const isMax = item.qty >= stock;
    
    return `
      <div class="drawer-item">
        <img class="drawer-item-img" src="${img}" alt="${p.name || ''}"/>
        <div style="flex:1">
          <a href="product.html?id=${item.productId}" class="drawer-item-name">
            ${p.name || 'Item'}${item.variant ? ` (${item.variant})` : ''}
          </a>
          <div class="drawer-item-price">${Rs(price)} <span style="font-size:0.8rem;color:var(--muted)">x ${item.qty}</span></div>
          <div class="qty-control" data-id="${item.productId}" data-variant="${item.variant || ''}" style="display:flex;align-items:center;gap:.6rem;margin-top:.4rem">
            <div class="qty-stepper" style="padding:0.1rem 0.3rem">
              <button class="qty-step-btn" data-action="dec" ${isMin ? 'disabled' : ''}>−</button>
              <span class="qty-step-val">${item.qty}</span>
              <button class="qty-step-btn" data-action="inc" ${isMax ? 'disabled' : ''}>+</button>
            </div>
            <button class="btn btn-ghost btn-sm" data-action="remove" style="color:var(--danger);padding:0.2rem 0.5rem">Remove</button>
          </div>
        </div>
        <div style="font-weight:600;font-size:0.9rem">${Rs(lineTotal)}</div>
      </div>
    `;
  }).join('');
  
  const ship = S.settings.shipping || { fee: 150, freeAbove: 5000 };
  const fee = ship.freeAbove > 0 && subtotal >= ship.freeAbove ? 0 : (ship.fee || 0);
  
  setText('cart-subtotal', Rs(subtotal));
  setText('cart-delivery', fee > 0 ? Rs(fee) : 'FREE');
  setText('cart-total', Rs(subtotal + fee));
}
async function openQuickView(productId) {
  const p = S.products.find(x => x.id === productId);
  if (!p) return;
  
  const modal = document.getElementById('quickview-modal');
  const body = document.getElementById('qv-body');
  const title = document.getElementById('qv-title');
  if (!modal || !body) return;
  
  title.textContent = p.name;
  
  const img = (p.images && p.images[0]) || PLACEHOLDER;
  const inStock = Number(p.stock || 0) > 0;
  const minQty = typeof p.minQty === 'number' ? p.minQty : 1;
  const qtyStep = typeof p.qtyStep === 'number' ? p.qtyStep : 1;
  const stock = typeof p.stock === 'number' ? p.stock : 999999;
  
  let initialVariant = '';
  let initialPrice = p.price;
  let initialMrp = p.mrp || p.price;
  
  let variantSelectHtml = '';
  if (p.variants && p.variants.length > 0) {
    initialVariant = p.variants[0].value;
    initialPrice = p.variants[0].price;
    initialMrp = p.variants[0].mrp || p.variants[0].price;
    
    variantSelectHtml = `
      <div style="margin-bottom:1rem">
        <label class="qty-label" style="display:block;margin-bottom:0.4rem">Select Option:</label>
        <select class="variant-select" id="qv-variant-select" style="width:100%;padding:0.6rem;border-radius:var(--radius-md);border:1px solid var(--edge);background:var(--card);color:var(--text);font-weight:500">
          ${p.variants.map(v => `<option value="${v.value}" data-price="${v.price}" data-mrp="${v.mrp || v.price}">${v.value} — ${Rs(v.price)}</option>`).join('')}
        </select>
      </div>
    `;
  }
  
  const discount = initialMrp > initialPrice ? Math.round((initialMrp - initialPrice) / initialMrp * 100) : 0;
  
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:1.5rem;align-items:start">
      <div style="border-radius:var(--radius-lg);overflow:hidden;background:var(--edge);display:flex;align-items:center;justify-content:center;height:240px">
        <img id="qv-img" src="${img}" alt="${p.name}" style="max-height:100%;max-width:100%;object-fit:contain"/>
      </div>
      <div>
        <div style="font-size:0.85rem;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.2rem">${p.brand || ''}</div>
        <h4 style="margin:0 0 0.5rem 0;font-size:1.2rem;font-weight:700">${p.name}</h4>
        
        <div style="margin-bottom:1rem">
          <div style="display:flex;align-items:baseline;gap:0.6rem;flex-wrap:wrap">
            <span id="qv-price" style="font-size:1.4rem;font-weight:800;color:var(--primary)">${Rs(initialPrice)}</span>
            <span id="qv-mrp" style="font-size:1rem;color:var(--muted);text-decoration:line-through;display:${discount > 0 ? 'inline' : 'none'}">${Rs(initialMrp)}</span>
            <span id="qv-off" class="badge badge-sale" style="display:${discount > 0 ? 'inline-block' : 'none'}">${discount}% OFF</span>
          </div>
          <div id="qv-stock-status" style="font-size:0.8rem;margin-top:0.4rem;font-weight:600;color:${inStock ? 'var(--success)' : 'var(--danger)'}">
            ${inStock ? `✓ In Stock (${p.stock} units)` : '✕ Out of Stock'}
          </div>
        </div>
        
        ${variantSelectHtml}
        
        <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1.2rem">
          <span class="qty-label">Qty:</span>
          <div class="qty-stepper">
            <button class="qty-step-btn" id="qv-qty-dec">−</button>
            <span class="qty-step-val" id="qv-qty-val">${minQty}</span>
            <button class="qty-step-btn" id="qv-qty-inc">+</button>
          </div>
          <span style="font-size:0.8rem;color:var(--muted)">Min: ${minQty}, Step: ${qtyStep}</span>
        </div>
        
        <div style="display:flex;gap:0.6rem">
          <button class="btn btn-primary" id="qv-add-btn" style="flex:1" ${inStock ? '' : 'disabled'}>🛒 Add to Cart</button>
          <button class="btn btn-outline btn-icon" id="qv-wish-btn" style="font-size:1.1rem">♥</button>
        </div>
      </div>
    </div>
  `;
  
  let currentQty = minQty;
  let selectedVariant = initialVariant;
  
  const qvPrice = document.getElementById('qv-price');
  const qvMrp = document.getElementById('qv-mrp');
  const qvOff = document.getElementById('qv-off');
  const qvQtyVal = document.getElementById('qv-qty-val');
  const variantSelect = document.getElementById('qv-variant-select');
  
  if (variantSelect) {
    variantSelect.addEventListener('change', e => {
      selectedVariant = e.target.value;
      const opt = e.target.options[e.target.selectedIndex];
      const pr = Number(opt.dataset.price);
      const mr = Number(opt.dataset.mrp);
      
      qvPrice.textContent = Rs(pr);
      if (mr > pr) {
        qvMrp.textContent = Rs(mr);
        qvMrp.style.display = 'inline';
        const discPct = Math.round((mr - pr) / mr * 100);
        qvOff.textContent = `${discPct}% OFF`;
        qvOff.style.display = 'inline-block';
      } else {
        qvMrp.style.display = 'none';
        qvOff.style.display = 'none';
      }
    });
  }
  
  document.getElementById('qv-qty-dec')?.addEventListener('click', () => {
    currentQty = Math.max(minQty, currentQty - qtyStep);
    qvQtyVal.textContent = currentQty;
  });
  
  document.getElementById('qv-qty-inc')?.addEventListener('click', () => {
    currentQty = Math.min(stock, currentQty + qtyStep);
    qvQtyVal.textContent = currentQty;
  });
  
  document.getElementById('qv-add-btn')?.addEventListener('click', e => {
    addToCart(p.id, currentQty, e.target, selectedVariant);
    closeModal('quickview-modal');
  });
  
  const wishBtn = document.getElementById('qv-wish-btn');
  if (wishBtn) {
    const wishes = getWish();
    wishBtn.textContent = wishes.includes(p.id) ? '♥' : '♡';
    wishBtn.addEventListener('click', () => {
      toggleWish(p.id);
      const nowWishes = getWish();
      wishBtn.textContent = nowWishes.includes(p.id) ? '♥' : '♡';
    });
  }
  
  modal.classList.add('show');
  document.getElementById('overlay')?.classList.add('show');
}

// ── WISHLIST ───────────────────────────────────────────
const getWish=()=>store.get('wishlist',[]);
function updateWishlistBadge() {
  const list = getWish();
  const count = list.length;
  document.querySelectorAll('#wishlist-count, #wishlist-count-drawer, #wishlist-badge-mob').forEach(el => {
    if (el) {
      el.textContent = count;
      if (el.id === 'wishlist-badge-mob') {
        el.style.display = count > 0 ? 'flex' : 'none';
      }
    }
  });
}
function toggleWish(id){
  const list=getWish(), idx=list.indexOf(id);
  if(idx>=0) list.splice(idx,1); else list.push(id);
  store.set('wishlist',list);
  updateWishlistBadge();
  renderWishlist();
  const p=S.products.find(x=>x.id===id);
  toast(idx>=0?`Removed from wishlist`:`${p?.name||'Item'} wishlisted ♥`, idx>=0?'info':'success');
}
function renderWishlist(){
  const el=document.getElementById('wishlist-items');
  if(!el) return;
  const list=getWish();
  if(!list.length){ el.innerHTML='<div class="empty-state"><div class="empty-ico">♥</div><p>No items in wishlist.</p></div>'; return; }
  el.innerHTML=list.map(id=>{ const p=S.products.find(x=>x.id===id)||{}; const img=(p.images&&p.images[0])||PLACEHOLDER; return `<div class="drawer-item"><img class="drawer-item-img" src="${img}" alt="${p.name||''}"/><div><a href="product.html?id=${id}" class="drawer-item-name">${p.name||'Item'}</a><div class="drawer-item-price">${Rs(p.price||0)}</div><div style="display:flex;gap:.4rem;margin-top:.4rem"><button class="btn btn-primary btn-sm" onclick="addToCart('${id}')">Add to Cart</button><button class="btn btn-ghost btn-sm" onclick="toggleWish('${id}')">Remove</button></div></div></div>`; }).join('');
}

// ── COMPARE ────────────────────────────────────────────
const getCompare=()=>store.get('compare',[]);
function toggleCompare(id){
  const list=getCompare(), idx=list.indexOf(id);
  if(idx>=0) list.splice(idx,1);
  else if(list.length>=3){ toast('Max 3 items to compare','warning'); return; }
  else list.push(id);
  store.set('compare',list);
  renderCompareBar();
  const p=S.products.find(x=>x.id===id);
  toast(idx>=0?`Removed from compare`:`${p?.name||'Item'} added to compare`,'info');
}
function renderCompareBar(){
  const bar=document.getElementById('compare-bar');
  const list=getCompare();
  if(!bar) return;
  if(!list.length){ bar.classList.remove('show'); return; }
  const ci=document.getElementById('compare-items');
  if(ci) ci.innerHTML=list.map(id=>{ const p=S.products.find(x=>x.id===id)||{}; const img=(p.images&&p.images[0])||PLACEHOLDER; return `<div class="compare-chip"><img src="${img}" alt="${p.name||''}"/>${p.name||'Item'}<button class="compare-chip-del" onclick="toggleCompare('${id}')">✕</button></div>`; }).join('');
  bar.classList.add('show');
}
function renderCompareModal(){
  const modal=document.getElementById('compare-modal');
  const table=document.getElementById('compare-table');
  if(!modal||!table) return;
  const list=getCompare();
  if(!list.length) return;
  const products=list.map(id=>S.products.find(p=>p.id===id)).filter(Boolean);
  const rows=[['Brand',p=>p.brand||'—'],['Category',p=>p.category||'—'],['Price',p=>Rs(p.price)],['MRP',p=>Rs(p.mrp||p.price)],['Rating',p=>`⭐ ${p.rating||0} (${p.ratingCount||0})`],['Stock',p=>Number(p.stock||0)>0?`${p.stock} units`:'Out of Stock']];
  table.innerHTML=`<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Spec</th>${products.map(p=>`<th>${p.name}</th>`).join('')}</tr></thead><tbody><tr><td><strong>Image</strong></td>${products.map(p=>`<td><img src="${(p.images&&p.images[0])||PLACEHOLDER}" style="width:80px;height:80px;object-fit:contain"/></td>`).join('')}</tr>${rows.map(([l,fn])=>`<tr><td><strong>${l}</strong></td>${products.map(p=>`<td>${fn(p)}</td>`).join('')}</tr>`).join('')}<tr><td></td>${products.map(p=>`<td><button class="btn btn-primary btn-sm" onclick="addToCart('${p.id}');closeModal('compare-modal')">Add to Cart</button></td>`).join('')}</tr></tbody></table></div>`;
  modal.classList.add('show');
  document.getElementById('overlay')?.classList.add('show');
}

// ── RECENTLY VIEWED ────────────────────────────────────
function addRecentlyViewed(id){
  const list=store.get('recentlyViewed',[]).filter(x=>x!==id);
  list.unshift(id);
  store.set('recentlyViewed',list.slice(0,8));
}
function renderRecentlyViewed(){
  const sec=document.getElementById('recently-viewed-section');
  const grid=document.getElementById('recently-viewed-grid');
  if(!sec||!grid) return;
  const ids=store.get('recentlyViewed',[]);
  const items=ids.map(id=>S.products.find(p=>p.id===id)).filter(Boolean);
  if(!items.length){ sec.classList.add('hidden'); return; }
  sec.classList.remove('hidden');
  grid.innerHTML=items.map(p=>renderProductCard(p)).join('');
}

// ── DRAWER / MODAL ─────────────────────────────────────
function openDrawer(id){
  document.getElementById(id)?.classList.add('open');
  document.getElementById('overlay')?.classList.add('show');
  document.getElementById(id)?.setAttribute('aria-hidden','false');
}
function closeDrawers(){
  document.querySelectorAll('.drawer').forEach(d=>{ d.classList.remove('open'); d.setAttribute('aria-hidden','true'); });
  document.getElementById('overlay')?.classList.remove('show');
  document.querySelectorAll('.modal').forEach(m=>m.classList.remove('show'));
}
function closeModal(id){ document.getElementById(id)?.classList.remove('show'); }

// ── SHOP INFO ──────────────────────────────────────────
async function loadShopInfo(){
  try{
    const res=await fetch(api('/api/settings'));
    if(!res.ok) return;
    const data=await res.json();
    const shop=data.shopInfo||{};
    S.settings={ shopInfo:shop, shipping:data.shipping||{fee:150,freeAbove:5000}, announcement:data.announcement||'' };
    const ph=document.getElementById('topbar-phone');
    const wa=document.getElementById('topbar-whatsapp');
    const ann=document.getElementById('topbar-announcement');
    const loc=document.getElementById('topbar-location');
    if(ph&&shop.phone){ ph.textContent=`📞 ${shop.phone}`; ph.href=`tel:${shop.phone}`; }
    if(wa&&shop.whatsapp){ wa.href=waUrl(shop.whatsapp); }
    if(ann&&S.settings.announcement){ ann.textContent=S.settings.announcement; ann.style.display='inline'; }
    if(loc&&shop.address){ loc.textContent=`📍 ${shop.address.split(',')[0]}`; }
  }catch{}
}

// ── PRODUCT CARD RENDERER ──────────────────────────────
function renderProductCard(p){
  const img=(p.images&&p.images[0])||PLACEHOLDER;
  const inStock=Number(p.stock||0)>0;
  const lowStock=inStock&&Number(p.stock)<=5;
  const discount=p.mrp&&p.mrp>p.price?Math.round((p.mrp-p.price)/p.mrp*100):0;
  const wish=getWish();
  const comp=getCompare();
  const wished=wish.includes(p.id);
  const compared=comp.includes(p.id);
  const badges=[
    p.featured?'<span class="badge badge-featured">Featured</span>':'',
    p.bestSeller?'<span class="badge badge-best">Best Seller</span>':'',
    discount>=5?`<span class="badge badge-sale">${discount}% OFF</span>`:'',
    !inStock?'<span class="badge badge-out">Out of Stock</span>':'',
  ].filter(Boolean).join('');
  const stars='⭐'.repeat(Math.round(p.rating||0));
  return `
  <div class="product-card" data-id="${p.id}">
    <a href="product.html?id=${p.id}" class="product-image">
      <img src="${img}" alt="${p.name}" loading="lazy" decoding="async"/>
      <div class="product-badges">${badges}</div>
      <div class="product-image-actions">
        <button class="img-action-btn${wished?' active':''}" data-action="wish" title="Wishlist">♥</button>
        <button class="img-action-btn${compared?' active':''}" data-action="compare" title="Compare">⇄</button>
      </div>
    </a>
    <div class="product-body">
      <div class="product-brand">${p.brand||''}</div>
      <a href="product.html?id=${p.id}" class="product-name">${p.name}</a>
      ${p.sku?`<div class="product-sku">SKU: ${p.sku}</div>`:''}
      <div class="product-rating"><span class="stars">${stars||'☆☆☆☆☆'}</span><span class="rating-count">(${p.ratingCount||0})</span></div>
      <div class="price-row">
        <span class="price-current">${Rs(p.price)}</span>
        ${p.mrp&&p.mrp>p.price?`<span class="price-mrp">${Rs(p.mrp)}</span><span class="price-off">-${discount}%</span>`:''}
      </div>
      ${lowStock?`<div class="stock-low">⚠ Only ${p.stock} left!</div>`:''}
    </div>
    <div class="product-footer">
      <button class="btn btn-primary btn-sm" data-action="add" ${inStock?'':'disabled'} style="${inStock?'':'opacity:.5;cursor:not-allowed'}">
        ${inStock?'🛒 Add to Cart':'Out of Stock'}
      </button>
      <button class="btn btn-ghost btn-sm btn-icon" data-action="wish" title="Wishlist" style="font-size:1rem">${wished?'♥':'♡'}</button>
    </div>
  </div>`;
}

// ── SKELETON LOADERS ───────────────────────────────────
function renderSkeletons(count=12){
  const grid=document.getElementById('product-grid');
  if(!grid) return;
  grid.innerHTML=Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton sk-img"></div>
      <div class="sk-body">
        <div class="skeleton sk-line w-40"></div>
        <div class="skeleton sk-line w-80"></div>
        <div class="skeleton sk-line w-60"></div>
        <div class="skeleton sk-line w-40"></div>
      </div>
    </div>`).join('');
}

// ── FILTER / SORT ──────────────────────────────────────
function applyFilters(){
  const {search,categories,brands,minPrice,maxPrice,featured,bestSeller,inStock,onSale,sort}=S.filters;
  const q=search.toLowerCase();
  let f=S.products.filter(p=>{
    const hay=`${p.name} ${p.brand} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase();
    const disc=p.mrp&&p.mrp>p.price;
    return (!q||hay.includes(q))
      &&(!categories.length||categories.includes(p.category))
      &&(!brands.length||brands.includes(p.brand))
      &&(minPrice===null||p.price>=minPrice)
      &&(maxPrice===null||p.price<=maxPrice)
      &&(!featured||p.featured)
      &&(!bestSeller||p.bestSeller)
      &&(!inStock||Number(p.stock||0)>0)
      &&(!onSale||disc);
  });
  if(sort==='price-asc') f.sort((a,b)=>a.price-b.price);
  else if(sort==='price-desc') f.sort((a,b)=>b.price-a.price);
  else if(sort==='rating') f.sort((a,b)=>(b.rating||0)-(a.rating||0));
  else if(sort==='newest') f.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  else if(sort==='discount') f.sort((a,b)=>{ const da=a.mrp>a.price?(a.mrp-a.price)/a.mrp:0; const db=b.mrp>b.price?(b.mrp-b.price)/b.mrp:0; return db-da; });
  else f.sort((a,b)=>(b.soldCount||0)-(a.soldCount||0));
  S.filtered=f; S.page=1;
  renderProducts(); renderActiveChips(); renderResultsCount();
  updateFilterSidebarCounts();
  syncFiltersUI();
}

function renderProducts(){
  const grid=document.getElementById('product-grid');
  const lmw=document.getElementById('load-more-wrap');
  if(!grid) return;
  const end=S.page*S.pageSize;
  const slice=S.filtered.slice(0,end);
  if(!slice.length){
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-ico">🔍</div><p>No products found. Try different filters.</p><button class="btn btn-outline btn-sm" onclick="clearAllFilters()" style="margin-top:.8rem">Clear Filters</button></div>';
    if(lmw) lmw.style.display='none';
    return;
  }
  grid.innerHTML=slice.map(renderProductCard).join('');
  if(lmw) lmw.style.display=S.filtered.length>end?'block':'none';
}

function renderResultsCount(){
  const el=document.getElementById('results-count');
  if(el) el.textContent=`${S.filtered.length} products`;
}

function renderActiveChips(){
  const c=document.getElementById('active-filter-chips');
  if(!c) return;
  const chips=[];
  S.filters.categories.forEach(v=>chips.push([`Category: ${v}`,()=>{ S.filters.categories=S.filters.categories.filter(x=>x!==v); applyFilters(); }]));
  S.filters.brands.forEach(v=>chips.push([`Brand: ${v}`,()=>{ S.filters.brands=S.filters.brands.filter(x=>x!==v); applyFilters(); }]));
  if(S.filters.minPrice!==null) chips.push([`Min: ${Rs(S.filters.minPrice)}`,()=>{ S.filters.minPrice=null; applyFilters(); }]);
  if(S.filters.maxPrice!==null) chips.push([`Max: ${Rs(S.filters.maxPrice)}`,()=>{ S.filters.maxPrice=null; applyFilters(); }]);
  if(S.filters.featured) chips.push(['Featured',()=>{ S.filters.featured=false; applyFilters(); }]);
  if(S.filters.bestSeller) chips.push(['Best Sellers',()=>{ S.filters.bestSeller=false; applyFilters(); }]);
  if(S.filters.inStock) chips.push(['In Stock',()=>{ S.filters.inStock=false; applyFilters(); }]);
  if(S.filters.onSale) chips.push(['On Sale',()=>{ S.filters.onSale=false; applyFilters(); }]);
  c.innerHTML=chips.map(([l],i)=>`<span class="active-chip">${l}<button type="button" data-chip="${i}">✕</button></span>`).join('');
  c.querySelectorAll('[data-chip]').forEach(btn=>{ const idx=Number(btn.dataset.chip); btn.addEventListener('click',chips[idx][1]); });
}

function getCategoryFilterCount(c){
  const {search,brands,minPrice,maxPrice,featured,bestSeller,inStock,onSale}=S.filters;
  const q=search.toLowerCase();
  return S.products.filter(p=>{
    const hay=`${p.name} ${p.brand} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase();
    const disc=p.mrp&&p.mrp>p.price;
    return (!q||hay.includes(q))
      &&(p.category===c)
      &&(!brands.length||brands.includes(p.brand))
      &&(minPrice===null||p.price>=minPrice)
      &&(maxPrice===null||p.price<=maxPrice)
      &&(!featured||p.featured)
      &&(!bestSeller||p.bestSeller)
      &&(!inStock||Number(p.stock||0)>0)
      &&(!onSale||disc);
  }).length;
}

function getBrandFilterCount(b){
  const {search,categories,minPrice,maxPrice,featured,bestSeller,inStock,onSale}=S.filters;
  const q=search.toLowerCase();
  return S.products.filter(p=>{
    const hay=`${p.name} ${p.brand} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase();
    const disc=p.mrp&&p.mrp>p.price;
    return (!q||hay.includes(q))
      &&(!categories.length||categories.includes(p.category))
      &&(p.brand===b)
      &&(minPrice===null||p.price>=minPrice)
      &&(maxPrice===null||p.price<=maxPrice)
      &&(!featured||p.featured)
      &&(!bestSeller||p.bestSeller)
      &&(!inStock||Number(p.stock||0)>0)
      &&(!onSale||disc);
  }).length;
}

function updateFilterSidebarCounts(){
  document.querySelectorAll('[data-count-cat]').forEach(el=>{
    const c=el.dataset.countCat;
    el.textContent=getCategoryFilterCount(c);
  });
  document.querySelectorAll('[data-count-brand]').forEach(el=>{
    const b=el.dataset.countBrand;
    el.textContent=getBrandFilterCount(b);
  });
}

function renderFilterSidebar(){
  const cats=[...new Set(S.products.map(p=>p.category).filter(Boolean))].sort();
  const cEl=document.getElementById('filter-categories');
  if(cEl) cEl.innerHTML=cats.map(c=>{
    const cnt = S.products.filter(p=>p.category===c).length;
    const checked = S.filters.categories.includes(c) ? 'checked' : '';
    return `<label class="filter-option"><input type="checkbox" value="${c}" ${checked}/><span>${c}</span><span class="filter-option-count">${cnt}</span></label>`;
  }).join('');
  // Checkboxes only update pending state — user must click Apply to see results
  // (no applyFilters() called here on change)
}

function updateCategoryCounts(){
  document.querySelectorAll('.cat-card-count').forEach(el => { el.textContent = '0 items'; });
  const counts={};
  S.products.forEach(p=>{ if(p.category) counts[p.category]=(counts[p.category]||0)+1; });
  Object.entries(counts).forEach(([cat,cnt])=>{
    // Try matching via data-cat attribute (use querySelectorAll + text comparison to handle & entities)
    let found = false;
    document.querySelectorAll('.cat-card[data-cat]').forEach(card=>{
      if(card.dataset.cat === cat){
        const countEl = card.querySelector('.cat-card-count');
        if(countEl){ countEl.textContent = `${cnt} item${cnt!==1?'s':''}`; found=true; }
      }
    });
    if(!found){
      // Fallback: try by ID using sanitised category name
      const elId='cnt-'+cat.replace(/[^a-z0-9]/gi,'');
      const el=document.getElementById(elId)||document.getElementById('cnt-'+cat.split(' ')[0]);
      if(el) el.textContent=`${cnt} item${cnt!==1?'s':''}`;
    }
  });
  const statEl=document.getElementById('stat-products');
  if(statEl) statEl.textContent=S.products.length>0?`${S.products.length}+`:'500+';
}

function syncFiltersUI(){
  const cats=S.filters.categories||[];
  const brands=S.filters.brands||[];

  // 1. Sync search input
  const searchInput=document.getElementById('search-input');
  if(searchInput&&searchInput.value!==S.filters.search){
    searchInput.value=S.filters.search||'';
  }

  // search-cat-filter removed from UI — no sync needed

  // 3. Sync header category navigation links
  document.querySelectorAll('.cat-nav-link').forEach(link=>{
    const linkCat=link.dataset.cat||'';
    if(cats.length===1&&cats[0]===linkCat) link.classList.add('active');
    else if(cats.length===0&&linkCat==='') link.classList.add('active');
    else link.classList.remove('active');
  });

  // 4. Sync category checkboxes in sidebar
  const cEl=document.getElementById('filter-categories');
  if(cEl){
    cEl.querySelectorAll('input[type="checkbox"]').forEach(inp=>{
      inp.checked=cats.includes(inp.value);
    });
  }

  // 5. Sync brand checkboxes in sidebar
  const bEl=document.getElementById('filter-brands');
  if(bEl){
    bEl.querySelectorAll('input[type="checkbox"]').forEach(inp=>{
      inp.checked=brands.includes(inp.value);
    });
  }

  // 6. Sync price inputs
  const minPriceInput=document.getElementById('min-price');
  if(minPriceInput) minPriceInput.value=S.filters.minPrice!==null?S.filters.minPrice:'';
  const maxPriceInput=document.getElementById('max-price');
  if(maxPriceInput) maxPriceInput.value=S.filters.maxPrice!==null?S.filters.maxPrice:'';

  // 7. Sync quick filters checkboxes
  const fFeatured=document.getElementById('filter-featured');
  if(fFeatured) fFeatured.checked=!!S.filters.featured;
  const fBestseller=document.getElementById('filter-bestseller');
  if(fBestseller) fBestseller.checked=!!S.filters.bestSeller;
  const fInstock=document.getElementById('filter-instock');
  if(fInstock) fInstock.checked=!!S.filters.inStock;
  const fOnsale=document.getElementById('filter-onsale');
  if(fOnsale) fOnsale.checked=!!S.filters.onSale;

  // 8. Sync sort dropdown
  const sortSelect=document.getElementById('sort-select');
  if(sortSelect) sortSelect.value=S.filters.sort||'popular';
}

function clearAllFilters(){
  S.filters={...S.filters,search:'',categories:[],brands:[],minPrice:null,maxPrice:null,featured:false,bestSeller:false,inStock:false,onSale:false};
  applyFilters();
}


// ── LOAD PRODUCTS ──────────────────────────────────────
async function loadProducts(){
  // 1. Instantly populate state with cached products or fallback demo catalog to render immediately
  const cachedProducts = store.get('cached_products', null);
  if (cachedProducts && cachedProducts.length) {
    S.products = cachedProducts;
  } else if (typeof DEMO_PRODUCTS !== 'undefined' && DEMO_PRODUCTS.length) {
    S.products = DEMO_PRODUCTS;
  }
  
  if (S.products.length) {
    S.filtered = [...S.products];
    updateCategoryCounts();
    renderFilterSidebar();
    applyFilters();
    renderCartDrawer(); renderWishlist(); renderCompareBar(); renderRecentlyViewed();
    initSearchAutocomplete();
  } else {
    renderSkeletons();
  }

  // 2. Background fetch to get fresh product data (prices, stock, etc.) from API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout for background fetch
    const res = await fetch(api('/api/products?limit=500'), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const freshProducts = data.products || [];
    
    if (freshProducts.length) {
      // Save to local storage cache for next instant loads
      store.set('cached_products', freshProducts);
      
      // Compare if key values changed to avoid unnecessary re-rendering flickering
      const currentKeys = JSON.stringify(S.products.map(p => ({ id: p.id, price: p.price, stock: p.stock, images: p.images })));
      const freshKeys = JSON.stringify(freshProducts.map(p => ({ id: p.id, price: p.price, stock: p.stock, images: p.images })));
      
      if (currentKeys !== freshKeys || !S.products.length) {
        S.products = freshProducts;
        S.filtered = [...S.products];
        updateCategoryCounts();
        renderFilterSidebar();
        applyFilters();
        renderCartDrawer(); renderWishlist(); renderCompareBar(); renderRecentlyViewed();
      }
      loadReviews();
      initSearchAutocomplete();
    }
  } catch (err) {
    console.warn("Background products update failed or timed out:", err);
    // Fallback if we somehow have no products loaded yet
    if (!S.products.length) {
      S.products = typeof DEMO_PRODUCTS !== 'undefined' ? DEMO_PRODUCTS : [];
      if (S.products.length) {
        S.filtered = [...S.products];
        updateCategoryCounts();
        renderFilterSidebar();
        applyFilters();
        renderCartDrawer(); renderWishlist(); renderCompareBar(); renderRecentlyViewed();
        initSearchAutocomplete();
      } else {
        const g = document.getElementById('product-grid');
        if (g) g.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-ico">⚠️</div><p>Could not load products. Backend may be starting up — please refresh in a moment.</p></div>';
      }
    }
  }
}

function initSearchAutocomplete() {
  const si = document.getElementById('search-input');
  const sa = document.getElementById('search-autocomplete');
  if (!si || !sa) return;
  if (si.dataset.searchAutocompleted === "true") return;
  si.dataset.searchAutocompleted = "true";

  let searchTimer;
  si.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim().toLowerCase();
    if (!q) {
      sa.innerHTML = '';
      sa.classList.remove('active');
      return;
    }

    searchTimer = setTimeout(() => {
      // Find matching products locally
      const matches = S.products.filter(p => 
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q)))
      ).slice(0, 5);

      if (matches.length === 0) {
        sa.innerHTML = '<div style="padding:1rem;color:var(--muted);font-size:0.85rem;text-align:center">No matches found</div>';
      } else {
        sa.innerHTML = matches.map(p => {
          const img = (p.images && p.images[0]) || PLACEHOLDER;
          return `
            <div class="autocomplete-item" data-id="${p.id}">
              <img src="${img}" alt="${p.name}" style="width:40px;height:40px;object-fit:contain;border-radius:var(--radius-sm);background:var(--panel)" />
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:0.85rem;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
                <div style="font-size:0.72rem;color:var(--muted)">${p.brand || ''} · ${p.category || ''}</div>
              </div>
              <div style="font-weight:700;font-size:0.85rem;color:var(--primary)">${Rs(p.price)}</div>
            </div>
          `;
        }).join('');
      }
      sa.classList.add('active');
    }, 150);
  });

  // Handle item click
  sa.addEventListener('click', e => {
    const item = e.target.closest('.autocomplete-item');
    if (item) {
      const id = item.dataset.id;
      window.location.href = `product.html?id=${id}`;
    }
  });

  // Hide when clicking outside
  document.addEventListener('click', e => {
    if (!si.contains(e.target) && !sa.contains(e.target)) {
      sa.classList.remove('active');
    }
  });

  // Show when focused and has text
  si.addEventListener('focus', () => {
    if (si.value.trim()) {
      sa.classList.add('active');
    }
  });
}

// ── SHOP PAGE ──────────────────────────────────────────
function initShop(){
  const si=document.getElementById('search-input');
  const sb=document.getElementById('search-btn');
  const ss=document.getElementById('sort-select');
  const mnp=document.getElementById('min-price');
  const mxp=document.getElementById('max-price');
  const ap=document.getElementById('apply-price');
  const lm=document.getElementById('load-more');
  const cf=document.getElementById('clear-filters');
  const ft=document.getElementById('filter-toggle');
  const fp=document.getElementById('filters-panel');
  const fo=document.getElementById('filter-overlay');

  let searchTimer;
  si?.addEventListener('input',e=>{ clearTimeout(searchTimer); searchTimer=setTimeout(()=>{ S.filters.search=e.target.value; applyFilters(); },300); });
  sb?.addEventListener('click',()=>{ S.filters.search=si?.value||''; applyFilters(); });
  si?.addEventListener('keydown',e=>{ if(e.key==='Enter'){ S.filters.search=e.target.value; applyFilters(); }});
  ss?.addEventListener('change',e=>{ S.filters.sort=e.target.value; applyFilters(); });
  ap?.addEventListener('click',()=>{ S.filters.minPrice=mnp?.value?Number(mnp.value):null; S.filters.maxPrice=mxp?.value?Number(mxp.value):null; applyFilters(); });
  lm?.addEventListener('click',()=>{ S.page++; renderProducts(); });
  cf?.addEventListener('click',clearAllFilters);

  // search-cat-filter removed — category filtering done via filter panel or cat cards only

  // Apply Filters button — reads checked boxes, updates S.filters, applies, closes panel on mobile
  document.getElementById('apply-filters')?.addEventListener('click', () => {
    const checkedCats = [...document.querySelectorAll('#filter-categories input:checked')].map(i=>i.value);
    S.filters.categories = checkedCats;
    applyFilters();
    // Close mobile panel
    fp?.classList.remove('mobile-open');
    if(fo) fo.style.display='none';
    // Scroll to products
    document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  });

  // Mobile filter toggle
  ft?.addEventListener('click',()=>{ fp?.classList.toggle('mobile-open'); if(fo) fo.style.display=fp?.classList.contains('mobile-open')?'block':'none'; });
  fo?.addEventListener('click',()=>{ fp?.classList.remove('mobile-open'); if(fo) fo.style.display='none'; });
  if(window.innerWidth<=1024&&ft) ft.style.display='inline-flex';

  // Category nav links
  document.querySelectorAll('.cat-nav-link').forEach(link=>{
    link.addEventListener('click',e=>{
      e.preventDefault();
      const cat=link.dataset.cat||'';
      if (!document.getElementById('shop')) {
        window.location.href = `index.html?category=${encodeURIComponent(cat)}`;
        return;
      }
      S.filters.categories=cat?[cat]:[];
      document.querySelectorAll('.cat-nav-link').forEach(l=>l.classList.remove('active'));
      link.classList.add('active');
      applyFilters();
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
    });
  });

  // Category cards on homepage
  document.querySelectorAll('.cat-card[data-cat]').forEach(card=>{
    card.addEventListener('click',()=>{
      const cat=card.dataset.cat;
      if (!document.getElementById('shop')) {
        window.location.href = `index.html?category=${encodeURIComponent(cat)}`;
        return;
      }
      S.filters.categories=[cat];
      applyFilters();
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
    });
  });

  // Footer category links
  document.querySelectorAll('[data-nav-cat]').forEach(a=>{
    a.addEventListener('click',e=>{
      e.preventDefault();
      const cat=a.dataset.navCat;
      if (!document.getElementById('shop')) {
        window.location.href = `index.html?category=${encodeURIComponent(cat)}`;
        return;
      }
      S.filters.categories=[cat];
      applyFilters();
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
    });
  });

  // View toggle
  document.getElementById('view-grid')?.addEventListener('click',()=>{ document.getElementById('product-grid')?.classList.remove('list-view'); document.getElementById('view-grid')?.classList.add('active'); document.getElementById('view-list')?.classList.remove('active'); });
  document.getElementById('view-list')?.addEventListener('click',()=>{ document.getElementById('product-grid')?.classList.add('list-view'); document.getElementById('view-list')?.classList.add('active'); document.getElementById('view-grid')?.classList.remove('active'); });

  // Quick filters
  ['featured','bestseller','instock','onsale'].forEach(id=>{
    document.getElementById(`filter-${id}`)?.addEventListener('change',e=>{
      const map={featured:'featured',bestseller:'bestSeller',instock:'inStock',onsale:'onSale'};
      S.filters[map[id]]=e.target.checked;
      applyFilters();
    });
  });

  // Filter group collapse
  document.querySelectorAll('.filter-group-title').forEach(title=>{
    title.addEventListener('click',()=>{ title.closest('.filter-group')?.classList.toggle('collapsed'); });
  });

  // Product grid actions (event delegation)
  document.getElementById('product-grid')?.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    const card=e.target.closest('.product-card');
    if(!action||!card) return;
    const id=card.dataset.id;
    if(action==='add') addToCart(id);
    else if(action==='wish') toggleWish(id);
    else if(action==='compare') toggleCompare(id);
  });

  // FAQ accordions
  document.querySelectorAll('.faq-question').forEach(q=>{
    q.addEventListener('click',()=>{ const item=q.closest('.faq-item'); const wasOpen=item.classList.contains('open'); document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open')); if(!wasOpen) item.classList.add('open'); });
  });

  // Hero CTA
  document.getElementById('hero-cta')?.addEventListener('click',()=>{ const wa=waUrl(S.settings.shopInfo?.whatsapp||'919475653294','Hi! I need a quote for Steel + Cement combo. Please share details.'); window.open(wa,'_blank','noopener'); });

  // Write review btn
  document.getElementById('write-review-btn')?.addEventListener('click',()=>{ const f=document.getElementById('review-form-wrap'); if(f){ f.style.display=f.style.display==='none'?'block':'none'; } });

  // Review form
  document.getElementById('review-form')?.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(e.target);
    const msg=document.getElementById('review-msg');
    try{
      const res=await fetch(api('/api/reviews'),{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:fd.get('name'),rating:Number(fd.get('rating')),comment:fd.get('comment')}) });
      if(res.ok){ toast('Review submitted! Thank you.','success'); e.target.reset(); document.getElementById('review-form-wrap').style.display='none'; loadReviews(); }
      else{ toast('Failed to submit review.','error'); }
    }catch{ toast('Network error.','error'); }
  });
}

// ── REVIEWS ────────────────────────────────────────────
async function loadReviews(){
  const grid=document.getElementById('reviews-grid');
  if(!grid) return;
  try{
    const res=await fetch(api('/api/reviews'));
    const {reviews=[]}=await res.json();
    if(!reviews.length){ grid.innerHTML='<p style="color:var(--muted);font-size:.9rem">No reviews yet. Be the first to review!</p>'; return; }
    grid.innerHTML=reviews.slice(0,6).map(r=>`
      <div class="review-card">
        <div class="review-top"><span class="reviewer-name">${r.name}</span><span class="review-date">${r.createdAt?new Date(r.createdAt).toLocaleDateString('en-IN'):''}</span></div>
        <div class="review-stars">${'⭐'.repeat(r.rating||0)}</div>
        <p class="review-text">${r.comment}</p>
      </div>`).join('');
  }catch{}
}

// ── PRODUCT DETAIL PAGE ────────────────────────────────
async function initProductPage(){
  const id=new URLSearchParams(location.search).get('id');
  const layout=document.getElementById('product-detail-layout');
  if(!id||!layout) return;

  // 1. Optimistic Render from Local Cache / Demo Products
  let localP = null;
  
  if (S.products && S.products.length) {
    localP = S.products.find(x => x.id === id);
  }
  
  if (!localP) {
    const cachedProducts = store.get('cached_products', null);
    if (cachedProducts && cachedProducts.length) {
      localP = cachedProducts.find(x => x.id === id);
    }
  }
  
  if (!localP && typeof DEMO_PRODUCTS !== 'undefined' && DEMO_PRODUCTS.length) {
    localP = DEMO_PRODUCTS.find(x => x.id === id);
  }

  if (localP) {
    renderProductPageUI(localP);
  }

  // 2. Fetch fresh details from API in the background
  try {
    const res = await fetch(api(`/api/products/${id}`));
    if (res.ok) {
      const freshP = await res.json();
      
      const renderNeeded = !localP || 
                           localP.price !== freshP.price || 
                           localP.stock !== freshP.stock || 
                           JSON.stringify(localP.variants) !== JSON.stringify(freshP.variants) ||
                           JSON.stringify(localP.images) !== JSON.stringify(freshP.images);
      
      if (renderNeeded) {
        renderProductPageUI(freshP);
      }
    } else if (!localP) {
      layout.innerHTML = '<div class="empty-state"><div class="empty-ico">❌</div><p>Product not found.</p><a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Back to Shop</a></div>';
    }
  } catch (err) {
    console.warn("Background product fetch failed:", err);
    if (!localP) {
      layout.innerHTML = '<div class="empty-state"><div class="empty-ico">⚠️</div><p>Error loading product. Please check your connection.</p><a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Back to Shop</a></div>';
    }
  }
}

function renderProductPageUI(p) {
  const layout = document.getElementById('product-detail-layout');
  if (!layout) return;
  
  document.title = `${p.name} | Mahamaya Enterprise`;
  
  // Dynamic Product JSON-LD Schema
  let schemaScript = document.getElementById('product-schema');
  if (!schemaScript) {
    schemaScript = document.createElement('script');
    schemaScript.id = 'product-schema';
    schemaScript.type = 'application/ld+json';
    document.head.appendChild(schemaScript);
  }
  
  const imgs = p.images && p.images.length ? p.images : [PLACEHOLDER];
  const inStock = Number(p.stock || 0) > 0;
  
  const productSchema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": p.name,
    "image": imgs.map(img => img.startsWith('http') ? img : window.location.origin + (img.startsWith('/') ? img : '/' + img)),
    "description": p.longDesc || p.shortDesc || `${p.name} - High-quality ${p.category} supply from ${p.brand || 'Mahamaya Enterprise'}. Available at Mahamaya Enterprise, Bhatar, Purba Bardhaman.`,
    "brand": {
      "@type": "Brand",
      "name": p.brand || "Generic"
    },
    "category": p.category,
    "offers": {
      "@type": "Offer",
      "url": window.location.href,
      "priceCurrency": "INR",
      "price": p.price,
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Store",
        "name": "Mahamaya Enterprise"
      }
    }
  };
  
  if (p.rating) {
    productSchema.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": p.rating,
      "reviewCount": p.ratingCount || 10
    };
  }
  
  schemaScript.textContent = JSON.stringify(productSchema, null, 2);

  // Set meta description dynamically
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.name = 'description';
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = p.shortDesc ? p.shortDesc.slice(0, 160) : `Buy ${p.name} online from Mahamaya Enterprise, Bhatar, Bardhaman. Category: ${p.category}. Brand: ${p.brand || 'Local'}. Best price & local delivery.`;

  addRecentlyViewed(p.id);
  
  const lowStock = inStock && Number(p.stock) <= 5;
  
  let initialPrice = p.price;
  let initialMrp = p.mrp || p.price;
  let initialVariant = '';
  
  let variantSelectHtml = '';
  if (p.variants && p.variants.length > 0) {
    initialVariant = p.variants[0].value;
    initialPrice = p.variants[0].price;
    initialMrp = p.variants[0].mrp || p.variants[0].price;
    
    variantSelectHtml = `
      <div style="margin: 1.2rem 0 0.8rem 0">
        <label class="qty-label" style="display:block;margin-bottom:0.4rem">Select Option:</label>
        <select class="variant-select" id="detail-variant-select" style="max-width:320px;padding:0.6rem;border-radius:var(--radius-md);border:1px solid var(--edge);background:var(--card);color:var(--text);font-weight:500">
          ${p.variants.map(v => `<option value="${v.value}" data-price="${v.price}" data-mrp="${v.mrp || v.price}">${v.value} — ${Rs(v.price)}</option>`).join('')}
        </select>
      </div>
    `;
  }
  
  const disc = initialMrp > initialPrice ? Math.round((initialMrp - initialPrice) / initialMrp * 100) : 0;
  
  document.getElementById('bc-category').textContent = p.category || 'Products';
  document.getElementById('bc-category').href = `index.html#shop`;
  document.getElementById('bc-name').textContent = p.name;

  const minQty = typeof p.minQty === 'number' ? p.minQty : 1;
  const qtyStep = typeof p.qtyStep === 'number' ? p.qtyStep : 1;
  const stock = typeof p.stock === 'number' ? p.stock : 999999;

  layout.innerHTML = `
    <div class="gallery-wrap">
      <div class="gallery-main"><img id="gallery-img" src="${imgs[0]}" alt="${p.name}"/></div>
      ${imgs.length > 1 ? `<div class="gallery-thumbs">${imgs.map((img, i) => `<div class="gallery-thumb${i === 0 ? ' active' : ''}" data-img="${img}"><img src="${img}" alt="View ${i+1}"/></div>`).join('')}</div>` : ''}
    </div>
    <div class="detail-info">
      <div class="detail-brand">${p.brand || ''}</div>
      <h1 class="detail-name">${p.name}</h1>
      ${p.sku ? `<div class="detail-sku">SKU: ${p.sku}</div>` : ''}
      <div class="detail-rating"><span style="color:#f59e0b">${'⭐'.repeat(Math.round(p.rating || 0))}</span><span style="color:var(--muted);font-size:.85rem">${p.rating || 0} (${p.ratingCount || 0} reviews)</span></div>
      <div class="detail-price-box">
        <div style="display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap">
          <span class="detail-price" id="detail-price-span">${Rs(initialPrice)}</span>
          <span class="detail-mrp" id="detail-mrp-span" style="display:${disc > 0 ? 'inline' : 'none'}">${Rs(initialMrp)}</span>
          <span class="detail-off" id="detail-off-span" style="display:${disc > 0 ? 'inline' : 'none'}">-${disc}% OFF</span>
        </div>
        <div class="detail-stock ${inStock ? (lowStock ? 'low-stock' : 'in-stock') : 'out-stock'}" style="margin-top:.5rem">
          ${inStock ? (lowStock ? `⚠ Only ${p.stock} left in stock!` : `✓ In Stock (${p.stock} units)`) : '✕ Out of Stock'}
        </div>
      </div>
      ${p.shortDesc ? `<p style="font-size:.9rem;color:var(--muted);line-height:1.7">${p.shortDesc}</p>` : ''}
      
      ${variantSelectHtml}
      
      <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin: 1.2rem 0">
        <span class="qty-label">Qty:</span>
        <div class="qty-stepper">
          <button class="qty-step-btn" id="qty-dec">−</button>
          <span class="qty-step-val" id="qty-val">${minQty}</span>
          <button class="qty-step-btn" id="qty-inc">+</button>
        </div>
        <span style="font-size:0.8rem;color:var(--muted)">Min: ${minQty}, Step: ${qtyStep}</span>
      </div>
      <div class="detail-actions">
        <button class="btn btn-primary btn-lg" id="detail-add" ${inStock ? '' : 'disabled'}>${inStock ? '🛒 Add to Cart' : 'Out of Stock'}</button>
        <button class="btn btn-outline btn-lg" id="detail-wish">♥ Wishlist</button>
        <a id="detail-wa-btn" href="${waUrl(S.settings.shopInfo?.whatsapp || '919475653294', `Hi! I want to enquire about: ${p.name}${initialVariant ? ` (${initialVariant})` : ''} - Price: ${Rs(initialPrice)}. Please share availability and bulk pricing.`)}" target="_blank" rel="noopener" class="btn btn-lg" style="background:#25D366;color:#fff;border-color:#25D366">💬 WhatsApp Enquiry</a>
      </div>
      <div class="detail-tabs">
        <div class="tab-nav">
          <button class="tab-btn active" data-tab="desc">Description</button>
          ${p.sku ? '<button class="tab-btn" data-tab="specs">Specifications</button>' : ''}
        </div>
        <div class="tab-content active" data-tab-content="desc"><p style="font-size:.9rem;color:var(--muted);line-height:1.8">${p.longDesc || p.shortDesc || 'No description available.'}</p></div>
        ${p.sku ? `<div class="tab-content" data-tab-content="specs"><table class="spec-table"><tr><td>SKU</td><td>${p.sku}</td></tr><tr><td>Brand</td><td>${p.brand || '—'}</td></tr><tr><td>Category</td><td>${p.category || '—'}</td></tr><tr><td>Tags</td><td>${(p.tags || []).join(', ') || '—'}</td></tr></table></div>` : ''}
      </div>
    </div>`;

  // Gallery thumbs interaction
  document.querySelectorAll('.gallery-thumb').forEach(th => {
    th.addEventListener('click', () => {
      document.getElementById('gallery-img').src = th.dataset.img;
      document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      th.classList.add('active');
    });
  });

  let qty = minQty;
  let selectedVariant = initialVariant;
  
  const detailPriceSpan = document.getElementById('detail-price-span');
  const detailMrpSpan = document.getElementById('detail-mrp-span');
  const detailOffSpan = document.getElementById('detail-off-span');
  const variantSelect = document.getElementById('detail-variant-select');
  const waBtn = document.getElementById('detail-wa-btn');

  if (variantSelect) {
    variantSelect.addEventListener('change', e => {
      selectedVariant = e.target.value;
      const opt = e.target.options[e.target.selectedIndex];
      const pr = Number(opt.dataset.price);
      const mr = Number(opt.dataset.mrp);
      
      detailPriceSpan.textContent = Rs(pr);
      if (mr > pr) {
        detailMrpSpan.textContent = Rs(mr);
        detailMrpSpan.style.display = 'inline';
        const discPct = Math.round((mr - pr) / mr * 100);
        detailOffSpan.textContent = `-${discPct}% OFF`;
        detailOffSpan.style.display = 'inline';
      } else {
        detailMrpSpan.style.display = 'none';
        detailOffSpan.style.display = 'none';
      }
      
      if (waBtn) {
        waBtn.href = waUrl(S.settings.shopInfo?.whatsapp || '919475653294', `Hi! I want to enquire about: ${p.name} (${selectedVariant}) - Price: ${Rs(pr)}. Please share availability and bulk pricing.`);
      }
    });
  }

  // Qty stepper events
  document.getElementById('qty-dec')?.addEventListener('click', () => {
    qty = Math.max(minQty, qty - qtyStep);
    document.getElementById('qty-val').textContent = qty;
  });
  document.getElementById('qty-inc')?.addEventListener('click', () => {
    qty = Math.min(stock, qty + qtyStep);
    document.getElementById('qty-val').textContent = qty;
  });
  
  // Add to cart / wishlist
  document.getElementById('detail-add')?.addEventListener('click', () => addToCart(p.id, qty, null, selectedVariant));
  document.getElementById('detail-wish')?.addEventListener('click', () => toggleWish(p.id));

  // Specs tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`[data-tab-content="${btn.dataset.tab}"]`)?.classList.add('active');
    });
  });

  // Load related products
  const rg = document.getElementById('related-grid');
  const rs = document.getElementById('related-section');
  if (rg && rs) {
    const related = S.products.filter(x => x.id !== p.id && x.category === p.category).slice(0, 4);
    if (related.length) {
      rs.style.display = 'block';
      rg.innerHTML = related.map(renderProductCard).join('');
      // Set up click delegator
      rg.addEventListener('click', e => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        const card = e.target.closest('.product-card');
        if (!action || !card) return;
        if (action === 'add') addToCart(card.dataset.id);
        else if (action === 'wish') toggleWish(card.dataset.id);
      });
    } else {
      rs.style.display = 'none';
    }
  }
}


// ── CHECKOUT PAGE ──────────────────────────────────────
async function initCheckout(){
  const form=document.getElementById('order-form');
  const itemsEl=document.getElementById('checkout-items');
  if(!form||!itemsEl) return;
  const cart=getCart();
  if(!cart.length){ itemsEl.innerHTML='<div class="empty-state"><div class="empty-ico">🛒</div><p>Your cart is empty.</p><a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Browse Products</a></div>'; document.getElementById('place-order-btn').disabled=true; return; }

  let subtotal=0, discount=0;
  const itemsHtml=cart.map(i=>{
    const p=S.products.find(x=>x.id===i.productId)||{};
    let price = p.price || 0;
    if (i.variant && p.variants) {
      const v = p.variants.find(x => x.value === i.variant);
      if (v) price = v.price;
    }
    const line=price*i.qty;
    subtotal+=line;
    const img=(p.images&&p.images[0])||PLACEHOLDER;
    const displayName = p.name ? `${p.name}${i.variant ? ` (${i.variant})` : ''}` : 'Item';
    return `<div class="summary-item"><img class="summary-item-img" src="${img}" alt="${displayName}"/><div class="summary-item-info"><div class="summary-item-name">${displayName}</div><div class="summary-item-qty">Qty: ${i.qty}</div></div><div class="summary-item-price">${Rs(line)}</div></div>`;
  }).join('');
  itemsEl.innerHTML=itemsHtml;

  const ship=S.settings.shipping||{};
  const fee=ship.freeAbove>0&&subtotal>=ship.freeAbove?0:(ship.fee||0);
  const updateTotals=()=>{
    document.getElementById('checkout-subtotal').textContent=Rs(subtotal);
    document.getElementById('checkout-delivery').textContent=fee>0?Rs(fee):'FREE';
    const dr=document.getElementById('checkout-discount-row');
    if(discount>0&&dr){ dr.style.display='flex'; document.getElementById('checkout-discount').textContent=`-${Rs(discount)}`; }
    document.getElementById('checkout-total').textContent=Rs(subtotal+fee-discount);
    const note=document.getElementById('checkout-delivery-note');
    if(note&&ship.freeAbove>0&&subtotal<ship.freeAbove) note.textContent=`🎁 Add ${Rs(ship.freeAbove-subtotal)} more for free delivery!`;
    else if(note&&fee===0) note.textContent='🎉 You qualify for free delivery!';
  };
  updateTotals();

  // Auto-fill if logged in
  const token=store.get('userToken','');
  if(token){ try{ const me=await fetch(api('/api/auth/me'),{headers:{Authorization:`Bearer ${token}`}}); if(me.ok){ const u=await me.json(); form.name.value=u.name||''; form.email.value=u.email||''; form.phone.value=u.phone||''; } }catch{} }

  // Coupon
  document.getElementById('apply-coupon')?.addEventListener('click',async()=>{
    const code=document.getElementById('coupon-input')?.value?.trim().toUpperCase();
    const msg=document.getElementById('coupon-msg');
    if(!code){ toast('Enter a coupon code','warning'); return; }
    try{
      const res=await fetch(api('/api/coupons/validate'),{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code,subtotal}) });
      if(res.ok){ const d=await res.json(); discount=d.discount||0; if(msg){ msg.style.display='block'; msg.style.color='var(--success)'; msg.textContent=`✅ Coupon applied! You save ${Rs(discount)}`; } updateTotals(); toast(`Coupon applied! Save ${Rs(discount)}`,'success'); }
      else{ const e=await res.json(); if(msg){ msg.style.display='block'; msg.style.color='var(--danger)'; msg.textContent=e.error||'Invalid coupon'; } toast('Invalid coupon code','error'); discount=0; updateTotals(); }
    }catch{ toast('Could not validate coupon','error'); }
  });

  // Form submit
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const btn=document.getElementById('place-order-btn');
    btn.disabled=true; btn.textContent='Placing order...';
    const payment=document.querySelector('input[name=payment]:checked')?.value||'cod';
    const payload={ items:cart.map(i=>({productId:i.productId,variant:i.variant||null,qty:i.qty})), deliveryFee:fee, discount, paymentMethod:payment, couponCode:document.getElementById('coupon-input')?.value?.trim().toUpperCase()||'', customer:{ name:form.name.value, phone:form.phone.value, email:form.email.value, address:form.address.value, city:form.city.value, state:form.state.value, pincode:form.pincode.value, notes:form.notes.value } };
    try{
      const res=await fetch(api('/api/orders'),{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      if(res.ok){
        const order=await res.json();
        setCart([]);
        document.getElementById('success-order-no').textContent=`Order No: ${order.orderNo}`;
        const wa=waUrl(S.settings.shopInfo?.whatsapp||'919475653294',`Hi! I placed Order ${order.orderNo} on Mahamaya Enterprise. Please confirm.`);
        document.getElementById('success-wa-btn').href=wa;
        document.getElementById('order-success-modal')?.classList.add('show');
        document.getElementById('overlay')?.classList.add('show');
      } else {
        const err=await res.json();
        const msg=document.getElementById('order-message');
        if(msg){ msg.style.display='block'; msg.className='form-message error'; msg.textContent=err.error||'Failed to place order.'; }
        toast(err.error||'Order failed','error');
        btn.disabled=false; btn.textContent='🛒 Place Order';
      }
    }catch{ toast('Network error. Please try again.','error'); btn.disabled=false; btn.textContent='🛒 Place Order'; }
  });
}

// ── TRACK PAGE ─────────────────────────────────────────
function initTrack(){
  const form=document.getElementById('track-form');
  const result=document.getElementById('track-result');
  if(!form||!result) return;
  const params=new URLSearchParams(location.search);
  if(params.get('order')) form.querySelector('[name=orderNo]').value=params.get('order');

  const statusSteps=['new','confirmed','packed','dispatched','delivered'];
  const statusLabels={new:'Order Placed',confirmed:'Order Confirmed',packed:'Packed & Ready',dispatched:'Out for Delivery',delivered:'Delivered'};
  const statusIcos={new:'📋',confirmed:'✅',packed:'📦',dispatched:'🚚',delivered:'🎉'};

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    result.innerHTML='<div class="empty-state"><div class="spinner"></div><p style="margin-top:.8rem">Checking order status...</p></div>';
    try{
      const res=await fetch(api('/api/orders/track'),{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({orderNo:fd.get('orderNo'),phone:fd.get('phone')}) });
      if(!res.ok){ result.innerHTML='<div class="empty-state"><div class="empty-ico">❌</div><p>Order not found. Please check the order number and phone number.</p></div>'; return; }
      const o=await res.json();
      const curIdx=statusSteps.indexOf(o.status);
      const timeline=statusSteps.map((s,i)=>`
        <div class="timeline-step ${i<=curIdx?'done':''} ${i===curIdx?'current':''}">
          <div class="timeline-dot">${i<=curIdx?statusIcos[s]:'○'}</div>
          <div class="timeline-info"><div class="timeline-label">${statusLabels[s]||s}</div>${i===curIdx?`<div class="timeline-time">${o.updatedAt?new Date(o.updatedAt).toLocaleString('en-IN'):'Current status'}</div>`:''}</div>
        </div>`).join('');
      const items=(o.items||[]).map(i=>`<tr><td>${i.name}</td><td>${i.qty}</td><td>${Rs(i.price)}</td><td>${Rs(i.lineTotal)}</td></tr>`).join('');
      result.innerHTML=`
        <div style="margin-bottom:1.2rem">
          <div style="display:flex;align-items:center;gap.6rem;gap:.6rem;margin-bottom.5rem;margin-bottom:.5rem">
            <strong>${o.orderNo}</strong>
            <span class="status-pill ${o.status}">${o.status}</span>
          </div>
          <div style="font-size:.82rem;color:var(--muted)">Ordered: ${o.createdAt?new Date(o.createdAt).toLocaleString('en-IN'):''}</div>
          <div style="font-size:.82rem;color:var(--muted)">Deliver to: ${o.customer?.name||''}, ${o.customer?.city||''} – ${o.customer?.pincode||''}</div>
        </div>
        <div class="track-timeline">${timeline}</div>
        <div class="admin-table-wrap" style="margin-top:1.2rem">
          <table class="admin-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
        </div>
        <div style="margin-top:.8rem;display:flex;flex-direction:column;gap:.3rem">
          <div class="summary-line"><span>Subtotal</span><span>${Rs(o.subtotal)}</span></div>
          <div class="summary-line"><span>Delivery</span><span>${Rs(o.deliveryFee)}</span></div>
          ${o.discount?`<div class="summary-line" style="color:var(--success)"><span>Discount</span><span>-${Rs(o.discount)}</span></div>`:''}
          <div class="summary-line bold" style="font-weight:800;border-top:2px solid var(--edge);padding-top:.5rem"><span>Total</span><span>${Rs(o.total)}</span></div>
        </div>`;
    }catch{ result.innerHTML='<div class="empty-state"><div class="empty-ico">⚠️</div><p>Network error. Please try again.</p></div>'; }
  });
}

// ── ACCOUNT PAGE ────────────────────────────────────────
function initAccount(){
  // Tab switching
  document.querySelectorAll('.account-nav-link[data-tab]').forEach(link=>{
    link.addEventListener('click',()=>{
      document.querySelectorAll('.account-nav-link').forEach(l=>l.classList.remove('active'));
      document.querySelectorAll('.account-tab').forEach(t=>t.classList.remove('active'));
      link.classList.add('active');
      document.getElementById(`tab-${link.dataset.tab}`)?.classList.add('active');
    });
  });

  const token=store.get('userToken','');
  if(token){
    fetch(api('/api/auth/me'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(u=>{
      // Populate profile fields
      const name=u.name||''; const email=u.email||''; const phone=u.phone||'';
      document.getElementById('acc-name')&&(document.getElementById('acc-name').textContent=name);
      document.getElementById('acc-email')&&(document.getElementById('acc-email').textContent=email);
      document.getElementById('acc-phone')&&(document.getElementById('acc-phone').textContent=phone?`📱 ${phone}`:'');
      // Sidebar nav
      document.getElementById('acc-nav-name')&&(document.getElementById('acc-nav-name').textContent=name);
      document.getElementById('acc-nav-email')&&(document.getElementById('acc-nav-email').textContent=email);
      // Avatar initials
      const initials=(name||'U').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      document.getElementById('acc-avatar')&&(document.getElementById('acc-avatar').textContent=initials);
      document.getElementById('acc-avatar-sm')&&(document.getElementById('acc-avatar-sm').textContent=initials);
      // Stats
      document.getElementById('stat-wishlist')&&(document.getElementById('stat-wishlist').textContent=getWish().length);
      // Show logged in
      document.getElementById('logged-out-view')&&(document.getElementById('logged-out-view').style.display='none');
      document.getElementById('logged-in-view')&&(document.getElementById('logged-in-view').style.display='block');
      // Load wishlist for tab
      const wGrid=document.getElementById('acc-wishlist-grid');
      if(wGrid){ const wl=getWish(); const items=wl.map(id=>S.products.find(p=>p.id===id)).filter(Boolean); wGrid.innerHTML=items.length?items.map(renderProductCard).join(''):"<div class='empty-state'><div class='empty-ico'>♥</div><p>No items in wishlist</p></div>"; }
      // Load orders
      fetch(api('/api/orders'),{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()).then(data=>{
        const orders=data.orders||data||[]; 
        document.getElementById('stat-orders')&&(document.getElementById('stat-orders').textContent=orders.length||0);
        if(orders.length) renderAccountOrders(orders);
      }).catch(()=>{});
    }).catch(()=>showLoggedOut());
  } else showLoggedOut();

  function showLoggedOut(){
    document.getElementById('logged-out-view')&&(document.getElementById('logged-out-view').style.display='flex');
    document.getElementById('logged-in-view')&&(document.getElementById('logged-in-view').style.display='none');
  }

  document.getElementById('login-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    const btn=e.target.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='Signing in...';
    try{
      const res=await fetch(api('/api/auth/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})});
      if(res.ok){ const d=await res.json(); store.set('userToken',d.token); toast('Signed in successfully!','success'); location.reload(); }
      else{ toast('Invalid email or password','error'); btn.disabled=false; btn.textContent='Sign In →'; }
    }catch{ toast('Network error','error'); btn.disabled=false; btn.textContent='Sign In →'; }
  });

  document.getElementById('signup-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    if(fd.get('password')!==fd.get('confirmPassword')){ toast('Passwords do not match','error'); return; }
    const btn=e.target.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='Creating account...';
    try{
      const res=await fetch(api('/api/auth/signup'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),password:fd.get('password')})});
      if(res.ok){ const d=await res.json(); store.set('userToken',d.token); toast('Account created successfully!','success'); location.reload(); }
      else{ const err=await res.json(); toast(err.error||'Signup failed','error'); btn.disabled=false; btn.textContent='Create Account →'; }
    }catch{ toast('Network error','error'); btn.disabled=false; btn.textContent='Create Account →'; }
  });

  document.getElementById('logout-btn')?.addEventListener('click',()=>{ store.set('userToken',''); toast('Signed out','info'); location.reload(); });
}

function renderAccountOrders(orders){
  const el=document.getElementById('my-orders-list');
  if(!el||!orders.length) return;
  el.innerHTML=orders.map(o=>{
    const status=(o.status||'processing').toLowerCase();
    const date=o.createdAt?new Date(o.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';
    const total=o.total||o.amount||0;
    return `<div class="order-card">
      <div class="order-card-header">
        <span class="order-id">#${o.id||o.orderId||'ORD-'+Math.random().toString(36).slice(2,8).toUpperCase()}</span>
        <span class="order-status ${status}">${status.charAt(0).toUpperCase()+status.slice(1)}</span>
      </div>
      <div class="order-meta">
        <span>📅 ${date}</span>
        <span>💰 Rs. ${Number(total).toLocaleString('en-IN')}</span>
        ${o.items?.length?`<span>🛒 ${o.items.length} item${o.items.length>1?'s':''}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

// ── GLOBAL EVENT BINDINGS ──────────────────────────────
function bindGlobal(){
  document.getElementById('cart-btn')?.addEventListener('click',()=>openDrawer('cart-drawer'));
  document.getElementById('wishlist-btn')?.addEventListener('click',()=>openDrawer('wishlist-drawer'));
  
  // Mobile bottom nav bindings
  document.getElementById('mob-nav-cart')?.addEventListener('click', (e) => { e.preventDefault(); openDrawer('cart-drawer'); });
  document.getElementById('mob-nav-wishlist')?.addEventListener('click', (e) => { e.preventDefault(); openDrawer('wishlist-drawer'); });
  document.getElementById('mob-nav-shop')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (document.body.dataset.page === 'shop') {
      document.getElementById('filter-toggle')?.click();
    } else {
      window.location.href = 'index.html#shop';
    }
  });

  document.getElementById('close-cart')?.addEventListener('click',closeDrawers);
  document.getElementById('close-wishlist')?.addEventListener('click',closeDrawers);
  document.getElementById('close-quickview')?.addEventListener('click',closeDrawers);
  document.getElementById('close-compare')?.addEventListener('click',()=>closeDrawers());
  document.getElementById('compare-btn')?.addEventListener('click',renderCompareModal);
  document.getElementById('clear-compare-btn')?.addEventListener('click',()=>{ store.set('compare',[]); renderCompareBar(); });
  document.getElementById('overlay')?.addEventListener('click',closeDrawers);
  document.getElementById('clear-cart-btn')?.addEventListener('click',()=>{ setCart([]); toast('Cart cleared','info'); });

  // Cart item actions
  document.getElementById('cart-items')?.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    const row=e.target.closest('.qty-control');
    if(!action||!row) return;
    const id=row.dataset.id;
    const variant=row.dataset.variant||'';
    const cart=getCart();
    const item=cart.find(i=>i.productId===id && (i.variant||'')===variant);
    if(!item) return;
    const p=S.products.find(x=>x.id===id);
    const minQty=typeof p?.minQty==='number'?p.minQty:1;
    const qtyStep=typeof p?.qtyStep==='number'?p.qtyStep:1;
    const stock=typeof p?.stock==='number'?p.stock:999999;
    if(action==='inc') item.qty=Math.min(stock,item.qty+qtyStep);
    else if(action==='dec') item.qty=Math.max(minQty,item.qty-qtyStep);
    else if(action==='remove'){ cart.splice(cart.indexOf(item),1); toast('Item removed from cart','info'); }
    setCart(cart);
  });

  // Wishlist item actions
  document.getElementById('wishlist-items')?.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    const row=e.target.closest('[data-id]');
    if(!action||!row) return;
    if(action==='add') addToCart(row.dataset.id);
    if(action==='remove') toggleWish(row.dataset.id);
  });

  // Search redirect from product/checkout pages
  document.getElementById('search-btn')?.addEventListener('click',()=>{
    const q=document.getElementById('search-input')?.value?.trim();
    if(q&&document.body.dataset.page!=='shop') window.location.href=`index.html?search=${encodeURIComponent(q)}#shop`;
  });

  // Back to top
  const btt=document.getElementById('back-to-top');
  window.addEventListener('scroll',()=>{ btt?.classList.toggle('show',window.scrollY>400); }, {passive:true});
  btt?.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));

  // Cookie banner
  if(!store.get('cookieAccepted',false)){
    setTimeout(()=>{ document.getElementById('cookie-banner')?.classList.add('show'); },2000);
  }
  document.getElementById('cookie-accept')?.addEventListener('click',()=>{ store.set('cookieAccepted',true); document.getElementById('cookie-banner')?.classList.remove('show'); });
  document.getElementById('cookie-decline')?.addEventListener('click',()=>{ document.getElementById('cookie-banner')?.classList.remove('show'); });
}

// ── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',async()=>{
  initDark();
  bindGlobal();
  updateCartBadge();
  updateWishlistBadge();
  await loadShopInfo();
  await loadProducts();

  // Handle search and category params from URL
  const urlParams=new URLSearchParams(location.search);
  const urlSearch=urlParams.get('search');
  if(urlSearch){ const si=document.getElementById('search-input'); if(si){ si.value=urlSearch; S.filters.search=urlSearch; applyFilters(); }}

  const urlCategory=urlParams.get('category');
  if(urlCategory){
    S.filters.categories=[urlCategory];
    applyFilters();
    setTimeout(() => {
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
    }, 150);
  }

  const page=document.body.dataset.page;
  if(page==='shop') initShop();
  if(page==='product') initProductPage();
  if(page==='checkout') initCheckout();
  if(page==='account') initAccount();
  if(page==='track') initTrack();

  if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }
});
