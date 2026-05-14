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
const getCart = ()=>store.get('cart',[]);
function setCart(cart){
  store.set('cart',cart);
  updateCartBadge();
  renderCartDrawer();
}
function addToCart(id, qty=1){
  const p = S.products.find(x=>x.id===id);
  if(!p || Number(p.stock||0)<=0){ toast('Out of stock','error'); return; }
  const cart = getCart();
  const ex = cart.find(i=>i.productId===id);
  if(ex) ex.qty=Math.min(ex.qty+qty, Number(p.stock||99));
  else cart.push({productId:id,qty});
  setCart(cart);
  toast(`${p.name} added to cart!`,'success');
  openDrawer('cart-drawer');
}
function updateCartBadge(){
  const cart=getCart();
  const total=cart.reduce((s,i)=>s+i.qty,0);
  document.querySelectorAll('#cart-count,#cart-count-drawer').forEach(el=>{ if(el) el.textContent=total; });
}
function renderCartDrawer(){
  const el=document.getElementById('cart-items');
  const sub=document.getElementById('cart-subtotal');
  const tot=document.getElementById('cart-total');
  const del=document.getElementById('cart-delivery');
  const cnt=document.getElementById('cart-count-drawer');
  if(!el) return;
  const cart=getCart();
  if(cnt) cnt.textContent=cart.reduce((s,i)=>s+i.qty,0);
  if(!cart.length){ el.innerHTML='<div class="empty-state"><div class="empty-ico">🛒</div><p>Your cart is empty.</p><a href="index.html#shop" class="btn btn-primary btn-sm" style="margin-top:.8rem">Browse Products</a></div>'; if(sub)sub.textContent=Rs(0); if(tot)tot.textContent=Rs(0); return; }
  const items=cart.map(i=>{ const p=S.products.find(x=>x.id===i.productId)||{}; return {...i,name:p.name||'Item',price:p.price||0,img:(p.images&&p.images[0])||PLACEHOLDER}; });
  const subtotal=items.reduce((s,i)=>s+i.price*i.qty,0);
  const ship=S.settings.shipping||{};
  const fee=ship.freeAbove>0&&subtotal>=ship.freeAbove?0:(ship.fee||0);
  if(sub) sub.textContent=Rs(subtotal);
  if(del) del.textContent=fee>0?Rs(fee):'FREE';
  if(tot) tot.textContent=Rs(subtotal+fee);
  el.innerHTML=items.map(i=>`
    <div class="drawer-item">
      <img class="drawer-item-img" src="${i.img}" alt="${i.name}" loading="lazy"/>
      <div>
        <a href="product.html?id=${i.productId}" class="drawer-item-name">${i.name}</a>
        <div class="drawer-item-price">${Rs(i.price)}</div>
        <div class="qty-control" data-id="${i.productId}">
          <button class="qty-btn" data-action="dec">−</button>
          <span class="qty-val">${i.qty}</span>
          <button class="qty-btn" data-action="inc">+</button>
          <button class="qty-btn" data-action="remove" style="font-size:.7rem;padding:.25rem .45rem">🗑</button>
        </div>
      </div>
      <div style="font-size:.88rem;font-weight:700">${Rs(i.price*i.qty)}</div>
    </div>
  `).join('');
}

// ── WISHLIST ───────────────────────────────────────────
const getWish=()=>store.get('wishlist',[]);
function toggleWish(id){
  const list=getWish(), idx=list.indexOf(id);
  if(idx>=0) list.splice(idx,1); else list.push(id);
  store.set('wishlist',list);
  document.querySelectorAll('#wishlist-count,#wishlist-count-drawer').forEach(el=>{ if(el) el.textContent=list.length; });
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
  if(S.filters.featured) chips.push(['Featured',()=>{ S.filters.featured=false; document.getElementById('filter-featured').checked=false; applyFilters(); }]);
  if(S.filters.bestSeller) chips.push(['Best Sellers',()=>{ S.filters.bestSeller=false; document.getElementById('filter-bestseller').checked=false; applyFilters(); }]);
  if(S.filters.inStock) chips.push(['In Stock',()=>{ S.filters.inStock=false; document.getElementById('filter-instock').checked=false; applyFilters(); }]);
  if(S.filters.onSale) chips.push(['On Sale',()=>{ S.filters.onSale=false; document.getElementById('filter-onsale').checked=false; applyFilters(); }]);
  c.innerHTML=chips.map(([l],i)=>`<span class="active-chip">${l}<button type="button" data-chip="${i}">✕</button></span>`).join('');
  c.querySelectorAll('[data-chip]').forEach(btn=>{ const idx=Number(btn.dataset.chip); btn.addEventListener('click',chips[idx][1]); });
}

