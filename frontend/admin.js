const API_BASE=(localStorage.getItem('apiBase')||'https://mahamaya-enterprise.onrender.com').trim().replace(/\/+$/,'');
const api=p=>API_BASE?`${API_BASE}${p}`:p;
const Rs=v=>`Rs. ${Number(v||0).toLocaleString('en-IN')}`;
let TOKEN='',PRODUCTS=[],ORDERS=[],editingProductId=null;

function toast(msg,type='info',dur=3500){
  const c=document.getElementById('toast-container');if(!c)return;
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t=document.createElement('div');t.className=`toast ${type}`;
  t.innerHTML=`<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  c.appendChild(t);requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{t.classList.remove('show');setTimeout(()=>t.remove(),350);},dur);
}
function authHeaders(){return{'Content-Type':'application/json','Authorization':`Bearer ${TOKEN}`};}
function showPage(name){
  document.querySelectorAll('.admin-page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.admin-nav-link').forEach(l=>l.classList.remove('active'));
  document.getElementById(`page-${name}`)?.classList.add('active');
  document.querySelector(`.admin-nav-link[data-page="${name}"]`)?.classList.add('active');
  const titles={overview:'Dashboard Overview',products:'Products',['add-product']:'Add / Edit Product',orders:'All Orders',coupons:'Coupon Management',customers:'Customers',reviews:'Reviews',quotes:'Quote Requests',settings:'Shop Settings'};
  document.getElementById('page-title').textContent=titles[name]||name;
  if(name==='overview') loadOverview();
  else if(name==='products') loadProducts();
  else if(name==='orders') loadOrders();
  else if(name==='coupons') loadCoupons();
  else if(name==='customers') loadCustomers();
  else if(name==='reviews') loadReviews();
  else if(name==='quotes') loadQuotes();
  else if(name==='settings') loadSettings();
}

// ── DARK MODE ──────────────────────────────────────────
function initDark(){
  const saved=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',saved);
  const btn=document.getElementById('dark-toggle');
  if(btn) btn.textContent=saved==='dark'?'☀️':'🌙';
  btn?.addEventListener('click',()=>{const cur=document.documentElement.getAttribute('data-theme');const next=cur==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',next);localStorage.setItem('theme',next);if(btn) btn.textContent=next==='dark'?'☀️':'🌙';});
}

// ── LOGIN ──────────────────────────────────────────────
document.getElementById('admin-login-form').addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(e.target);
  const btn=e.target.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Signing in...';
  try{
    const res=await fetch(api('/api/admin/login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:fd.get('email'),password:fd.get('password')})});
    if(res.ok){const d=await res.json();TOKEN=d.token;localStorage.setItem('adminToken',TOKEN);initDashboard(d.email);}
    else{const err=await res.json();const el=document.getElementById('login-err');el.style.display='block';el.textContent=err.error||'Invalid credentials';btn.disabled=false;btn.textContent='Sign In to Admin';}
  }catch{const el=document.getElementById('login-err');el.style.display='block';el.textContent='Network error. Is the server running?';btn.disabled=false;btn.textContent='Sign In to Admin';}
});

function initDashboard(email=''){
  document.getElementById('admin-login').style.display='none';
  document.getElementById('admin-dashboard').style.display='grid';
  document.getElementById('admin-user-email').textContent=email;
  showPage('overview');
}

// ── NAV ────────────────────────────────────────────────
document.querySelectorAll('.admin-nav-link[data-page]').forEach(link=>{
  link.addEventListener('click',()=>showPage(link.dataset.page));
});
document.querySelectorAll('[data-page-link]').forEach(el=>{
  el.addEventListener('click',e=>{e.preventDefault();showPage(el.dataset.pageLink);});
});
document.getElementById('admin-logout')?.addEventListener('click',()=>{TOKEN='';localStorage.removeItem('adminToken');document.getElementById('admin-dashboard').style.display='none';document.getElementById('admin-login').style.display='flex';toast('Signed out','info');});

// ── OVERVIEW ───────────────────────────────────────────
async function loadOverview(){
  try{
    const [ordRes,prodRes,custRes,analyticsRes]=await Promise.all([
      fetch(api('/api/orders'),{headers:authHeaders()}),
      fetch(api('/api/products?limit=500')),
      fetch(api('/api/admin/customers'),{headers:authHeaders()}),
      fetch(api('/api/admin/analytics'),{headers:authHeaders()})
    ]);
    if(ordRes.ok){const {orders=[]}=await ordRes.json();ORDERS=orders;
      const revenue=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+o.total,0);
      document.getElementById('stat-revenue').textContent=Rs(revenue);
      document.getElementById('stat-orders').textContent=orders.length;
      renderRecentOrders(orders.slice(0,8));
    }
    if(prodRes.ok){const {products=[]}=await prodRes.json();PRODUCTS=products;document.getElementById('stat-prods').textContent=products.length;}
    if(custRes.ok){const {users=[]}=await custRes.json();document.getElementById('stat-customers').textContent=users.length;}
    if(analyticsRes.ok){const a=await analyticsRes.json();renderRevenueChart(a.dailyRevenue||[]);renderTopProducts(a.topProducts||[]);}
  }catch(e){console.error(e);toast('Failed to load analytics','error');}
}

function renderRevenueChart(daily){
  const wrap=document.getElementById('revenue-chart');
  const labelsEl=document.getElementById('chart-labels');
  if(!wrap||!daily.length) return;
  const max=Math.max(...daily.map(d=>d.revenue),1);
  wrap.innerHTML=daily.map(d=>{const h=Math.max(4,Math.round((d.revenue/max)*76));return `<div class="chart-bar" style="height:${h}px" data-label="${d.date}: ${Rs(d.revenue)}" title="${d.date}: ${Rs(d.revenue)}"></div>`;}).join('');
  if(labelsEl) labelsEl.innerHTML=daily.map(d=>`<span style="flex:1;text-align:center;overflow:hidden">${d.date.slice(5)}</span>`).join('');
}

function renderTopProducts(products){
  const el=document.getElementById('top-products-list');
  if(!el) return;
  el.innerHTML=products.map((p,i)=>`
    <div style="display:flex;align-items:center;gap.7rem;gap:.7rem;padding:.5rem 0;border-bottom:1px solid var(--edge)">
      <span style="width:20px;font-size:.8rem;font-weight:800;color:var(--muted)">${i+1}</span>
      <div style="flex:1;min-width:0"><div style="font-size:.85rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div><div style="font-size:.75rem;color:var(--muted)">${p.soldCount||0} sold</div></div>
      <div style="font-size:.85rem;font-weight:700">${Rs(p.price)}</div>
    </div>`).join('');
}

function renderRecentOrders(orders){
  const tbody=document.getElementById('recent-orders-body');
  if(!tbody) return;
  tbody.innerHTML=orders.map(o=>`
    <tr>
      <td><strong>${o.orderNo}</strong></td>
      <td>${o.customer?.name||'—'}</td>
      <td>${Rs(o.total)}</td>
      <td><span class="status-pill ${o.status}">${o.status}</span></td>
      <td style="font-size:.78rem;color:var(--muted)">${o.createdAt?new Date(o.createdAt).toLocaleDateString('en-IN'):''}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.id}')">View</button></td>
    </tr>`).join('');
}

// ── PRODUCTS ───────────────────────────────────────────
async function loadProducts(){
  try{
    const res=await fetch(api('/api/products?limit=500'));
    const {products=[]}=await res.json();PRODUCTS=products;
    renderProductsTable(products);
    const cats=[...new Set(products.map(p=>p.category).filter(Boolean))];
    const cf=document.getElementById('prod-cat-filter');
    if(cf) cats.forEach(c=>{const o=document.createElement('option');o.value=c;o.textContent=c;cf.appendChild(o);});
  }catch{toast('Failed to load products','error');}
}

function renderProductsTable(products){
  const tbody=document.getElementById('products-body');
  const cnt=document.getElementById('prod-count');
  if(!tbody) return;
  if(cnt) cnt.textContent=`${products.length} products`;
  tbody.innerHTML=products.map(p=>`
    <tr>
      <td><img class="thumb" src="${(p.images&&p.images[0])||'/assets/placeholder.svg'}" alt="${p.name}" onerror="this.src='/assets/placeholder.svg'"/></td>
      <td style="max-width:200px"><div style="font-weight:600;font-size:.85rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name}</div>${p.sku?`<div style="font-size:.72rem;color:var(--muted)">SKU: ${p.sku}</div>`:''}</td>
      <td style="font-size:.82rem">${p.category||'—'}</td>
      <td style="font-size:.82rem">${p.brand||'—'}</td>
      <td style="font-weight:700">${Rs(p.price)}${p.mrp&&p.mrp>p.price?`<br/><span style="font-size:.72rem;color:var(--muted);text-decoration:line-through">${Rs(p.mrp)}</span>`:''}</td>
      <td><span style="font-weight:600;color:${Number(p.stock||0)===0?'var(--danger)':Number(p.stock||0)<=5?'var(--warning)':'var(--success)'}">${Number(p.stock||0)===0?'❌ Out':p.stock+' units'}</span></td>
      <td>${p.featured?'<span class="badge badge-featured">Featured</span>':''}${p.bestSeller?'<span class="badge badge-best">Best Seller</span>':''}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="editProduct('${p.id}')">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" onclick="uploadImage('${p.id}')" style="margin-left:.2rem">🖼️</button>
        <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}')" style="margin-left:.2rem;color:var(--danger)">🗑️</button>
      </td>
    </tr>`).join('');
}

// Search & filter
document.getElementById('prod-search')?.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  const cat=document.getElementById('prod-cat-filter')?.value||'';
  renderProductsTable(PRODUCTS.filter(p=>(!q||`${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(q))&&(!cat||p.category===cat)));
});
document.getElementById('prod-cat-filter')?.addEventListener('change',e=>{
  const cat=e.target.value;const q=document.getElementById('prod-search')?.value?.toLowerCase()||'';
  renderProductsTable(PRODUCTS.filter(p=>(!cat||p.category===cat)&&(!q||`${p.name} ${p.brand}`.toLowerCase().includes(q))));
});

