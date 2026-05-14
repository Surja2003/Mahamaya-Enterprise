// Run with: node append_routes.js
import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

const serverPath = path.join(__dirname, 'server.js');
let code = await fs.readFile(serverPath, 'utf-8');

// Only append if not already added
if (code.includes('// === APPENDED ROUTES ===')) {
  console.log('Routes already appended. Skipping.');
  process.exit(0);
}

// Find the app.listen line and insert before it
const listenIdx = code.lastIndexOf('app.listen(');
if (listenIdx === -1) {
  console.error('Could not find app.listen in server.js');
  process.exit(1);
}

const newRoutes = `
// === APPENDED ROUTES ===

const couponsFile = path.join(dataDir, 'coupons.json');
const defaultCoupons = { coupons: [] };

// ── ORDER TRACKING ─────────────────────────────────────
app.post('/api/orders/track', async (req, res) => {
  try {
    const { orderNo, phone } = req.body;
    if (!orderNo) return res.status(400).json({ error: 'Order number required' });
    const { orders } = await readJson(ordersFile, defaultOrders);
    const order = orders.find(o => o.orderNo === String(orderNo).toUpperCase().trim() && (!phone || o.customer?.phone?.replace(/\\D/g,'') === String(phone).replace(/\\D/g,'')));
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (e) { res.status(500).json({ error: 'Server error' }); }
});

// ── PATCH ORDER STATUS ─────────────────────────────────
app.patch('/api/orders/:id/status', authRequired('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['new','confirmed','packed','dispatched','delivered','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const data = await readJson(ordersFile, defaultOrders);
    const order = data.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    order.status = status;
    order.updatedAt = new Date().toISOString();
    await writeJson(ordersFile, data, defaultOrders);
    res.json(order);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── COUPONS ────────────────────────────────────────────
app.get('/api/coupons', authRequired('admin'), async (req, res) => {
  try { const data = await readJson(couponsFile, defaultCoupons); res.json(data); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/coupons', authRequired('admin'), async (req, res) => {
  try {
    const { code, type, value, minOrder = 0, maxUses = 0 } = req.body;
    if (!code || !type || !value) return res.status(400).json({ error: 'code, type, value required' });
    const data = await readJson(couponsFile, defaultCoupons);
    if (data.coupons.find(c => c.code === code.toUpperCase())) return res.status(400).json({ error: 'Coupon code already exists' });
    const coupon = { id: nanoid(10), code: code.toUpperCase().trim(), type, value: Number(value), minOrder: Number(minOrder), maxUses: Number(maxUses), usedCount: 0, createdAt: new Date().toISOString() };
    data.coupons.push(coupon);
    await writeJson(couponsFile, data, defaultCoupons);
    res.json(coupon);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.delete('/api/coupons/:id', authRequired('admin'), async (req, res) => {
  try {
    const data = await readJson(couponsFile, defaultCoupons);
    const before = data.coupons.length;
    data.coupons = data.coupons.filter(c => c.id !== req.params.id);
    if (data.coupons.length === before) return res.status(404).json({ error: 'Not found' });
    await writeJson(couponsFile, data, defaultCoupons);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    const data = await readJson(couponsFile, defaultCoupons);
    const coupon = data.coupons.find(c => c.code === code.toUpperCase());
    if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ error: 'Coupon usage limit reached' });
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: \`Minimum order \${coupon.minOrder} required\` });
    const discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
    res.json({ valid: true, discount, coupon });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── ANALYTICS ─────────────────────────────────────────
app.get('/api/admin/analytics', authRequired('admin'), async (req, res) => {
  try {
    const { orders = [] } = await readJson(ordersFile, defaultOrders);
    const { products = [] } = await readJson(productsFile, defaultProducts);
    const now = new Date();
    const dailyRevenue = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const revenue = orders.filter(o => o.status !== 'cancelled' && (o.createdAt || '').startsWith(dateStr)).reduce((s, o) => s + (o.total || 0), 0);
      dailyRevenue.push({ date: dateStr, revenue });
    }
    const soldMap = {};
    orders.filter(o => o.status !== 'cancelled').forEach(o => {
      (o.items || []).forEach(i => { soldMap[i.productId] = (soldMap[i.productId] || 0) + (i.qty || 1); });
    });
    const topProducts = products.map(p => ({ ...p, soldCount: soldMap[p.id] || 0 })).sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);
    res.json({ dailyRevenue, topProducts });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN CUSTOMERS ─────────────────────────────────────
app.get('/api/admin/customers', authRequired('admin'), async (req, res) => {
  try { const data = await readJson(usersFile, defaultUsers); res.json(data); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

// ── ADMIN ME ───────────────────────────────────────────
app.get('/api/admin/me', authRequired('admin'), (req, res) => {
  res.json({ email: req.auth.email, role: req.auth.role });
});

// ── REVIEWS CRUD ───────────────────────────────────────
app.delete('/api/reviews/:id', authRequired('admin'), async (req, res) => {
  try {
    const data = await readJson(reviewsFile, defaultReviews);
    const before = data.reviews.length;
    data.reviews = data.reviews.filter(r => r.id !== req.params.id);
    if (data.reviews.length === before) return res.status(404).json({ error: 'Not found' });
    await writeJson(reviewsFile, data, defaultReviews);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── QUOTES ─────────────────────────────────────────────
app.get('/api/quotes', authRequired('admin'), async (req, res) => {
  try { const data = await readJson(quotesFile, defaultQuotes); res.json(data); }
  catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { topic, name, phone, requirement } = req.body;
    const data = await readJson(quotesFile, defaultQuotes);
    const quote = { id: nanoid(10), topic: sanitizeText(topic), name: sanitizeText(name), phone: sanitizeText(phone, 20), requirement: sanitizeText(requirement, 500), createdAt: new Date().toISOString() };
    data.quotes.push(quote);
    await writeJson(quotesFile, data, defaultQuotes);
    res.json(quote);
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── USER AUTH SIGNUP ───────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const data = await readJson(usersFile, defaultUsers);
    if (data.users.find(u => u.email === email.toLowerCase())) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = { id: nanoid(10), name: sanitizeText(name), email: email.toLowerCase().trim(), phone: sanitizeText(phone,20), passwordHash: hash, createdAt: new Date().toISOString() };
    data.users.push(user);
    await writeJson(usersFile, data, defaultUsers);
    const token = signToken({ id: user.id, email: user.email, role: 'user' });
    res.json({ token, name: user.name, email: user.email });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── USER AUTH ME ───────────────────────────────────────
app.get('/api/auth/me', authRequired('user'), async (req, res) => {
  try {
    const data = await readJson(usersFile, defaultUsers);
    const user = data.users.find(u => u.id === req.auth.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// ── PRODUCT IMAGE UPLOAD ───────────────────────────────
app.post('/api/products/:id/image', authRequired('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const data = await readJson(productsFile, defaultProducts);
    const product = data.products.find(p => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const imageUrl = \`/uploads/\${req.file.filename}\`;
    if (!product.images) product.images = [];
    product.images.unshift(imageUrl);
    product.updatedAt = new Date().toISOString();
    await writeJson(productsFile, data, defaultProducts);
    res.json({ imageUrl, product });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// === END APPENDED ROUTES ===
`;

const before = code.slice(0, listenIdx);
const after = code.slice(listenIdx);
const updated = before + newRoutes + '\n' + after;
await fs.writeFile(serverPath, updated, 'utf-8');
console.log('server.js updated successfully. Total lines:', updated.split('\n').length);
