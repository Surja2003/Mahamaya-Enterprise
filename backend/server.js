import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'https://mahamaya-enterprise.vercel.app',
      'https://mahamaya-enterprise.onrender.com',
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/
    ];
    if (!origin) return cb(null, true); // allow server-to-server, curl, etc.
    const ok = allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin));
    cb(ok ? null : new Error('CORS: origin not allowed'), ok);
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
const settingsFile = path.join(dataDir, 'settings.json');
const reviewsFile = path.join(dataDir, 'reviews.json');
const quotesFile = path.join(dataDir, 'quotes.json');
const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');
const usersFile = path.join(dataDir, 'users.json');

const defaultSettings = {
  faqs: [],
  shopInfo: {
    name: 'Mahamaya Enterprise',
    address: '',
    phone: '',
    whatsapp: '',
    hours: '',
    email: ''
  },
  shipping: {
    fee: 150,
    freeAbove: 5000
  },
  announcement: 'Daily rates available on WhatsApp.'
};
const defaultReviews = { reviews: [] };
const defaultQuotes = { quotes: [] };
const defaultProducts = { products: [] };
const defaultOrders = { orders: [] };
const defaultUsers = { users: [] };

async function ensureFile(filePath, defaultData) {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

async function readJson(filePath, defaultData) {
  await ensureFile(filePath, defaultData);
  const raw = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data, defaultData) {
  await ensureFile(filePath, defaultData);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function clampNumber(value, min, max, fallback = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return Math.min(Math.max(num, min), max);
}

function sanitizeText(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(v => sanitizeText(v, 30)).filter(Boolean);
  return String(value || '')
    .split(',')
    .map(v => sanitizeText(v, 30))
    .filter(Boolean);
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mahamaya.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(role = 'user') {
  return (req, res, next) => {
    const header = String(req.headers.authorization || '');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) return res.status(401).json({ error: 'Auth required' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (role === 'admin' && decoded.role !== 'admin') {
        return res.status(403).json({ error: 'Admin required' });
      }
      req.auth = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${nanoid(8)}${ext}`);
    }
  }),
  fileFilter: (_req, file, cb) => {
    if (!/image\/(png|jpg|jpeg|webp)/i.test(file.mimetype)) {
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 }
});

app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'Mahamaya Enterprise API' });
});

app.get('/api/settings', async (_req, res) => {
  const settings = await readJson(settingsFile, defaultSettings);
  res.json(settings);
});

app.post('/api/settings', authRequired('admin'), async (req, res) => {
  const { faqs = [], shopInfo = {}, shipping = {}, announcement = '' } = req.body || {};
  if (!Array.isArray(faqs) || typeof shopInfo !== 'object' || shopInfo === null) {
    return res.status(400).json({ error: 'Invalid settings payload' });
  }
  const sanitizedFaqs = faqs
    .filter(f => f && typeof f.q === 'string' && typeof f.a === 'string')
    .map(f => ({ q: f.q.trim().slice(0, 200), a: f.a.trim().slice(0, 300) }));
  const sanitizedShop = {
    name: sanitizeText(shopInfo.name, 80),
    address: sanitizeText(shopInfo.address, 200),
    phone: sanitizeText(shopInfo.phone, 25),
    whatsapp: sanitizeText(shopInfo.whatsapp, 25),
    hours: sanitizeText(shopInfo.hours, 200),
    email: sanitizeText(shopInfo.email, 120)
  };
  const sanitizedShipping = {
    fee: clampNumber(shipping.fee, 0, 100000, defaultSettings.shipping.fee),
    freeAbove: clampNumber(shipping.freeAbove, 0, 10000000, defaultSettings.shipping.freeAbove)
  };
  const sanitizedAnnouncement = sanitizeText(announcement, 200);
  const nextSettings = {
    faqs: sanitizedFaqs,
    shopInfo: sanitizedShop,
    shipping: sanitizedShipping,
    announcement: sanitizedAnnouncement
  };
  await writeJson(settingsFile, nextSettings, defaultSettings);
  res.json(nextSettings);
});

app.get('/api/reviews', async (_req, res) => {
  const { reviews } = await readJson(reviewsFile, defaultReviews);
  res.json({ reviews });
});

app.post('/api/reviews', async (req, res) => {
  const { name, rating, comment } = req.body || {};
  const trimmedName = sanitizeText(name, 30);
  const trimmedComment = sanitizeText(comment, 120);
  const ratingNum = clampNumber(rating, 1, 5, 0);

  if (!trimmedName) {
    return res.status(400).json({ error: 'Valid name required' });
  }
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be 1-5' });
  }
  if (!trimmedComment) {
    return res.status(400).json({ error: 'Valid comment required' });
  }

  const { reviews } = await readJson(reviewsFile, defaultReviews);
  const review = {
    id: nanoid(10),
    name: trimmedName,
    rating: ratingNum,
    comment: trimmedComment,
    createdAt: new Date().toISOString()
  };

  reviews.unshift(review);
  await writeJson(reviewsFile, { reviews: reviews.slice(0, 100) }, defaultReviews);
  res.status(201).json(review);
});

app.get('/api/quotes', async (_req, res) => {
  const { quotes } = await readJson(quotesFile, defaultQuotes);
  res.json({ quotes });
});

app.post('/api/quotes', async (req, res) => {
  const { topic, name, phone, requirement } = req.body || {};
  const trimmedTopic = sanitizeText(topic, 60);
  const trimmedName = sanitizeText(name, 40);
  const trimmedPhone = sanitizeText(phone, 15);
  const trimmedRequirement = sanitizeText(requirement, 200);

  if (!trimmedTopic) {
    return res.status(400).json({ error: 'Valid topic required' });
  }
  if (!/^[0-9]{10,15}$/.test(trimmedPhone)) {
    return res.status(400).json({ error: 'Valid phone required (10-15 digits)' });
  }

  const { quotes } = await readJson(quotesFile, defaultQuotes);
  const entry = {
    id: nanoid(12),
    topic: trimmedTopic,
    name: trimmedName,
    phone: trimmedPhone,
    requirement: trimmedRequirement,
    createdAt: new Date().toISOString()
  };

  quotes.unshift(entry);
  await writeJson(quotesFile, { quotes: quotes.slice(0, 1000) }, defaultQuotes);
  res.status(201).json(entry);
});

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body || {};
  const emailSafe = sanitizeText(email, 120).toLowerCase();
  if (!emailSafe || !password) return res.status(400).json({ error: 'Email and password required' });
  if (emailSafe !== ADMIN_EMAIL.toLowerCase()) return res.status(401).json({ error: 'Invalid credentials' });

  let valid = false;
  if (ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(String(password), ADMIN_PASSWORD_HASH);
  } else {
    valid = String(password) === String(ADMIN_PASSWORD);
  }
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ role: 'admin', email: emailSafe });
  res.json({ token, role: 'admin', email: emailSafe });
});

app.get('/api/admin/me', authRequired('admin'), (req, res) => {
  res.json({ email: req.auth.email, role: 'admin' });
});

app.post('/api/auth/signup', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  const nameSafe = sanitizeText(name, 60);
  const emailSafe = sanitizeText(email, 120).toLowerCase();
  const phoneSafe = sanitizeText(phone, 15);
  if (!nameSafe || !emailSafe || !password) {
    return res.status(400).json({ error: 'Name, email, and password required' });
  }
  const { users } = await readJson(usersFile, defaultUsers);
  const exists = users.some(u => u.email === emailSafe || (phoneSafe && u.phone === phoneSafe));
  if (exists) return res.status(409).json({ error: 'User already exists' });

  const passwordHash = await bcrypt.hash(String(password), 10);
  const user = {
    id: nanoid(12),
    role: 'customer',
    name: nameSafe,
    email: emailSafe,
    phone: phoneSafe,
    passwordHash,
    createdAt: new Date().toISOString()
  };
  users.unshift(user);
  await writeJson(usersFile, { users }, defaultUsers);

  const token = signToken({ role: 'customer', userId: user.id, email: user.email, name: user.name });
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const emailSafe = sanitizeText(email, 120).toLowerCase();
  if (!emailSafe || !password) return res.status(400).json({ error: 'Email and password required' });

  const { users } = await readJson(usersFile, defaultUsers);
  const user = users.find(u => u.email === emailSafe);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = await bcrypt.compare(String(password), user.passwordHash || '');
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ role: 'customer', userId: user.id, email: user.email, name: user.name });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
});

app.get('/api/auth/me', authRequired('user'), async (req, res) => {
  const { users } = await readJson(usersFile, defaultUsers);
  const user = users.find(u => u.id === req.auth.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});

app.get('/api/products', async (req, res) => {
  const { products } = await readJson(productsFile, defaultProducts);
  const search = sanitizeText(req.query.search, 120).toLowerCase();
  const category = sanitizeText(req.query.category, 60).toLowerCase();
  const brand = sanitizeText(req.query.brand, 60).toLowerCase();
  const minPrice = clampNumber(req.query.minPrice, 0, 10000000, 0);
  const maxPrice = clampNumber(req.query.maxPrice, 0, 10000000, 10000000);
  const sort = sanitizeText(req.query.sort, 40);
  const page = clampNumber(req.query.page, 1, 9999, 1);
  const limit = clampNumber(req.query.limit, 1, 200, 24);

  let filtered = products.slice();
  if (search) {
    filtered = filtered.filter(p => {
      const hay = `${p.name} ${p.brand} ${p.category} ${(p.tags || []).join(' ')}`.toLowerCase();
      return hay.includes(search);
    });
  }
  if (category) filtered = filtered.filter(p => String(p.category || '').toLowerCase() === category);
  if (brand) filtered = filtered.filter(p => String(p.brand || '').toLowerCase() === brand);
  filtered = filtered.filter(p => Number(p.price || 0) >= minPrice && Number(p.price || 0) <= maxPrice);

  if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
  if (sort === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  if (sort === 'popular') filtered.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
  if (sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = filtered.slice(start, end);
  res.json({ products: slice, total, page, limit });
});

app.get('/api/products/:id', async (req, res) => {
  const { products } = await readJson(productsFile, defaultProducts);
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/products', authRequired('admin'), async (req, res) => {
  const body = req.body || {};
  const name = sanitizeText(body.name, 120);
  const category = sanitizeText(body.category, 60);
  const brand = sanitizeText(body.brand, 60);
  const sku = sanitizeText(body.sku, 40);
  const shortDesc = sanitizeText(body.shortDesc, 200);
  const longDesc = sanitizeText(body.longDesc, 1200);
  const tags = parseTags(body.tags);
  const price = clampNumber(body.price, 0, 10000000, 0);
  const mrp = clampNumber(body.mrp, 0, 10000000, price);
  const stock = clampNumber(body.stock, 0, 1000000, 0);
  const rating = clampNumber(body.rating, 0, 5, 0);
  const ratingCount = clampNumber(body.ratingCount, 0, 100000, 0);
  const featured = Boolean(body.featured);
  const bestSeller = Boolean(body.bestSeller);
  const imageUrl = sanitizeText(body.imageUrl, 500);

  if (!name || !category || !price) {
    return res.status(400).json({ error: 'Name, category, and price required' });
  }

  const { products } = await readJson(productsFile, defaultProducts);
  const product = {
    id: nanoid(12),
    name,
    category,
    brand,
    sku,
    price,
    mrp,
    stock,
    rating,
    ratingCount,
    shortDesc,
    longDesc,
    tags,
    images: imageUrl ? [imageUrl] : [],
    featured,
    bestSeller,
    soldCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  products.unshift(product);
  await writeJson(productsFile, { products }, defaultProducts);
  res.status(201).json(product);
});

app.put('/api/products/:id', authRequired('admin'), async (req, res) => {
  const { products } = await readJson(productsFile, defaultProducts);
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const body = req.body || {};
  const product = products[index];
  const imageUrl = sanitizeText(body.imageUrl, 500);

  const updated = {
    ...product,
    name: sanitizeText(body.name ?? product.name, 120),
    category: sanitizeText(body.category ?? product.category, 60),
    brand: sanitizeText(body.brand ?? product.brand, 60),
    sku: sanitizeText(body.sku ?? product.sku, 40),
    shortDesc: sanitizeText(body.shortDesc ?? product.shortDesc, 200),
    longDesc: sanitizeText(body.longDesc ?? product.longDesc, 1200),
    tags: body.tags !== undefined ? parseTags(body.tags) : product.tags,
    price: body.price !== undefined ? clampNumber(body.price, 0, 10000000, product.price) : product.price,
    mrp: body.mrp !== undefined ? clampNumber(body.mrp, 0, 10000000, product.mrp) : product.mrp,
    stock: body.stock !== undefined ? clampNumber(body.stock, 0, 1000000, product.stock) : product.stock,
    rating: body.rating !== undefined ? clampNumber(body.rating, 0, 5, product.rating) : product.rating,
    ratingCount: body.ratingCount !== undefined ? clampNumber(body.ratingCount, 0, 100000, product.ratingCount) : product.ratingCount,
    featured: body.featured !== undefined ? Boolean(body.featured) : product.featured,
    bestSeller: body.bestSeller !== undefined ? Boolean(body.bestSeller) : product.bestSeller,
    images: imageUrl ? [imageUrl] : product.images,
    updatedAt: new Date().toISOString()
  };

  products[index] = updated;
  await writeJson(productsFile, { products }, defaultProducts);
  res.json(updated);
});

app.delete('/api/products/:id', authRequired('admin'), async (req, res) => {
  const { products } = await readJson(productsFile, defaultProducts);
  const next = products.filter(p => p.id !== req.params.id);
  await writeJson(productsFile, { products: next }, defaultProducts);
  res.json({ ok: true });
});

app.post('/api/products/:id/image', authRequired('admin'), upload.single('image'), async (req, res) => {
  const { products } = await readJson(productsFile, defaultProducts);
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });
  if (!req.file) return res.status(400).json({ error: 'Image file required' });

  const imagePath = `/uploads/${req.file.filename}`;
  products[index].images = [imagePath, ...(products[index].images || []).filter(img => img !== imagePath)];
  products[index].updatedAt = new Date().toISOString();
  await writeJson(productsFile, { products }, defaultProducts);
  res.json({ image: imagePath, product: products[index] });
});

app.post('/api/orders', async (req, res) => {
  const { items = [], customer = {}, deliveryFee = 0 } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items required' });
  }

  const name = sanitizeText(customer.name, 80);
  const phone = sanitizeText(customer.phone, 15);
  const email = sanitizeText(customer.email, 120).toLowerCase();
  const address = sanitizeText(customer.address, 200);
  const city = sanitizeText(customer.city, 60);
  const state = sanitizeText(customer.state, 60);
  const pincode = sanitizeText(customer.pincode, 10);
  const notes = sanitizeText(customer.notes, 200);

  if (!name || !phone || !address || !city || !pincode) {
    return res.status(400).json({ error: 'Missing customer details' });
  }
  if (!/^[0-9]{10,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone' });
  }

  const { products } = await readJson(productsFile, defaultProducts);
  const orderItems = [];
  let subtotal = 0;

  for (const item of items) {
    const productId = sanitizeText(item.productId, 30);
    const qty = clampNumber(item.qty, 1, 999, 1);
    const product = products.find(p => p.id === productId);
    if (!product) return res.status(400).json({ error: 'Invalid product in cart' });
    const price = clampNumber(product.price, 0, 10000000, 0);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    orderItems.push({
      productId,
      name: product.name,
      price,
      qty,
      lineTotal
    });
  }

  const fee = clampNumber(deliveryFee, 0, 100000, 0);
  const total = subtotal + fee;

  const { orders } = await readJson(ordersFile, defaultOrders);
  const orderNo = `ME-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`;
  const order = {
    id: nanoid(12),
    orderNo,
    status: 'new',
    customer: { name, phone, email, address, city, state, pincode, notes },
    items: orderItems,
    subtotal,
    deliveryFee: fee,
    total,
    createdAt: new Date().toISOString()
  };
  orders.unshift(order);
  await writeJson(ordersFile, { orders }, defaultOrders);

  orderItems.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (!product) return;
    product.soldCount = (product.soldCount || 0) + item.qty;
    if (typeof product.stock === 'number') {
      product.stock = Math.max(0, product.stock - item.qty);
    }
    product.updatedAt = new Date().toISOString();
  });
  await writeJson(productsFile, { products }, defaultProducts);

  res.status(201).json(order);
});

app.post('/api/orders/track', async (req, res) => {
  const orderNo = sanitizeText(req.body?.orderNo, 40).toUpperCase();
  const phone = sanitizeText(req.body?.phone, 15);
  if (!orderNo || !/^[0-9]{10,15}$/.test(phone)) {
    return res.status(400).json({ error: 'Order number and phone required' });
  }

  const { orders } = await readJson(ordersFile, defaultOrders);
  const order = orders.find(o => String(o.orderNo || '').toUpperCase() === orderNo && o.customer?.phone === phone);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  res.json({
    orderNo: order.orderNo,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items || [],
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    customer: {
      name: order.customer?.name || '',
      city: order.customer?.city || '',
      pincode: order.customer?.pincode || ''
    }
  });
});

app.get('/api/orders', authRequired('admin'), async (_req, res) => {
  const { orders } = await readJson(ordersFile, defaultOrders);
  res.json({ orders });
});

app.get('/api/orders/:id', authRequired('admin'), async (req, res) => {
  const { orders } = await readJson(ordersFile, defaultOrders);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
});

app.patch('/api/orders/:id', authRequired('admin'), async (req, res) => {
  const { orders } = await readJson(ordersFile, defaultOrders);
  const index = orders.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Order not found' });
  const status = sanitizeText(req.body.status, 40);
  if (!status) return res.status(400).json({ error: 'Status required' });
  orders[index].status = status;
  await writeJson(ordersFile, { orders }, defaultOrders);
  res.json(orders[index]);
});

app.get('/api/orders/export', authRequired('admin'), async (_req, res) => {
  const { orders } = await readJson(ordersFile, defaultOrders);
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Orders');
  sheet.columns = [
    { header: 'Order ID', key: 'id', width: 20 },
    { header: 'Order No', key: 'orderNo', width: 16 },
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Address', key: 'address', width: 32 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'Pincode', key: 'pincode', width: 12 },
    { header: 'Items', key: 'items', width: 40 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Delivery', key: 'delivery', width: 12 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Status', key: 'status', width: 12 }
  ];

  orders.forEach(order => {
    const items = order.items
      .map(i => `${i.name} x${i.qty}`)
      .join('; ');
    sheet.addRow({
      id: order.id,
      orderNo: order.orderNo,
      date: order.createdAt,
      name: order.customer?.name || '',
      phone: order.customer?.phone || '',
      email: order.customer?.email || '',
      address: order.customer?.address || '',
      city: order.customer?.city || '',
      pincode: order.customer?.pincode || '',
      items,
      subtotal: order.subtotal,
      delivery: order.deliveryFee,
      total: order.total,
      status: order.status
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
  res.send(buffer);
});

app.get('/api/config', (_req, res) => {
  res.json({
    phone: process.env.PHONE_NUMBER || '+919434661990',
    shopName: process.env.SHOP_NAME || 'Mahamaya Enterprise',
    tagline: process.env.SHOP_TAGLINE || 'Hardware - Paint - Electrical',
    address: process.env.SHOP_ADDRESS || 'Vill + PO - Eraur, P.S - Bhatar, District - Purba Bardhaman, PIN - 713121',
    hours: process.env.OPEN_HOURS || 'Morning: 7:00 AM – 1:00 PM, Evening: 4:00 PM – 8:30 PM'
  });
});

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

const port = Number(process.env.PORT || 3000);

// === APPENDED ROUTES ===

const couponsFile = path.join(dataDir, 'coupons.json');
const defaultCoupons = { coupons: [] };

// ── ORDER TRACKING ─────────────────────────────────────
app.post('/api/orders/track', async (req, res) => {
  try {
    const { orderNo, phone } = req.body;
    if (!orderNo) return res.status(400).json({ error: 'Order number required' });
    const { orders } = await readJson(ordersFile, defaultOrders);
    const order = orders.find(o => o.orderNo === String(orderNo).toUpperCase().trim() && (!phone || o.customer?.phone?.replace(/\D/g,'') === String(phone).replace(/\D/g,'')));
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
    if (subtotal < coupon.minOrder) return res.status(400).json({ error: `Minimum order ${coupon.minOrder} required` });
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
    const imageUrl = `/uploads/${req.file.filename}`;
    if (!product.images) product.images = [];
    product.images.unshift(imageUrl);
    product.updatedAt = new Date().toISOString();
    await writeJson(productsFile, data, defaultProducts);
    res.json({ imageUrl, product });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

// === END APPENDED ROUTES ===

app.listen(port, () => {
  console.log(`Mahamaya server running on http://localhost:${port}`);
});