function editProduct(id){
  const p=PRODUCTS.find(x=>x.id===id);if(!p) return;
  editingProductId=id;
  const form=document.getElementById('product-form');
  const fields={name:p.name,category:p.category,brand:p.brand||'',sku:p.sku||'',price:p.price,mrp:p.mrp||'',stock:p.stock||0,rating:p.rating||'',ratingCount:p.ratingCount||'',tags:(p.tags||[]).join(', '),shortDesc:p.shortDesc||'',longDesc:p.longDesc||'',imageUrl:(p.images&&p.images[0])||''};
  Object.entries(fields).forEach(([k,v])=>{ const el=form.querySelector(`[name=${k}]`); if(el) el.value=v; });
  if(p.featured) form.querySelector('[name=featured]').checked=true;
  if(p.bestSeller) form.querySelector('[name=bestSeller]').checked=true;
  document.getElementById('prod-form-title').textContent='✏️ Edit Product';
  document.getElementById('save-product-btn').textContent='💾 Update Product';
  document.getElementById('cancel-edit-btn').style.display='inline-flex';
  document.getElementById('edit-product-id').value=id;
  showPage('add-product');
  window.scrollTo({top:0,behavior:'smooth'});
}

document.getElementById('cancel-edit-btn')?.addEventListener('click',resetProductForm);
document.getElementById('reset-prod-form')?.addEventListener('click',resetProductForm);
function resetProductForm(){
  editingProductId=null;
  document.getElementById('product-form')?.reset();
  document.getElementById('edit-product-id').value='';
  document.getElementById('prod-form-title').textContent='➕ Add New Product';
  document.getElementById('save-product-btn').textContent='💾 Save Product';
  document.getElementById('cancel-edit-btn').style.display='none';
  document.getElementById('img-preview-grid').innerHTML='';
}

