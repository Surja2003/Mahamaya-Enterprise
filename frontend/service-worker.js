const CACHE = 'mahamaya-v5';
const STATIC = [
  '/', '/index.html', '/style.css', '/app.js', '/demo-products.js',
  '/product.html', '/checkout.html', '/track.html', '/account.html',
  '/admin.html', '/admin.js', '/manifest.json', '/assets/placeholder.svg'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  
  const url = new URL(e.request.url);
  
  // Skip API requests
  if (url.pathname.includes('/api/')) return;
  
  // Network-First for HTML, JS, CSS, JSON, and directory root
  const isWebAsset = /\.(html|js|css|json)$/.test(url.pathname) || url.pathname === '/' || url.pathname === '';
  
  if (isWebAsset) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => {
          return caches.match(e.request).then(cachedRes => {
            return cachedRes || caches.match('/index.html');
          });
        })
    );
  } else {
    // Cache-First for static assets like images, fonts, icons
    e.respondWith(
      caches.match(e.request).then(cachedRes => {
        if (cachedRes) return cachedRes;
        return fetch(e.request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return res;
        });
      })
    );
  }
});