function renderFilterSidebar(){
  const cats=[...new Set(S.products.map(p=>p.category).filter(Boolean))];
  const brands=[...new Set(S.products.map(p=>p.brand).filter(Boolean))];
  const cEl=document.getElementById('filter-categories');
  const bEl=document.getElementById('filter-brands');
  if(cEl) cEl.innerHTML=cats.map(c=>{ const cnt=S.products.filter(p=>p.category===c).length; return `<label class="filter-option"><input type="checkbox" value="${c}" ${S.filters.categories.includes(c)?'checked':''}/><span>${c}</span><span class="filter-option-count">${cnt}</span></label>`; }).join('');
  if(bEl) bEl.innerHTML=brands.map(b=>{ const cnt=S.products.filter(p=>p.brand===b).length; return `<label class="filter-option"><input type="checkbox" value="${b}" ${S.filters.brands.includes(b)?'checked':''}/><span>${b}</span><span class="filter-option-count">${cnt}</span></label>`; }).join('');
  cEl?.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{ if(inp.checked) S.filters.categories.push(inp.value); else S.filters.categories=S.filters.categories.filter(x=>x!==inp.value); applyFilters(); }));
  bEl?.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{ if(inp.checked) S.filters.brands.push(inp.value); else S.filters.brands=S.filters.brands.filter(x=>x!==inp.value); applyFilters(); }));
}

function updateCategoryCounts(){
  const counts={};
  S.products.forEach(p=>{ if(p.category) counts[p.category]=(counts[p.category]||0)+1; });
  Object.entries(counts).forEach(([cat,cnt])=>{
    const elId='cnt-'+cat.replace(/[^a-z0-9]/gi,'');
    const el=document.getElementById(elId)||document.getElementById('cnt-'+cat.split(' ')[0]);
    if(el) el.textContent=`${cnt} items`;
  });
  const statEl=document.getElementById('stat-products');
  if(statEl) statEl.textContent=S.products.length>0?`${S.products.length}+`:'500+';
}

function clearAllFilters(){
  S.filters={...S.filters,search:'',categories:[],brands:[],minPrice:null,maxPrice:null,featured:false,bestSeller:false,inStock:false,onSale:false};
  document.querySelectorAll('.filters-panel input[type=checkbox]').forEach(i=>i.checked=false);
  const si=document.getElementById('search-input'); if(si) si.value='';
  const mn=document.getElementById('min-price'); if(mn) mn.value='';
  const mx=document.getElementById('max-price'); if(mx) mx.value='';
  applyFilters();
}