// Image upload preview
document.getElementById('img-file-input')?.addEventListener('change',e=>{
  const grid=document.getElementById('img-preview-grid');
  grid.innerHTML='';
  Array.from(e.target.files).forEach(file=>{
    const url=URL.createObjectURL(file);
    const wrap=document.createElement('div');wrap.className='img-preview';
    wrap.innerHTML=`<img src="${url}" alt="preview"/><button class="img-preview-del" type="button" onclick="this.parentElement.remove()">✕</button>`;
    grid.appendChild(wrap);
  });
});

document.getElementById('product-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  const btn=document.getElementById('save-product-btn');btn.disabled=true;btn.textContent='Saving...';
  const fd=new FormData(e.target);
  const payload={
    name:fd.get('name'),category:fd.get('category'),brand:fd.get('brand'),sku:fd.get('sku'),
    price:Number(fd.get('price')),mrp:Number(fd.get('mrp'))||Number(fd.get('price')),
    stock:Number(fd.get('stock')),rating:Number(fd.get('rating'))||0,ratingCount:Number(fd.get('ratingCount'))||0,
    tags:fd.get('tags')||'',shortDesc:fd.get('shortDesc'),longDesc:fd.get('longDesc'),
    imageUrl:fd.get('imageUrl')||'',featured:fd.get('featured')==='on',bestSeller:fd.get('bestSeller')==='on'
  };
  const msg=document.getElementById('product-form-msg');
  try{
    const isEdit=!!editingProductId;
    const url=isEdit?api(`/api/products/${editingProductId}`):api('/api/products');
    const res=await fetch(url,{method:isEdit?'PUT':'POST',headers:authHeaders(),body:JSON.stringify(payload)});
    if(res.ok){
      const saved=await res.json();
      // Upload image files if any
      const files=document.getElementById('img-file-input')?.files;
      if(files&&files.length>0){
        for(const file of files){
          const imgFd=new FormData();imgFd.append('image',file);
          await fetch(api(`/api/products/${saved.id}/image`),{method:'POST',headers:{Authorization:`Bearer ${TOKEN}`},body:imgFd});
        }
      }
      toast(isEdit?'Product updated!':'Product added!','success');
      resetProductForm();showPage('products');
    }else{const err=await res.json();toast(err.error||'Save failed','error');msg.style.display='block';msg.style.color='var(--danger)';msg.textContent=err.error||'Error';}
  }catch{toast('Network error','error');}
  btn.disabled=false;btn.textContent=editingProductId?'💾 Update Product':'💾 Save Product';
});

