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
import { createClient } from '@supabase/supabase-js';

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
    if (!origin) return cb(null, true);
    const ok = allowed.some(p => typeof p === 'string' ? p === origin : p.test(origin));
    cb(ok ? null : new Error('CORS: origin not allowed'), ok);
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'uploads');
const productsFile = path.join(dataDir, 'products.json');
const settingsFile = path.join(dataDir, 'settings.json');

const defaultSettings = {
  faqs: [],
  shopInfo: {
    name: 'Mahamaya Enterprise',
    address: 'Vill & PO - Eraur, P.S - Bhatar, District - Purba Bardhaman, PIN - 713121',
    phone: '+919434661990',
    whatsapp: '+919434661990',
    hours: 'Morning: 7:00 AM – 1:00 PM, Evening: 4:00 PM – 8:30 PM',
    email: 'admin@mahamaya.local'
  },
  shipping: {
    fee: 150,
    freeAbove: 5000
  },
  announcement: 'Daily rates available on WhatsApp.'
};

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('CRITICAL: Supabase environment variables (SUPABASE_URL, SUPABASE_KEY) are missing!');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Bootstrap / Seed Database
async function bootstrapDatabase() {
  try {
    // 1. Seed Products if empty
    const { count, error: countErr } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });
      
    if (countErr) {
      console.error('Error contacting Supabase for products count:', countErr);
    } else if (count === 0) {
      console.log('Supabase products table is empty. Starting seeding catalog...');
      let rawProducts = [];
      try {
        const raw = await fs.readFile(productsFile, 'utf-8');
        const parsed = JSON.parse(raw);
        rawProducts = parsed.products || [];
      } catch (err) {
        console.error('Could not read local products.json file to seed:', err);
      }
      
      if (rawProducts.length > 0) {
        console.log(`Seeding ${rawProducts.length} products to database...`);
        const { error: insertErr } = await supabase.from('products').insert(rawProducts);
        if (insertErr) {
          console.error('Database product seeding failed:', insertErr);
        } else {
          console.log('Database products seeded successfully!');
        }
      }
    } else {
      console.log(`Database already has ${count} products. Seeding skipped.`);
    }

    // 2. Seed default Settings if empty
    const { data: settingsCheck } = await supabase
      .from('settings')
      .select('key')
      .eq('key', 'config')
      .maybeSingle();
      
    if (!settingsCheck) {
      console.log('Settings config row not found. Seeding default settings...');
      let localSettings = defaultSettings;
      try {
        const raw = await fs.readFile(settingsFile, 'utf-8');
        localSettings = JSON.parse(raw);
      } catch {}
      const { error: settingsErr } = await supabase
        .from('settings')
        .upsert({ key: 'config', value: localSettings });
      if (settingsErr) {
        console.error('Database settings seeding failed:', settingsErr);
      } else {
        console.log('Database settings seeded successfully!');
      }
    }
  } catch (err) {
    console.error('Error during database bootstrapping:', err);
  }
}
bootstrapDatabase();

// Helpers
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