// ── LOAD PRODUCTS ──────────────────────────────────────
async function loadProducts(){
  renderSkeletons();
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    const res=await fetch(api('/api/products?limit=500'),{signal:controller.signal});
    clearTimeout(timeout);
    if(!res.ok) throw new Error('API error');
    const data=await res.json();
    S.products=data.products||[];
    if(!S.products.length) throw new Error('empty');
  }catch{
    // ── FALLBACK: use bundled demo products ──
    S.products = typeof DEMO_PRODUCTS!=='undefined' ? DEMO_PRODUCTS : [];
    if(S.products.length) toast('Showing demo catalogue (backend offline)','info',4000);
    else{
      const g=document.getElementById('product-grid');
      if(g) g.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-ico">⚠️</div><p>Could not load products. Backend may be starting up — please refresh in a moment.</p></div>';
      return;
    }
  }
  S.filtered=[...S.products];
  updateCategoryCounts();
  renderFilterSidebar();
  applyFilters();
  renderCartDrawer(); renderWishlist(); renderCompareBar(); renderRecentlyViewed();
  loadReviews();
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

  // Category filter from search bar
  document.getElementById('search-cat-filter')?.addEventListener('change',e=>{
    S.filters.categories=e.target.value?[e.target.value]:[];
    applyFilters();
    document.querySelectorAll('.cat-nav-link').forEach(l=>{ l.classList.toggle('active',l.dataset.cat===e.target.value); });
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
      S.filters.categories=[cat];
      applyFilters();
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
    });
  });

  // Footer category links
  document.querySelectorAll('[data-nav-cat]').forEach(a=>{
    a.addEventListener('click',e=>{ e.preventDefault(); S.filters.categories=[a.dataset.navCat]; applyFilters(); document.getElementById('shop')?.scrollIntoView({behavior:'smooth'}); });
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
  try{
    const res=await fetch(api(`/api/products/${id}`));
    if(!res.ok){ layout.innerHTML='<div class="empty-state"><div class="empty-ico">❌</div><p>Product not found.</p><a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Back to Shop</a></div>'; return; }
    const p=await res.json();
    document.title=`${p.name} | Mahamaya Enterprise`;
    addRecentlyViewed(p.id);
    const imgs=p.images&&p.images.length?p.images:[PLACEHOLDER];
    const inStock=Number(p.stock||0)>0;
    const lowStock=inStock&&Number(p.stock)<=5;
    const disc=p.mrp&&p.mrp>p.price?Math.round((p.mrp-p.price)/p.mrp*100):0;
    document.getElementById('bc-category').textContent=p.category||'Products';
    document.getElementById('bc-category').href=`index.html#shop`;
    document.getElementById('bc-name').textContent=p.name;

    layout.innerHTML=`
      <div class="gallery-wrap">
        <div class="gallery-main"><img id="gallery-img" src="${imgs[0]}" alt="${p.name}"/></div>
        ${imgs.length>1?`<div class="gallery-thumbs">${imgs.map((img,i)=>`<div class="gallery-thumb${i===0?' active':''}" data-img="${img}"><img src="${img}" alt="View ${i+1}"/></div>`).join('')}</div>`:''}
      </div>
      <div class="detail-info">
        <div class="detail-brand">${p.brand||''}</div>
        <h1 class="detail-name">${p.name}</h1>
        ${p.sku?`<div class="detail-sku">SKU: ${p.sku}</div>`:''}
        <div class="detail-rating"><span style="color:#f59e0b">${'⭐'.repeat(Math.round(p.rating||0))}</span><span style="color:var(--muted);font-size:.85rem">${p.rating||0} (${p.ratingCount||0} reviews)</span></div>
        <div class="detail-price-box">
          <div style="display:flex;align-items:baseline;gap:.6rem;flex-wrap:wrap">
            <span class="detail-price">${Rs(p.price)}</span>
            ${disc?`<span class="detail-mrp">${Rs(p.mrp)}</span><span class="detail-off">-${disc}% OFF</span>`:''}
          </div>
          <div class="detail-stock ${inStock?(lowStock?'low-stock':'in-stock'):'out-stock'}" style="margin-top:.5rem">
            ${inStock?(lowStock?`⚠ Only ${p.stock} left in stock!`:`✓ In Stock (${p.stock} units)`):'✕ Out of Stock'}
          </div>
        </div>
        ${p.shortDesc?`<p style="font-size:.9rem;color:var(--muted);line-height:1.7">${p.shortDesc}</p>`:''}
        <div style="display:flex;align-items:center;gap.8rem;gap:.8rem;flex-wrap:wrap">
          <span class="qty-label">Qty:</span>
          <div class="qty-stepper">
            <button class="qty-step-btn" id="qty-dec">−</button>
            <span class="qty-step-val" id="qty-val">1</span>
            <button class="qty-step-btn" id="qty-inc">+</button>
          </div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary btn-lg" id="detail-add" ${inStock?'':'disabled'}>${inStock?'🛒 Add to Cart':'Out of Stock'}</button>
          <button class="btn btn-outline btn-lg" id="detail-wish">♥ Wishlist</button>
          <a href="${waUrl(S.settings.shopInfo?.whatsapp||'919475653294',`Hi! I want to enquire about: ${p.name} (${Rs(p.price)}). Please share availability and bulk pricing.`)}" target="_blank" rel="noopener" class="btn btn-lg" style="background:#25D366;color:#fff;border-color:#25D366">💬 WhatsApp Enquiry</a>
        </div>
        <div class="detail-tabs">
          <div class="tab-nav">
            <button class="tab-btn active" data-tab="desc">Description</button>
            ${p.sku?'<button class="tab-btn" data-tab="specs">Specifications</button>':''}
          </div>
          <div class="tab-content active" data-tab-content="desc"><p style="font-size:.9rem;color:var(--muted);line-height:1.8">${p.longDesc||p.shortDesc||'No description available.'}</p></div>
          ${p.sku?`<div class="tab-content" data-tab-content="specs"><table class="spec-table"><tr><td>SKU</td><td>${p.sku}</td></tr><tr><td>Brand</td><td>${p.brand||'—'}</td></tr><tr><td>Category</td><td>${p.category||'—'}</td></tr><tr><td>Tags</td><td>${(p.tags||[]).join(', ')||'—'}</td></tr></table></div>`:''}
        </div>
      </div>`;

    // Gallery thumbs
    document.querySelectorAll('.gallery-thumb').forEach(th=>{
      th.addEventListener('click',()=>{ document.getElementById('gallery-img').src=th.dataset.img; document.querySelectorAll('.gallery-thumb').forEach(t=>t.classList.remove('active')); th.classList.add('active'); });
    });

    // Qty stepper
    let qty=1;
    document.getElementById('qty-dec')?.addEventListener('click',()=>{ qty=Math.max(1,qty-1); document.getElementById('qty-val').textContent=qty; });
    document.getElementById('qty-inc')?.addEventListener('click',()=>{ qty=Math.min(Number(p.stock||99),qty+1); document.getElementById('qty-val').textContent=qty; });
    document.getElementById('detail-add')?.addEventListener('click',()=>addToCart(p.id,qty));
    document.getElementById('detail-wish')?.addEventListener('click',()=>toggleWish(p.id));

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn=>{ btn.addEventListener('click',()=>{ document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active')); document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active')); btn.classList.add('active'); document.querySelector(`[data-tab-content="${btn.dataset.tab}"]`)?.classList.add('active'); }); });

    // Load related products
    const rg=document.getElementById('related-grid');
    const rs=document.getElementById('related-section');
    if(rg&&rs){
      const related=S.products.filter(x=>x.id!==p.id&&x.category===p.category).slice(0,4);
      if(related.length){ rs.style.display='block'; rg.innerHTML=related.map(renderProductCard).join(''); rg.addEventListener('click',e=>{ const action=e.target.closest('[data-action]')?.dataset.action; const card=e.target.closest('.product-card'); if(!action||!card) return; if(action==='add') addToCart(card.dataset.id); else if(action==='wish') toggleWish(card.dataset.id); }); }
    }
  }catch(err){ layout.innerHTML='<div class="empty-state"><div class="empty-ico">⚠️</div><p>Error loading product.</p></div>'; }
}


