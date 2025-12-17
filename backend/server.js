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

  dotenv.config();

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '512kb' }));
  app.use(morgan('dev'));

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use('/api/', apiLimiter);

  const dataDir = path.join(__dirname, 'data');
  const settingsFile = path.join(dataDir, 'settings.json');
  const reviewsFile = path.join(dataDir, 'reviews.json');
  const quotesFile = path.join(dataDir, 'quotes.json');

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

  const defaultSettings = { faqs: [], shopInfo: {} };
  const defaultReviews = { reviews: [] };
  const defaultQuotes = { quotes: [] };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'Mahamaya Enterprise API' });
  });

  app.get('/api/settings', async (_req, res) => {
    const settings = await readJson(settingsFile, defaultSettings);
    res.json(settings);
  });

  app.post('/api/settings', async (req, res) => {
    const { faqs = [], shopInfo = {} } = req.body || {};
    if (!Array.isArray(faqs) || typeof shopInfo !== 'object' || shopInfo === null) {
      return res.status(400).json({ error: 'Invalid settings payload' });
    }
    const sanitizedFaqs = faqs
      .filter(f => f && typeof f.q === 'string' && typeof f.a === 'string')
      .map(f => ({ q: f.q.trim().slice(0, 200), a: f.a.trim().slice(0, 300) }));
    const sanitizedShop = {
      name: String(shopInfo.name || '').trim().slice(0, 80),
      address: String(shopInfo.address || '').trim().slice(0, 200),
      phone: String(shopInfo.phone || '').trim().slice(0, 25),
      whatsapp: String(shopInfo.whatsapp || '').trim().slice(0, 25),
      hours: String(shopInfo.hours || '').trim().slice(0, 200)
    };
    await writeJson(settingsFile, { faqs: sanitizedFaqs, shopInfo: sanitizedShop }, defaultSettings);
    res.json({ ok: true });
  });

  app.get('/api/reviews', async (_req, res) => {
    const { reviews } = await readJson(reviewsFile, defaultReviews);
    res.json({ reviews });
  });

  app.post('/api/reviews', async (req, res) => {
    const { name, rating, comment } = req.body || {};
    const trimmedName = String(name || '').trim();
    const trimmedComment = String(comment || '').trim();
    const ratingNum = Number(rating);

    if (!trimmedName || trimmedName.length > 30) {
      return res.status(400).json({ error: 'Valid name required' });
    }
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating must be 1-5' });
    }
    if (!trimmedComment || trimmedComment.length > 120) {
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

  app.get('/api/quotes/:id', async (req, res) => {
    const { quotes } = await readJson(quotesFile, defaultQuotes);
    const found = quotes.find(q => q.id === req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(found);
  });

  app.post('/api/quotes', async (req, res) => {
    const { topic, name, phone, requirement } = req.body || {};
    const trimmedTopic = String(topic || '').trim();
    const trimmedName = String(name || '').trim();
    const trimmedPhone = String(phone || '').trim();
    const trimmedRequirement = String(requirement || '').trim();

    if (!trimmedTopic || trimmedTopic.length > 60) {
      return res.status(400).json({ error: 'Valid topic required' });
    }
    if (!/^[0-9]{10,15}$/.test(trimmedPhone)) {
      return res.status(400).json({ error: 'Valid phone required (10-15 digits)' });
    }
    if (trimmedName.length > 40) {
      return res.status(400).json({ error: 'Name too long' });
    }
    if (trimmedRequirement.length > 200) {
      return res.status(400).json({ error: 'Requirement too long' });
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

  app.get('/api/products', (_req, res) => {
    const categories = [
      { key: 'tmt', name: 'Rod / TMT', desc: 'Daily rate updates, wholesale bundles' },
      { key: 'cement', name: 'Cement', desc: 'Birla, Dalmia, UltraTech, and more' },
      { key: 'bricks', name: 'Bricks', desc: 'First-class, picked and stacked' },
      { key: 'sand', name: 'Sand & Stone', desc: 'Clean river sand, chips' },
      { key: 'paint', name: 'Paint', desc: 'Berger shades, putty, primer' },
      { key: 'electrical', name: 'Electrical', desc: 'Cables, switches, lighting' },
      { key: 'plumbing', name: 'Water Line', desc: 'Pipes, fittings, tanks' }
    ];
    res.json({ categories });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      phone: process.env.PHONE_NUMBER || '+919434661990',
      shopName: process.env.SHOP_NAME || 'Mahamaya Enterprise',
      tagline: process.env.SHOP_TAGLINE || 'Hardware · Paint · Electrical',
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