// ── SETTINGS ───────────────────────────────────────────
app.get('/api/settings', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'config')
      .maybeSingle();
    if (error) throw error;
    res.json(data ? data.value : defaultSettings);
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/settings', authRequired('admin'), async (req, res) => {
  try {
    const { faqs = [], shopInfo = {}, shipping = {}, announcement = '' } = req.body || {};
    if (!Array.isArray(faqs) || typeof shopInfo !== 'object' || shopInfo === null) {
      return res.status(400).json({ error: 'Invalid settings payload' });
    }
    const sanitizedFaqs = faqs
      .filter(f => f && typeof f.question === 'string' && typeof f.answer === 'string')
      .map(f => ({ question: f.question.trim().slice(0, 200), answer: f.answer.trim().slice(0, 300) }));
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
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'config', value: nextSettings, updatedAt: new Date().toISOString() });
    if (error) throw error;
    res.json(nextSettings);
  } catch (err) {
    console.error('Post settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── REVIEWS ────────────────────────────────────────────
app.get('/api/reviews', async (_req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ reviews: reviews || [] });
  } catch (err) {
    console.error('Get reviews error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { name, rating, comment } = req.body || {};
    const trimmedName = sanitizeText(name, 30);
    const trimmedComment = sanitizeText(comment, 120);
    const ratingNum = clampNumber(rating, 1, 5, 0);

    if (!trimmedName || !trimmedComment || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Valid name, rating (1-5), and comment required' });
    }

    const review = {
      id: nanoid(10),
      name: trimmedName,
      rating: ratingNum,
      comment: trimmedComment,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('reviews').insert(review);
    if (error) throw error;
    res.status(201).json(review);
  } catch (err) {
    console.error('Post review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/reviews/:id', authRequired('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete review error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── QUOTES ─────────────────────────────────────────────
app.get('/api/quotes', authRequired('admin'), async (_req, res) => {
  try {
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(1000);
    if (error) throw error;
    res.json({ quotes: quotes || [] });
  } catch (err) {
    console.error('Get quotes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const { topic, name, phone, requirement } = req.body || {};
    const trimmedTopic = sanitizeText(topic, 60);
    const trimmedName = sanitizeText(name, 40);
    const trimmedPhone = sanitizeText(phone, 20);
    const trimmedRequirement = sanitizeText(requirement, 500);

    if (!trimmedTopic) return res.status(400).json({ error: 'Valid topic required' });
    if (!/^[0-9]{10,15}$/.test(trimmedPhone.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Valid phone required (10-15 digits)' });
    }

    const quote = {
      id: nanoid(10),
      topic: trimmedTopic,
      name: trimmedName,
      phone: trimmedPhone,
      requirement: trimmedRequirement,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('quotes').insert(quote);
    if (error) throw error;
    res.json(quote);
  } catch (err) {
    console.error('Post quote error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN LOGIN ────────────────────────────────────────
app.post('/api/admin/login', async (req, res) => {
  try {
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
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/admin/me', authRequired('admin'), (req, res) => {
  res.json({ email: req.auth.email, role: req.auth.role });
});

// ── USER AUTH ──────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};
    const nameSafe = sanitizeText(name, 60);
    const emailSafe = sanitizeText(email, 120).toLowerCase();
    const phoneSafe = sanitizeText(phone, 20);
    if (!nameSafe || !emailSafe || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Check if user already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailSafe)
      .maybeSingle();

    if (existingEmail) return res.status(409).json({ error: 'Email already registered' });

    if (phoneSafe) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', phoneSafe)
        .maybeSingle();
      if (existingPhone) return res.status(409).json({ error: 'Phone already registered' });
    }

    const hash = await bcrypt.hash(String(password), 10);
    const user = {
      id: nanoid(10),
      role: 'customer',
      name: nameSafe,
      email: emailSafe,
      phone: phoneSafe,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('users').insert(user);
    if (error) throw error;

    const token = signToken({ role: 'customer', id: user.id, userId: user.id, email: user.email, name: user.name });
    res.status(201).json({ token, name: user.name, email: user.email });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailSafe = sanitizeText(email, 120).toLowerCase();
    if (!emailSafe || !password) return res.status(400).json({ error: 'Email and password required' });

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailSafe)
      .maybeSingle();
      
    if (error) throw error;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(String(password), user.passwordHash || '');
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken({ role: 'customer', id: user.id, userId: user.id, email: user.email, name: user.name });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', authRequired('user'), async (req, res) => {
  try {
    const userId = req.auth.id || req.auth.userId;
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Get user auth me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── PRODUCTS CRUD ──────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) throw error;

    const search = sanitizeText(req.query.search, 120).toLowerCase();
    const category = sanitizeText(req.query.category, 60).toLowerCase();
    const brand = sanitizeText(req.query.brand, 60).toLowerCase();
    const minPrice = clampNumber(req.query.minPrice, 0, 10000000, 0);
    const maxPrice = clampNumber(req.query.maxPrice, 0, 10000000, 10000000);
    const sort = sanitizeText(req.query.sort, 40);
    const page = clampNumber(req.query.page, 1, 9999, 1);
    const limit = clampNumber(req.query.limit, 1, 500, 24);

    let filtered = (products || []).slice();

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
  } catch (err) {
    console.error('Get products list error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Get product detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products', authRequired('admin'), async (req, res) => {
  try {
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
    const minQty = clampNumber(body.minQty, 1, 10000, 1);
    const qtyStep = clampNumber(body.qtyStep, 1, 10000, 1);
    const variants = body.variants || null;

    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Name, category, and price required' });
    }

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
      minQty,
      qtyStep,
      variants,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { error } = await supabase.from('products').insert(product);
    if (error) throw error;
    res.status(201).json(product);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/products/:id', authRequired('admin'), async (req, res) => {
  try {
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !product) return res.status(404).json({ error: 'Product not found' });

    const body = req.body || {};
    const imageUrl = sanitizeText(body.imageUrl, 500);

    const updated = {
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
      minQty: body.minQty !== undefined ? clampNumber(body.minQty, 1, 10000, product.minQty) : product.minQty,
      qtyStep: body.qtyStep !== undefined ? clampNumber(body.qtyStep, 1, 10000, product.qtyStep) : product.qtyStep,
      variants: body.variants !== undefined ? body.variants : product.variants,
      images: imageUrl ? [imageUrl] : product.images,
      updatedAt: new Date().toISOString()
    };

    const { error: updateErr } = await supabase
      .from('products')
      .update(updated)
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;
    res.json({ id: req.params.id, ...updated });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/products/:id', authRequired('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('products').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/products/:id/image', authRequired('admin'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    const { data: product, error: fetchErr } = await supabase
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchErr || !product) return res.status(404).json({ error: 'Product not found' });
    const imageUrl = `/uploads/${req.file.filename}`;
    const images = product.images || [];
    images.unshift(imageUrl);

    const { error: updateErr } = await supabase
      .from('products')
      .update({ images, updatedAt: new Date().toISOString() })
      .eq('id', req.params.id);

    if (updateErr) throw updateErr;
    res.json({ imageUrl, product: { ...product, images } });
  } catch (err) {
    console.error('Product image upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ORDERS CRUD ────────────────────────────────────────
app.get('/api/orders', authRequired('admin'), async (_req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json({ orders: orders || [] });
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── SALES REPORTS EXPORT ────────────────────────────────
app.get('/api/orders/export', authRequired('admin'), async (req, res) => {
  try {
    const { startDate, endDate, format } = req.query;
    let query = supabase.from('orders').select('*');
    
    if (startDate) {
      query = query.gte('createdAt', `${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      query = query.lte('createdAt', `${endDate}T23:59:59.999Z`);
    }
    
    const { data: orders, error } = await query.order('createdAt', { ascending: false });
    if (error) throw error;

    const reportOrders = orders || [];

    if (format === 'csv') {
      const headers = [
        'Order ID', 'Order No', 'Date', 'Customer Name', 'Phone', 'Email',
        'Address', 'City', 'State', 'Pincode', 'Notes',
        'Items', 'Subtotal', 'Delivery Fee', 'Total', 'Status'
      ];

      const rows = reportOrders.map(order => {
        const customer = order.customer || {};
        const itemsStr = (order.items || [])
          .map(i => `${i.name}${i.variant ? ' (' + i.variant + ')' : ''} x${i.qty}`)
          .join('; ');

        return [
          order.id,
          order.orderNo,
          order.createdAt,
          customer.name || '',
          customer.phone || '',
          customer.email || '',
          customer.address || '',
          customer.city || '',
          customer.state || '',
          customer.pincode || '',
          customer.notes || '',
          itemsStr,
          order.subtotal,
          order.deliveryFee,
          order.total,
          order.status
        ];
      });

      const csvContent = [headers, ...rows]
        .map(row => row.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
      return res.send(csvContent);
    } else {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Sales Report');

      sheet.columns = [
        { header: 'Order ID', key: 'id', width: 20 },
        { header: 'Order No', key: 'orderNo', width: 16 },
        { header: 'Date', key: 'date', width: 22 },
        { header: 'Customer Name', key: 'name', width: 20 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Email', key: 'email', width: 24 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'City', key: 'city', width: 16 },
        { header: 'State', key: 'state', width: 16 },
        { header: 'Pincode', key: 'pincode', width: 12 },
        { header: 'Notes', key: 'notes', width: 20 },
        { header: 'Items', key: 'items', width: 40 },
        { header: 'Subtotal (Rs.)', key: 'subtotal', width: 14 },
        { header: 'Delivery (Rs.)', key: 'delivery', width: 14 },
        { header: 'Total (Rs.)', key: 'total', width: 14 },
        { header: 'Status', key: 'status', width: 12 }
      ];

      // Format header style
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1E293B' }
      };

      reportOrders.forEach(order => {
        const customer = order.customer || {};
        const itemsStr = (order.items || [])
          .map(i => `${i.name}${i.variant ? ' (' + i.variant + ')' : ''} x${i.qty}`)
          .join('; ');

        sheet.addRow({
          id: order.id,
          orderNo: order.orderNo,
          date: order.createdAt,
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          notes: customer.notes || '',
          items: itemsStr,
          subtotal: Number(order.subtotal || 0),
          delivery: Number(order.deliveryFee || 0),
          total: Number(order.total || 0),
          status: order.status
        });
      });

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.getCell('subtotal').numFmt = '#,##0.00';
          row.getCell('delivery').numFmt = '#,##0.00';
          row.getCell('total').numFmt = '#,##0.00';
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales_report.xlsx"');
      return res.send(buffer);
    }
  } catch (err) {
    console.error('Export report error:', err);
    res.status(500).json({ error: 'Server error generating sales report' });
  }
});

app.get('/api/orders/:id', authRequired('admin'), async (req, res) => {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error) throw error;
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items = [], customer = {}, deliveryFee = 0, couponCode = null } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order items required' });
    }

    const name = sanitizeText(customer.name, 80);
    const phone = sanitizeText(customer.phone, 20);
    const email = sanitizeText(customer.email, 120).toLowerCase();
    const address = sanitizeText(customer.address, 200);
    const city = sanitizeText(customer.city, 60);
    const state = sanitizeText(customer.state, 60);
    const pincode = sanitizeText(customer.pincode, 10);
    const notes = sanitizeText(customer.notes, 200);

    if (!name || !phone || !address || !city || !pincode) {
      return res.status(400).json({ error: 'Missing customer details' });
    }
    if (!/^[0-9]{10,15}$/.test(phone.replace(/\D/g, ''))) {
      return res.status(400).json({ error: 'Invalid phone' });
    }

    const orderItems = [];
    let subtotal = 0;

    // 1. Process items, validate quantity step limits and variant pricing
    for (const item of items) {
      const productId = sanitizeText(item.productId, 30);
      const variant = item.variant ? sanitizeText(item.variant, 80) : null;
      const qty = clampNumber(item.qty, 1, 999999, 1);

      const { data: product, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error || !product) {
        return res.status(400).json({ error: `Invalid product in cart: ${productId}` });
      }

      // Check stock first
      if (product.stock < qty) {
        return res.status(400).json({ error: `Insufficient stock for '${product.name}'. Available: ${product.stock}, Ordered: ${qty}` });
      }

      let price = clampNumber(product.price, 0, 10000000, 0);
      if (product.variants && product.variants.length > 0) {
        if (!variant) {
          return res.status(400).json({ error: `Please specify a variant for product: ${product.name}` });
        }
        const matchedVariant = product.variants.find(v => v.value === variant);
        if (!matchedVariant) {
          return res.status(400).json({ error: `Invalid variant '${variant}' for product: ${product.name}` });
        }
        price = clampNumber(matchedVariant.price, 0, 10000000, 0);
      } else {
        if (variant) {
          return res.status(400).json({ error: `Product '${product.name}' does not accept variants` });
        }
      }

      const minQty = typeof product.minQty === 'number' ? product.minQty : 1;
      const qtyStep = typeof product.qtyStep === 'number' ? product.qtyStep : 1;

      if (qty < minQty) {
        return res.status(400).json({ error: `Minimum quantity for ${product.name} is ${minQty}` });
      }
      if (qty % qtyStep !== 0) {
        return res.status(400).json({ error: `Quantity for ${product.name} must be a multiple of ${qtyStep}` });
      }

      const lineTotal = price * qty;
      subtotal += lineTotal;
      orderItems.push({
        productId,
        name: product.name,
        variant,
        price,
        qty,
        lineTotal
      });
    }

    // 2. Compute final order values
    const fee = clampNumber(deliveryFee, 0, 100000, 0);
    const total = subtotal + fee;

    // Generate Order Number
    const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true });
    const orderNo = `ME-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;

    const customerObj = { name, phone, email, address, city, state, pincode, notes };

    const order = {
      id: nanoid(12),
      orderNo,
      status: 'new',
      customer: customerObj,
      items: orderItems,
      subtotal,
      deliveryFee: fee,
      total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 3. Write order to Supabase
    const { error: orderInsertErr } = await supabase.from('orders').insert(order);
    if (orderInsertErr) throw orderInsertErr;

    // 4. Update Product Stock (Deduct quantity purchased)
    for (const item of orderItems) {
      const { data: product } = await supabase
        .from('products')
        .select('stock, soldCount')
        .eq('id', item.productId)
        .maybeSingle();

      if (product) {
        const nextStock = Math.max(0, (product.stock || 0) - item.qty);
        const nextSoldCount = (product.soldCount || 0) + item.qty;
        
        await supabase
          .from('products')
          .update({
            stock: nextStock,
            soldCount: nextSoldCount,
            updatedAt: new Date().toISOString()
          })
          .eq('id', item.productId);
      }
    }

    // 5. Update coupon usage if applicable
    if (couponCode) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('usedCount')
        .eq('code', couponCode.toUpperCase())
        .maybeSingle();

      if (coupon) {
        await supabase
          .from('coupons')
          .update({ usedCount: (coupon.usedCount || 0) + 1 })
          .eq('code', couponCode.toUpperCase());
      }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Server error placing order' });
  }
});

app.post('/api/orders/track', async (req, res) => {
  try {
    const orderNo = sanitizeText(req.body?.orderNo, 40).toUpperCase().trim();
    const phone = sanitizeText(req.body?.phone, 20);
    if (!orderNo) return res.status(400).json({ error: 'Order number required' });

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('orderNo', orderNo)
      .maybeSingle();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });

    // Validate phone number digits match
    const cleanOrderPhone = String(order.customer?.phone || '').replace(/\D/g, '');
    const cleanSearchPhone = String(phone || '').replace(/\D/g, '');

    if (phone && cleanOrderPhone !== cleanSearchPhone) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (err) {
    console.error('Order tracking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/orders/:id/status', authRequired('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['new', 'confirmed', 'packed', 'dispatched', 'delivered', 'cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    // If cancelling, optionally restock quantities?
    // The user's specification states: "after successful purchase the products quantity should update example i have 10 products customer ordered 2 and the purchase is done , the updated quantity will be 8".
    // We already do this at checkout. If status transitions to cancelled, we can restock if needed. But for simple flow, we leave it as standard checkout stock deduction.
    
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status, updatedAt: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .maybeSingle();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



// ── COUPONS CRUD ───────────────────────────────────────
app.get('/api/coupons', authRequired('admin'), async (_req, res) => {
  try {
    const { data: coupons, error } = await supabase
      .from('coupons')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json({ coupons: coupons || [] });
  } catch (err) {
    console.error('Get coupons error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/coupons', authRequired('admin'), async (req, res) => {
  try {
    const { code, type, value, minOrder = 0, maxUses = 0 } = req.body;
    if (!code || !type || !value) return res.status(400).json({ error: 'code, type, value required' });
    
    // Check duplication
    const { data: existing } = await supabase
      .from('coupons')
      .select('id')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();

    if (existing) return res.status(400).json({ error: 'Coupon code already exists' });

    const coupon = {
      id: nanoid(10),
      code: code.toUpperCase().trim(),
      type,
      value: Number(value),
      minOrder: Number(minOrder),
      maxUses: Number(maxUses),
      usedCount: 0,
      createdAt: new Date().toISOString()
    };

    const { error } = await supabase.from('coupons').insert(coupon);
    if (error) throw error;
    res.json(coupon);
  } catch (err) {
    console.error('Create coupon error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/coupons/:id', authRequired('admin'), async (req, res) => {
  try {
    const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete coupon error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/coupons/validate', async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required' });
    
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();

    if (error || !coupon) return res.status(404).json({ error: 'Invalid coupon code' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }
    if (subtotal < coupon.minOrder) {
      return res.status(400).json({ error: `Minimum order Rs. ${coupon.minOrder} required` });
    }

    const discount = coupon.type === 'percent' ? Math.round(subtotal * coupon.value / 100) : coupon.value;
    res.json({ valid: true, discount, coupon });
  } catch (err) {
    console.error('Validate coupon error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ANALYTICS ──────────────────────────────────────────
app.get('/api/admin/analytics', authRequired('admin'), async (_req, res) => {
  try {
    const { data: orders, error: oErr } = await supabase
      .from('orders')
      .select('*')
      .neq('status', 'cancelled');
      
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*');

    if (oErr || pErr) throw (oErr || pErr);

    const now = new Date();
    const dailyRevenue = [];

    // Calculate last 14 days of revenue
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const revenue = (orders || [])
        .filter(o => (o.createdAt || '').startsWith(dateStr))
        .reduce((sum, o) => sum + (o.total || 0), 0);
      dailyRevenue.push({ date: dateStr, revenue });
    }

    const soldMap = {};
    (orders || []).forEach(o => {
      (o.items || []).forEach(item => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + (item.qty || 1);
      });
    });

    const topProducts = (products || [])
      .map(p => ({ ...p, soldCount: soldMap[p.id] || 0 }))
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);

    res.json({ dailyRevenue, topProducts });
  } catch (err) {
    console.error('Get analytics error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN CUSTOMERS ────────────────────────────────────
app.get('/api/admin/customers', authRequired('admin'), async (_req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email, phone, createdAt')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json({ users: users || [] });
  } catch (err) {
    console.error('Get admin customers error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── BASE CONFIG ────────────────────────────────────────
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

app.listen(port, () => {
  console.log(`Mahamaya server running on http://localhost:${port}`);
});