// ── CHECKOUT PAGE ──────────────────────────────────────
async function initCheckout(){
  const form=document.getElementById('order-form');
  const itemsEl=document.getElementById('checkout-items');
  if(!form||!itemsEl) return;
  const cart=getCart();
  if(!cart.length){ itemsEl.innerHTML='<div class="empty-state"><div class="empty-ico">🛒</div><p>Your cart is empty.</p><a href="index.html" class="btn btn-primary btn-sm" style="margin-top:.8rem">Browse Products</a></div>'; document.getElementById('place-order-btn').disabled=true; return; }

  let subtotal=0, discount=0;
  const itemsHtml=cart.map(i=>{ const p=S.products.find(x=>x.id===i.productId)||{}; const line=(p.price||0)*i.qty; subtotal+=line; const img=(p.images&&p.images[0])||PLACEHOLDER; return `<div class="summary-item"><img class="summary-item-img" src="${img}" alt="${p.name||''}"/><div class="summary-item-info"><div class="summary-item-name">${p.name||'Item'}</div><div class="summary-item-qty">Qty: ${i.qty}</div></div><div class="summary-item-price">${Rs(line)}</div></div>`; }).join('');
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
    const payload={ items:cart.map(i=>({productId:i.productId,qty:i.qty})), deliveryFee:fee, discount, paymentMethod:payment, couponCode:document.getElementById('coupon-input')?.value?.trim().toUpperCase()||'', customer:{ name:form.name.value, phone:form.phone.value, email:form.email.value, address:form.address.value, city:form.city.value, state:form.state.value, pincode:form.pincode.value, notes:form.notes.value } };
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
      document.getElementById('acc-name')&&(document.getElementById('acc-name').textContent=u.name||'');
      document.getElementById('acc-email')&&(document.getElementById('acc-email').textContent=u.email||'');
      document.getElementById('acc-phone')&&(document.getElementById('acc-phone').textContent=u.phone||'');
      document.getElementById('logged-out-view')&&(document.getElementById('logged-out-view').style.display='none');
      document.getElementById('logged-in-view')&&(document.getElementById('logged-in-view').style.display='block');
    }).catch(()=>showLoggedOut());
  } else showLoggedOut();

  function showLoggedOut(){
    document.getElementById('logged-out-view')&&(document.getElementById('logged-out-view').style.display='block');
    document.getElementById('logged-in-view')&&(document.getElementById('logged-in-view').style.display='none');
  }

  document.getElementById('login-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    const btn=e.target.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='Signing in...';
    try{
      const res=await fetch(api('/api/auth/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})});
      if(res.ok){ const d=await res.json(); store.set('userToken',d.token); toast('Signed in successfully!','success'); location.reload(); }
      else{ toast('Invalid email or password','error'); btn.disabled=false; btn.textContent='Sign In'; }
    }catch{ toast('Network error','error'); btn.disabled=false; btn.textContent='Sign In'; }
  });

  document.getElementById('signup-form')?.addEventListener('submit',async e=>{
    e.preventDefault(); const fd=new FormData(e.target);
    if(fd.get('password')!==fd.get('confirmPassword')){ toast('Passwords do not match','error'); return; }
    const btn=e.target.querySelector('[type=submit]'); btn.disabled=true; btn.textContent='Creating account...';
    try{
      const res=await fetch(api('/api/auth/signup'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:fd.get('name'),email:fd.get('email'),phone:fd.get('phone'),password:fd.get('password')})});
      if(res.ok){ const d=await res.json(); store.set('userToken',d.token); toast('Account created successfully!','success'); location.reload(); }
      else{ const err=await res.json(); toast(err.error||'Signup failed','error'); btn.disabled=false; btn.textContent='Create Account'; }
    }catch{ toast('Network error','error'); btn.disabled=false; btn.textContent='Create Account'; }
  });

  document.getElementById('logout-btn')?.addEventListener('click',()=>{ store.set('userToken',''); toast('Signed out','info'); location.reload(); });
}

