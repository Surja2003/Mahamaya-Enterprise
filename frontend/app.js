// --- Language handling ---
let currentLang = localStorage.getItem('lang') || 'en';
let activeProductKey = null;
let reviewsCache = null;

// --- Mobile nav (hamburger) ---
function updateMobileMenuA11y() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('main-nav');
  if (!btn || !nav) return;
  const isOpen = nav.classList.contains('open');
  btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  btn.setAttribute('aria-label', t(isOpen ? 'menuCloseLabel' : 'menuOpenLabel', currentLang));
}

function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('main-nav');
  if (!btn || !nav) return;

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
  const setOpen = (open) => {
    nav.classList.toggle('open', !!open);
    updateMobileMenuA11y();
  };

  setOpen(false);

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    setOpen(!nav.classList.contains('open'));
  });

  nav.addEventListener('click', (e) => {
    const link = e.target && e.target.closest && e.target.closest('a');
    if (link && isMobile()) setOpen(false);
  });

  document.addEventListener('click', (e) => {
    if (!isMobile()) return;
    if (!nav.classList.contains('open')) return;
    if (e.target === btn || btn.contains(e.target)) return;
    if (nav.contains(e.target)) return;
    setOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!nav.classList.contains('open')) return;
    setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (!isMobile()) setOpen(false);
  });
}

// --- API base (for separate backend hosting) ---
function apiUrl(pathname) {
  const rawBase = (window.API_BASE || localStorage.getItem('apiBase') || '').trim();
  const base = rawBase.replace(/\/+$/, '');
  return base ? `${base}${pathname}` : pathname;
}

// --- Theme handling ---
function applyTheme(theme) {
  const safeTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', safeTheme);
  localStorage.setItem('theme', safeTheme);
  updateThemeToggleLabel();
}

function updateThemeToggleLabel() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  const key = theme === 'dark' ? 'themeLight' : 'themeDark';
  btn.textContent = t(key, currentLang);
}

document.addEventListener('DOMContentLoaded', () => {
  // Load persisted theme first
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  initMobileMenu();

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
});

function applyTranslations(lang) {
  currentLang = lang || currentLang;
  document.documentElement.lang = currentLang;
  document.title = t('title', currentLang);

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key, currentLang);
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (key) el.innerHTML = t(key, currentLang);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) el.setAttribute('placeholder', t(key, currentLang));
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', t(key, currentLang));
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key, currentLang));
  });

  document.querySelectorAll('[data-i18n-option]').forEach(el => {
    const key = el.getAttribute('data-i18n-option');
    if (key) el.textContent = t(key, currentLang);
  });

  renderProducts();
  renderFeatured();
  if (activeProductKey) {
    const prod = PRODUCT_DATA.find(p => p.key === activeProductKey);
    if (prod) updateProductModal(prod);
  }
  loadReviews(true);
  updateThemeToggleLabel();
  updateMobileMenuA11y();
}

window.applyTranslations = applyTranslations;
document.addEventListener('DOMContentLoaded', function() {
  const lang = localStorage.getItem('lang') || currentLang;
  applyTranslations(lang);
});
// --- Quote nav link scroll logic (only for in-page anchors) ---
document.addEventListener('DOMContentLoaded', () => {
  const quoteNav = document.querySelector('.nav-btn.quote');
  if (quoteNav) {
    quoteNav.addEventListener('click', function(e) {
      const href = (quoteNav.getAttribute('href') || '').trim();
      if (!href.startsWith('#')) return;
      const form = document.getElementById('quote-form');
      if (form) {
        e.preventDefault();
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        form.classList.add('highlight-quote-form');
        setTimeout(() => form.classList.remove('highlight-quote-form'), 1500);
      }
    });
  }
});
async function loadSettingsToHomepage() {
  try {
    const res = await fetch(apiUrl('/api/settings'));
    const data = await res.json();
    // FAQs
    const faqList = document.getElementById('faq-list');
    if (faqList) {
      const faqs = Array.isArray(data.faqs) ? data.faqs : [];
      if (faqs.length) {
        faqList.innerHTML = faqs.map(faq => `
          <div class="faq-item">
            <button class="faq-question">${faq.q}</button>
            <div class="faq-answer">${faq.a}</div>
          </div>
        `).join('');
        // Re-apply accordion logic
        faqList.querySelectorAll('.faq-question').forEach(btn => {
          btn.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            if (answer.style.maxHeight) {
              answer.style.maxHeight = null;
              answer.style.padding = null;
            } else {
              faqList.querySelectorAll('.faq-answer').forEach(a => {
                a.style.maxHeight = null;
                a.style.padding = null;
              });
              answer.style.maxHeight = answer.scrollHeight + 'px';
              answer.style.padding = '0.7em 1em';
            }
          });
        });
      } else {
        faqList.innerHTML = `<div class="faq-empty">${t('noFaqs', currentLang)}</div>`;
      }
    }
    // Shop Info
    if (data.shopInfo) {
      const taglineEl = document.getElementById('brand-tagline');
      if (taglineEl) taglineEl.textContent = data.shopInfo.tagline || t('brandTagline', currentLang);
      const addressEl = document.getElementById('shop-address');
      if (addressEl) addressEl.textContent = data.shopInfo.address || t('defaultShopAddress', currentLang);
      const hoursEl = document.getElementById('shop-hours');
      if (hoursEl) hoursEl.innerHTML = (data.shopInfo.hours || t('defaultHoursDetail', currentLang)).replace(/, /g, '<br />');
      if (document.getElementById('footer-phone-link')) {
        document.getElementById('footer-phone-link').textContent = data.shopInfo.phone || '';
        document.getElementById('footer-phone-link').href = 'tel:' + (data.shopInfo.phone || '');
      }
      if (document.getElementById('footer-whatsapp-link')) {
        document.getElementById('footer-whatsapp-link').textContent = data.shopInfo.whatsapp || '';
        document.getElementById('footer-whatsapp-link').href = 'https://wa.me/' + (data.shopInfo.whatsapp || '');
      }
      const footerAddress = document.getElementById('footer-address');
      if (footerAddress) footerAddress.textContent = data.shopInfo.address || t('defaultShortAddress', currentLang);
      const footerHours = document.getElementById('footer-hours');
      if (footerHours) footerHours.innerHTML = (data.shopInfo.hours || t('defaultHoursDetail', currentLang)).replace(/, /g, '<br />');
    }
  } catch {
    const faqList = document.getElementById('faq-list');
    if (faqList) faqList.innerHTML = `<div class="faq-empty">${t('noFaqs', currentLang)}</div>`;
  }
}
document.addEventListener('DOMContentLoaded', loadSettingsToHomepage);
// --- Reviews ---
function renderReviews(list, reviews) {
  if (reviews && reviews.length) {
    list.innerHTML = reviews.map(r => `
      <div class="note">
        <div class="note-title">${r.name}</div>
        <div class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
        <div class="note-body">${r.comment}</div>
      </div>
    `).join('');
  } else {
    list.innerHTML = `<div>${t('noReviews', currentLang)}</div>`;
  }
}

