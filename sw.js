// ============================================
// NutriSnap — Service Worker
// Network-first for code so deployed updates reach installed devices.
// Cache-first only for immutable assets (icons, fonts).
// ============================================

// Bump VERSION on every deploy. This is what evicts the previous cache.
const VERSION = 'v2.0.0';
const CACHE_NAME = `nutrisnap-${VERSION}`;

// Precached so the app opens offline. Deliberately NOT atomic:
// a single missing file must not prevent the worker from installing.
// The JS modules are listed explicitly: the app is ES modules loaded from
// index.html, and nothing else pulls them into the cache at install time.
// (They used to arrive only as a side effect of the unconditional
// first-install reload, which no longer happens — see registerServiceWorker.)
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './css/components.css',
  './css/animations.css',
  './js/app.js',
  './js/ui.js',
  './js/db.js',
  './js/gemini.js',
  './js/camera.js',
  './js/charts.js',
  './js/utils.js',
  './js/core/escape.js',
  './js/core/nutrition.js',
  './js/config/models.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // allSettled, not addAll: addAll is atomic and one 404 rejects the
    // entire install, which is exactly how the previous version broke.
    // cache: 'reload' for the same reason networkFirst uses it — cache.add
    // is an ordinary fetch, so without it a deploy can seed the new
    // versioned cache from the browser's stale HTTP cache, defeating the
    // update mechanism at install time instead of at runtime.
    const results = await Promise.allSettled(
      PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`SW: ${failed} precache entries failed; install continues`);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    // cache: 'reload' bypasses the browser's own HTTP cache. Without it,
    // fetch() can be satisfied from disk cache when the host sends a
    // long max-age (GitHub Pages and Cloudflare Pages both do), which
    // would reintroduce D1 staleness in production even though the
    // service-worker strategy is network-first.
    const response = await fetch(request, { cache: 'reload' });
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts are immutable and versioned — cache-first.
  if (url.hostname.includes('fonts.googleapis.com') ||
      url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Any other cross-origin request (notably the Gemini API) is left
  // to the browser. Never cache API responses.
  if (url.origin !== self.location.origin) return;

  // Icons are immutable — cache-first.
  if (url.pathname.includes('/icons/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML, JS, CSS, manifest — network-first so updates land.
  event.respondWith(networkFirst(request));
});