// ── GLOBAL EVENT BINDINGS ──────────────────────────────
function bindGlobal(){
  document.getElementById('cart-btn')?.addEventListener('click',()=>openDrawer('cart-drawer'));
  document.getElementById('wishlist-btn')?.addEventListener('click',()=>openDrawer('wishlist-drawer'));
  document.getElementById('close-cart')?.addEventListener('click',closeDrawers);
  document.getElementById('close-wishlist')?.addEventListener('click',closeDrawers);
  document.getElementById('close-compare')?.addEventListener('click',()=>closeModal('compare-modal'));
  document.getElementById('compare-btn')?.addEventListener('click',renderCompareModal);
  document.getElementById('clear-compare-btn')?.addEventListener('click',()=>{ store.set('compare',[]); renderCompareBar(); });
  document.getElementById('overlay')?.addEventListener('click',closeDrawers);
  document.getElementById('clear-cart-btn')?.addEventListener('click',()=>{ setCart([]); toast('Cart cleared','info'); });

  // Cart item actions
  document.getElementById('cart-items')?.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]')?.dataset.action;
    const row=e.target.closest('.qty-control');
    if(!action||!row) return;
    const id=row.dataset.id; const cart=getCart(); const item=cart.find(i=>i.productId===id); if(!item) return;
    const p=S.products.find(x=>x.id===id);
    if(action==='inc') item.qty=Math.min(item.qty+1,Number(p?.stock||99));
    else if(action==='dec') item.qty=Math.max(1,item.qty-1);
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
  document.querySelectorAll('#wishlist-count,#wishlist-count-drawer').forEach(el=>{ if(el) el.textContent=store.get('wishlist',[]).length; });
  await loadShopInfo();
  await loadProducts();

  // Handle search param from URL
  const urlParams=new URLSearchParams(location.search);
  const urlSearch=urlParams.get('search');
  if(urlSearch){ const si=document.getElementById('search-input'); if(si){ si.value=urlSearch; S.filters.search=urlSearch; applyFilters(); }}

  const page=document.body.dataset.page;
  if(page==='shop') initShop();
  if(page==='product') initProductPage();
  if(page==='checkout') initCheckout();
  if(page==='account') initAccount();
  if(page==='track') initTrack();

  if('serviceWorker' in navigator){ navigator.serviceWorker.register('/service-worker.js').catch(()=>{}); }
});