async function deleteProduct(id){
  if(!confirm('Delete this product? This cannot be undone.')) return;
  try{
    const res=await fetch(api(`/api/products/${id}`),{method:'DELETE',headers:authHeaders()});
    if(res.ok){toast('Product deleted','info');PRODUCTS=PRODUCTS.filter(p=>p.id!==id);renderProductsTable(PRODUCTS);}
    else toast('Delete failed','error');
  }catch{toast('Network error','error');}
}

async function uploadImage(id){
  const input=document.createElement('input');input.type='file';input.accept='image/*';
  input.onchange=async()=>{
    if(!input.files[0]) return;
    const fd=new FormData();fd.append('image',input.files[0]);
    toast('Uploading image...','info');
    try{
      const res=await fetch(api(`/api/products/${id}/image`),{method:'POST',headers:{Authorization:`Bearer ${TOKEN}`},body:fd});
      if(res.ok){toast('Image uploaded!','success');loadProducts();}
      else toast('Upload failed','error');
    }catch{toast('Network error','error');}
  };
  input.click();
}

// ── ORDERS ─────────────────────────────────────────────
async function loadOrders(){
  try{
    const res=await fetch(api('/api/orders'),{headers:authHeaders()});
    const d=await res.json();ORDERS=d.orders||[];renderOrdersTable(ORDERS);
  }catch{toast('Failed to load orders','error');}
}
function renderOrdersTable(orders){
  const tbody=document.getElementById('orders-body');if(!tbody)return;
  tbody.innerHTML=orders.map(o=>{
    const opts=['new','confirmed','packed','dispatched','delivered','cancelled'].map(s=>`<option value="${s}"${o.status===s?' selected':''}>${s}</option>`).join('');
    const num=(o.customer?.phone||'').replace(/\D/g,'');
    const waNum=num.length===10?`91${num}`:num;
    const waMsg=encodeURIComponent(`Hi ${o.customer?.name||''},\n\nYour order *${o.orderNo}* status: *${o.status}*.\nTotal: Rs.${o.total}\n\nThank you! — Mahamaya Enterprise`);
    return `<tr>
      <td><strong>${o.orderNo}</strong></td>
      <td style="font-size:.78rem">${o.createdAt?new Date(o.createdAt).toLocaleDateString('en-IN'):''}</td>
      <td>${o.customer?.name||'—'}</td>
      <td><a href="tel:${o.customer?.phone}" style="color:var(--primary)">${o.customer?.phone||'—'}</a></td>
      <td>${(o.items||[]).length} item(s)</td>
      <td style="font-weight:700">${Rs(o.total)}</td>
      <td style="font-size:.78rem">${o.paymentMethod||'cod'}</td>
      <td><select class="sort-select" style="font-size:.75rem;padding:.25rem .5rem" onchange="updateOrderStatus('${o.id}',this.value)">${opts}</select></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" onclick="viewOrder('${o.id}')">View</button>
        <a href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;font-size:.72rem;padding:.25rem .5rem;margin-left:.2rem">💬</a>
      </td>
    </tr>`;
  }).join('');
}
async function updateOrderStatus(id,status){
  try{
    const res=await fetch(api(`/api/orders/${id}/status`),{method:'PATCH',headers:authHeaders(),body:JSON.stringify({status})});
    if(res.ok){toast(`Status updated → ${status}`,'success');const o=ORDERS.find(x=>x.id===id);if(o)o.status=status;}
    else toast('Update failed','error');
  }catch{toast('Network error','error');}
}
function viewOrder(id){
  const o=ORDERS.find(x=>x.id===id);if(!o)return;
  const body=document.getElementById('order-modal-body');if(!body)return;
  const num=(o.customer?.phone||'').replace(/\D/g,'');
  const waNum=num.length===10?`91${num}`:num;
  const waMsg=encodeURIComponent(`Hi ${o.customer?.name||''},\n\nYour order *${o.orderNo}* is *${o.status}*.\nTotal: Rs.${o.total}\n\nThank you! — Mahamaya Enterprise`);
  body.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:1rem">
      <div><strong style="font-size:1.05rem">${o.orderNo}</strong><span class="status-pill ${o.status}" style="margin-left:.5rem">${o.status}</span></div>
      <div style="font-size:.82rem;color:var(--muted)">${o.createdAt?new Date(o.createdAt).toLocaleString('en-IN'):''}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
      <div><div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:.3rem">Customer</div>
        <strong>${o.customer?.name||'—'}</strong><br/>${o.customer?.phone||''}<br/>${o.customer?.email||''}</div>
      <div><div style="font-size:.78rem;font-weight:700;color:var(--muted);text-transform:uppercase;margin-bottom:.3rem">Delivery Address</div>
        <div style="font-size:.85rem">${o.customer?.address||'—'}<br/>${o.customer?.city||''} – ${o.customer?.pincode||''}</div></div>
    </div>
    ${o.customer?.notes?`<div style="padding:.7rem;background:var(--accent-soft);border-radius:var(--radius-sm);font-size:.85rem;margin-bottom:1rem">📝 ${o.customer.notes}</div>`:''}
    <table class="admin-table" style="margin-bottom:1rem">
      <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
      <tbody>${(o.items||[]).map(i=>`<tr><td>${i.name||i.productId}</td><td>${i.qty}</td><td>${Rs(i.price)}</td><td>${Rs((i.lineTotal||(i.price*i.qty)))}</td></tr>`).join('')}</tbody>
    </table>
    <div style="display:flex;flex-direction:column;gap:.3rem">
      <div style="display:flex;justify-content:space-between;font-size:.88rem"><span>Subtotal</span><span>${Rs(o.subtotal||0)}</span></div>
      <div style="display:flex;justify-content:space-between;font-size:.88rem"><span>Delivery</span><span>${Rs(o.deliveryFee||0)}</span></div>
      ${o.discount?`<div style="display:flex;justify-content:space-between;font-size:.88rem;color:var(--success)"><span>Discount</span><span>-${Rs(o.discount)}</span></div>`:''}
      <div style="display:flex;justify-content:space-between;font-weight:800;font-size:1rem;border-top:2px solid var(--edge);padding-top:.5rem;margin-top:.3rem"><span>Total</span><span>${Rs(o.total)}</span></div>
    </div>
    <div style="display:flex;gap:.6rem;margin-top:1rem;flex-wrap:wrap">
      <a href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366">💬 WhatsApp Customer</a>
      <a href="tel:${o.customer?.phone}" class="btn btn-ghost btn-sm">📞 Call</a>
    </div>`;
  document.getElementById('order-modal')?.classList.add('show');
  document.getElementById('modal-overlay')?.classList.add('show');
}
document.getElementById('order-search')?.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  const st=document.getElementById('order-status-filter')?.value||'';
  renderOrdersTable(ORDERS.filter(o=>(!q||`${o.orderNo} ${o.customer?.name} ${o.customer?.phone}`.toLowerCase().includes(q))&&(!st||o.status===st)));
});
document.getElementById('order-status-filter')?.addEventListener('change',e=>{
  const st=e.target.value;const q=document.getElementById('order-search')?.value?.toLowerCase()||'';
  renderOrdersTable(ORDERS.filter(o=>(!st||o.status===st)&&(!q||`${o.orderNo} ${o.customer?.name}`.toLowerCase().includes(q))));
});

// ── COUPONS ────────────────────────────────────────────
async function loadCoupons(){
  try{
    const res=await fetch(api('/api/coupons'),{headers:authHeaders()});
    const d=await res.json();const coupons=d.coupons||[];
    const tbody=document.getElementById('coupons-body');if(!tbody)return;
    tbody.innerHTML=coupons.map(c=>`<tr><td><strong>${c.code}</strong></td><td>${c.type==='percent'?'Percent (%)':'Flat (Rs.)'}</td><td>${c.type==='percent'?c.value+'%':Rs(c.value)}</td><td>${Rs(c.minOrder||0)}</td><td>${c.usedCount||0}/${c.maxUses||'∞'}</td><td><button class="btn btn-ghost btn-sm" onclick="deleteCoupon('${c.id}')" style="color:var(--danger)">Delete</button></td></tr>`).join('');
  }catch{toast('Failed to load coupons','error');}
}
document.getElementById('coupon-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(e.target);
  try{
    const res=await fetch(api('/api/coupons'),{method:'POST',headers:authHeaders(),body:JSON.stringify({code:fd.get('code').toUpperCase(),type:fd.get('type'),value:Number(fd.get('value')),minOrder:Number(fd.get('minOrder'))||0,maxUses:Number(fd.get('maxUses'))||0})});
    if(res.ok){toast('Coupon created!','success');e.target.reset();loadCoupons();}
    else{const err=await res.json();toast(err.error||'Failed','error');}
  }catch{toast('Network error','error');}
});
async function deleteCoupon(id){
  if(!confirm('Delete this coupon?'))return;
  try{const res=await fetch(api(`/api/coupons/${id}`),{method:'DELETE',headers:authHeaders()});if(res.ok){toast('Deleted','info');loadCoupons();}else toast('Failed','error');}catch{toast('Network error','error');}
}

// ── CUSTOMERS ──────────────────────────────────────────
async function loadCustomers(){
  try{
    const res=await fetch(api('/api/admin/customers'),{headers:authHeaders()});
    const d=await res.json();const users=d.users||[];
    const tbody=document.getElementById('customers-body');if(!tbody)return;
    tbody.innerHTML=users.map(u=>`<tr><td>${u.name||'—'}</td><td>${u.email||'—'}</td><td>${u.phone||'—'}</td><td style="font-size:.78rem;color:var(--muted)">${u.createdAt?new Date(u.createdAt).toLocaleDateString('en-IN'):''}</td></tr>`).join('');
  }catch{toast('Failed to load customers','error');}
}

// ── REVIEWS ────────────────────────────────────────────
async function loadReviews(){
  try{
    const res=await fetch(api('/api/reviews'));
    const d=await res.json();const reviews=d.reviews||[];
    const tbody=document.getElementById('reviews-body');if(!tbody)return;
    tbody.innerHTML=reviews.map(r=>`<tr><td>${r.name}</td><td>${'⭐'.repeat(r.rating||0)}</td><td style="font-size:.83rem;max-width:250px">${r.comment}</td><td style="font-size:.78rem;color:var(--muted)">${r.createdAt?new Date(r.createdAt).toLocaleDateString('en-IN'):''}</td><td><button class="btn btn-ghost btn-sm" onclick="deleteReview('${r.id}')" style="color:var(--danger)">Delete</button></td></tr>`).join('');
  }catch{toast('Failed to load reviews','error');}
}
async function deleteReview(id){
  if(!confirm('Delete this review?'))return;
  try{const res=await fetch(api(`/api/reviews/${id}`),{method:'DELETE',headers:authHeaders()});if(res.ok){toast('Deleted','info');loadReviews();}else toast('Failed','error');}catch{toast('Network error','error');}
}

// ── QUOTES ─────────────────────────────────────────────
async function loadQuotes(){
  try{
    const res=await fetch(api('/api/quotes'),{headers:authHeaders()});
    const d=await res.json();const quotes=d.quotes||[];
    const tbody=document.getElementById('quotes-body');if(!tbody)return;
    tbody.innerHTML=quotes.map(q=>`<tr><td>${q.topic||'—'}</td><td>${q.name||'—'}</td><td>${q.phone||'—'}</td><td style="font-size:.82rem;max-width:200px">${q.requirement||'—'}</td><td style="font-size:.78rem;color:var(--muted)">${q.createdAt?new Date(q.createdAt).toLocaleDateString('en-IN'):''}</td></tr>`).join('');
  }catch{toast('No quote requests yet','info');}
}

// ── SETTINGS ───────────────────────────────────────────
async function loadSettings(){
  try{
    const res=await fetch(api('/api/settings'));if(!res.ok)return;
    const s=await res.json();const form=document.getElementById('settings-form');if(!form)return;
    const shop=s.shopInfo||{};const ship=s.shipping||{};
    const map={shopName:shop.name||'',phone:shop.phone||'',whatsapp:shop.whatsapp||'',email:shop.email||'',address:shop.address||'',hours:shop.hours||'',deliveryFee:ship.fee||150,freeAbove:ship.freeAbove||5000,announcement:s.announcement||''};
    Object.entries(map).forEach(([k,v])=>{const el=form.querySelector(`[name="${k}"]`);if(el)el.value=v;});
    renderFaqs(s.faqs||[]);
  }catch{toast('Failed to load settings','error');}
}
function renderFaqs(faqs){
  const el=document.getElementById('faqs-list');if(!el)return;
  el.innerHTML=faqs.map((f,i)=>`
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem">
      <input type="text" name="faq_q_${i}" value="${(f.question||'').replace(/"/g,'&quot;')}" placeholder="Question" style="padding:.4rem .6rem;border:1px solid var(--edge);border-radius:var(--radius-sm);font-size:.85rem"/>
      <input type="text" name="faq_a_${i}" value="${(f.answer||'').replace(/"/g,'&quot;')}" placeholder="Answer" style="padding:.4rem .6rem;border:1px solid var(--edge);border-radius:var(--radius-sm);font-size:.85rem"/>
      <button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('div').remove()">✕</button>
    </div>`).join('');
}
document.getElementById('add-faq-btn')?.addEventListener('click',()=>{
  const el=document.getElementById('faqs-list');if(!el)return;
  const i=el.children.length;
  const div=document.createElement('div');
  div.style.cssText='display:grid;grid-template-columns:1fr 1fr auto;gap:.5rem;margin-bottom:.5rem';
  div.innerHTML=`<input type="text" name="faq_q_${i}" placeholder="Question" style="padding:.4rem .6rem;border:1px solid var(--edge);border-radius:var(--radius-sm);font-size:.85rem"/><input type="text" name="faq_a_${i}" placeholder="Answer" style="padding:.4rem .6rem;border:1px solid var(--edge);border-radius:var(--radius-sm);font-size:.85rem"/><button type="button" class="btn btn-ghost btn-sm" onclick="this.closest('div').remove()">✕</button>`;
  el.appendChild(div);
});
document.getElementById('settings-form')?.addEventListener('submit',async e=>{
  e.preventDefault();const fd=new FormData(e.target);
  const faqs=[];let i=0;
  while(fd.get(`faq_q_${i}`)!==null){const q=fd.get(`faq_q_${i}`);const a=fd.get(`faq_a_${i}`);if(q)faqs.push({question:q,answer:a||''});i++;}
  const payload={shopInfo:{name:fd.get('shopName'),phone:fd.get('phone'),whatsapp:fd.get('whatsapp'),email:fd.get('email'),address:fd.get('address'),hours:fd.get('hours')},shipping:{fee:Number(fd.get('deliveryFee'))||150,freeAbove:Number(fd.get('freeAbove'))||5000},announcement:fd.get('announcement')||'',faqs};
  try{
    const res=await fetch(api('/api/settings'),{method:'PUT',headers:authHeaders(),body:JSON.stringify(payload)});
    if(res.ok)toast('Settings saved!','success');else toast('Save failed','error');
  }catch{toast('Network error','error');}
});

// ── EXPORT CSV ─────────────────────────────────────────
document.getElementById('export-products-btn')?.addEventListener('click',e=>{
  e.preventDefault();
  const rows=[['ID','Name','Category','Brand','SKU','Price','MRP','Stock','Featured','BestSeller'],
    ...PRODUCTS.map(p=>[p.id,p.name,p.category,p.brand||'',p.sku||'',p.price,p.mrp||'',p.stock||0,p.featured?'Yes':'No',p.bestSeller?'Yes':'No'])];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='products.csv';a.click();URL.revokeObjectURL(url);
  toast('Exported as CSV','success');
});

// ── INIT ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  initDark();
  const saved=localStorage.getItem('adminToken');
  if(saved){
    TOKEN=saved;
    fetch(api('/api/admin/me'),{headers:{Authorization:`Bearer ${saved}`}})
      .then(r=>r.json()).then(d=>{if(d.email)initDashboard(d.email);else localStorage.removeItem('adminToken');})
      .catch(()=>{});
  }
});