async function loadReviews(useCache = false) {
  const list = document.getElementById('reviews-list');
  if (!list) return;
  if (useCache && Array.isArray(reviewsCache)) {
    renderReviews(list, reviewsCache);
    return;
  }
  list.innerHTML = `<div>${t('loadingReviews', currentLang)}</div>`;
  try {
    const res = await fetch(apiUrl('/api/reviews'));
    const data = await res.json();
    reviewsCache = Array.isArray(data.reviews) ? data.reviews : [];
    renderReviews(list, reviewsCache);
  } catch {
    list.innerHTML = `<div>${t('failedReviews', currentLang)}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadReviews();
  const form = document.getElementById('review-form');
  if (form) {
    form.onsubmit = async e => {
      e.preventDefault();
      const fd = new FormData(form);
      const data = {
        name: fd.get('name'),
        rating: fd.get('rating'),
        comment: fd.get('comment')
      };
      if (!data.name || !data.rating || !data.comment) return;
      form.querySelector('button').disabled = true;
      try {
        const res = await fetch(apiUrl('/api/reviews'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (res.ok) {
          form.reset();
          loadReviews();
        } else {
          alert(t('reviewSubmitFail', currentLang));
        }
      } catch {
          alert(t('reviewSubmitFail', currentLang));
      }
      form.querySelector('button').disabled = false;
    };
  }
});
// --- FAQ Accordion Logic ---
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', function() {
      const answer = this.nextElementSibling;
      if (answer.style.maxHeight) {
        answer.style.maxHeight = null;
        answer.style.padding = null;
      } else {
        document.querySelectorAll('.faq-answer').forEach(a => {
          a.style.maxHeight = null;
          a.style.padding = null;
        });
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.style.padding = '0.7em 1em';
      }
    });
  });
});

// --- Product Data (expandable) ---
const PRODUCT_DATA = [
  {
    key: 'tmt',
    nameKey: 'productTmtName',
    descKey: 'productTmtDesc',
    featureKeys: ['productTmtFeature1', 'productTmtFeature2', 'productTmtFeature3', 'productTmtFeature4'],
    img: 'assets/tmt-bar.jpg', // Tata Tiscon TMT bar
  },
  {
    key: 'cement',
    nameKey: 'productCementName',
    descKey: 'productCementDesc',
    featureKeys: ['productCementFeature1', 'productCementFeature2', 'productCementFeature3'],
    img: 'assets/cement-bag.jpg', // UltraTech cement bag
  },
  {
    key: 'bricks',
    nameKey: 'productBricksName',
    descKey: 'productBricksDesc',
    featureKeys: ['productBricksFeature1', 'productBricksFeature2', 'productBricksFeature3'],
    img: 'assets/red-bricks.webp', // Red bricks
  },
  {
    key: 'sand',
    nameKey: 'productSandName',
    descKey: 'productSandDesc',
    featureKeys: ['productSandFeature1', 'productSandFeature2', 'productSandFeature3'],
    img: 'assets/sand-stone.jpg', // Sand and stone piles
  },
  {
    key: 'paint',
    nameKey: 'productPaintName',
    descKey: 'productPaintDesc',
    featureKeys: ['productPaintFeature1', 'productPaintFeature2', 'productPaintFeature3'],
    img: 'assets/paint-berger.jpg', // Berger paint cans
  },
  {
    key: 'electrical',
    nameKey: 'productElectricalName',
    descKey: 'productElectricalDesc',
    featureKeys: ['productElectricalFeature1', 'productElectricalFeature2', 'productElectricalFeature3'],
    img: 'assets/electrical-items.jpg', // Electrical appliances/items
  },
  {
    key: 'plumbing',
    nameKey: 'productPlumbingName',
    descKey: 'productPlumbingDesc',
    featureKeys: ['productPlumbingFeature1', 'productPlumbingFeature2', 'productPlumbingFeature3'],
    img: 'assets/water-line.jpg', // Water line pipes and fittings
  }
];

// --- Render Product Cards ---
function renderProducts() {
  const cards = document.getElementById('product-cards');
  if (cards) {
    cards.innerHTML = PRODUCT_DATA.map(prod => `
      <div class="product-card" data-key="${prod.key}">
        <img src="${prod.img}" alt="${t(prod.nameKey, currentLang)}" loading="lazy" />
        <div class="card-title">${t(prod.nameKey, currentLang)}</div>
        <div class="card-desc">${t(prod.descKey, currentLang)}</div>
      </div>
    `).join('');
  }
  // Modal logic
  document.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', function() {
      const key = this.getAttribute('data-key');
      const prod = PRODUCT_DATA.find(p => p.key === key);
      if (prod) showProductModal(prod);
    });
  });
}

function showProductModal(prod) {
  updateProductModal(prod);
  document.getElementById('product-modal').style.display = 'flex';
  activeProductKey = prod.key;
}

function updateProductModal(prod) {
  document.getElementById('modal-img').src = prod.img;
  document.getElementById('modal-title').textContent = t(prod.nameKey, currentLang);
  document.getElementById('modal-desc').textContent = t(prod.descKey, currentLang);
  const features = Array.isArray(prod.featureKeys) ? prod.featureKeys : [];
  document.getElementById('modal-features').innerHTML = features.map(f => `<li>${t(f, currentLang)}</li>`).join('');
}

function closeProductModal() {
  document.getElementById('product-modal').style.display = 'none';
  activeProductKey = null;
}

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  const closeBtn = document.getElementById('close-modal');
  if (closeBtn) closeBtn.onclick = closeProductModal;
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.onclick = function(e) {
      if (e.target === this) closeProductModal();
    };
  }
});

// --- Featured items (for demo, use same categories) ---
function renderFeatured() {
  const featured = document.getElementById('featured-list');
  if (featured) {
    featured.innerHTML = PRODUCT_DATA.map(prod => `
      <div class="featured-item" tabindex="0">
        <div class="card-title">${t(prod.nameKey, currentLang)}</div>
        <div class="card-desc">${t(prod.descKey, currentLang)}</div>
      </div>
    `).join('');
  }
}
document.addEventListener('DOMContentLoaded', renderFeatured);

// --- Quote Form Logic ---
const quoteForm = document.getElementById('quote-form');
const sendWhatsappBtn = document.getElementById('send-whatsapp');
const whatsappCta = document.getElementById('whatsapp-cta');
const copyCallBtn = document.getElementById('copy-call');

function getFormData() {
  const fd = new FormData(quoteForm);
  return {
    topic: fd.get('topic'),
    name: fd.get('name'),
    phone: fd.get('phone'),
    requirement: fd.get('requirement')
  };
}

if (quoteForm) {
  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = getFormData();
    if (!/^\d{10,15}$/.test(data.phone)) {
      alert(t('invalidPhone', currentLang));
      return;
    }
    const res = await fetch(apiUrl('/api/quotes'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (res.ok) {
      alert(t('quoteSaveSuccess', currentLang));
    } else {
      alert(t('quoteSaveFail', currentLang));
    }
  });
}

if (sendWhatsappBtn) {
  sendWhatsappBtn.addEventListener('click', () => {
    const data = getFormData();
    if (!/^\d{10,15}$/.test(data.phone)) {
      alert(t('invalidPhone', currentLang));
      return;
    }
    const msg = [
      `${t('messageQuoteFor', currentLang)}: ${data.topic}`,
      `${t('messageName', currentLang)}: ${data.name}`,
      `${t('messagePhone', currentLang)}: ${data.phone}`,
      `${t('messageRequirement', currentLang)}: ${data.requirement}`
    ].join('\n');
    const url = `https://wa.me/919999999999?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });
}

if (whatsappCta) {
  whatsappCta.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://wa.me/919999999999', '_blank');
  });
}

if (copyCallBtn) {
  copyCallBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('943466190');
    alert(t('copySuccess', currentLang));
  });
}
