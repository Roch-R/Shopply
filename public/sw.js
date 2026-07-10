/**
 * Shopply Service Worker
 * 
 * Real caching strategies:
 * - Static assets (JS/CSS/fonts): Cache-first with long TTL
 * - Product images: Stale-while-revalidate
 * - Page navigations: Network-first with fallback
 * - API calls: Network-only (handled by client-side apiCache)
 */

const CACHE_VERSION = 'shopply-v18';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// Static assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/shop',
  '/dashboard',
  '/cart',
];

// --- Install: precache critical pages ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then(cache => {
        // Precache pages — don't fail install if any page fails
        return Promise.allSettled(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(() => console.log(`[SW] Failed to precache: ${url}`))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// --- Activate: clean old caches ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => !key.startsWith(CACHE_VERSION))
          .map(key => {
            console.log(`[SW] Deleting old cache: ${key}`);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// --- Fetch: apply caching strategies ---
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests — handled by client-side apiCache.ts
  if (url.pathname.includes('/api/')) return;

  // Skip WebSocket and extension requests
  if (url.protocol === 'chrome-extension:' || url.protocol === 'ws:') return;

  // Strategy 1: Static assets — Cache-First
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Images — Stale-While-Revalidate
  if (isImage(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Strategy 3: Page navigations — Network-First with cache fallback
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // Strategy 4: Everything else — Network-First
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// --- Helper: classify URLs ---

function isStaticAsset(url) {
  return url.pathname.startsWith('/_next/static/') ||
         url.pathname.endsWith('.css') ||
         url.pathname.endsWith('.js') ||
         url.pathname.endsWith('.woff2') ||
         url.pathname.endsWith('.woff') ||
         url.pathname.endsWith('.ttf');
}

function isImage(url) {
  return url.pathname.includes('/storage/') ||
         url.pathname.endsWith('.png') ||
         url.pathname.endsWith('.jpg') ||
         url.pathname.endsWith('.jpeg') ||
         url.pathname.endsWith('.webp') ||
         url.pathname.endsWith('.svg') ||
         url.pathname.endsWith('.gif') ||
         url.pathname.endsWith('.ico');
}

// --- Caching Strategies ---

/**
 * Cache-First: Return cached response, fallback to network.
 * Best for static assets that rarely change and have content hashes.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate: Return cached immediately, update cache in background.
 * Best for images that need to feel fast but may update.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always revalidate in background
  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  // Return cached immediately if available, otherwise wait for network
  if (cached) {
    // Trigger background revalidation (don't await)
    networkPromise;
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  return new Response('Image unavailable offline', { 
    status: 503, 
    headers: { 'Content-Type': 'text/plain' } 
  });
}

/**
 * Network-First: Try network, fallback to cache.
 * Best for HTML pages that should be fresh but work offline.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback
    if (request.mode === 'navigate') {
      return new Response(
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Shopply — Offline</title>
          <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{min-height:100vh;display:flex;align-items:center;justify-content:center;
              background:linear-gradient(135deg,#f0f4ff,#faf5ff,#f0f9ff);
              font-family:Inter,-apple-system,sans-serif;color:#0f172a}
            .container{text-align:center;padding:40px}
            .icon{font-size:64px;margin-bottom:24px}
            h1{font-size:28px;font-weight:800;margin-bottom:12px;letter-spacing:-0.5px}
            p{font-size:16px;color:#64748b;max-width:400px;line-height:1.6}
            .retry{margin-top:24px;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#2563eb);
              color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;
              cursor:pointer;transition:opacity .2s}
            .retry:hover{opacity:.85}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📡</div>
            <h1>You're Offline</h1>
            <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
            <button class="retry" onclick="location.reload()">Try Again</button>
          </div>
        </body>
        </html>`,
        { 
          status: 503, 
          headers: { 'Content-Type': 'text/html' } 
        }
      );
    }

    return new Response('Network unavailable', { status: 503 });
  }
}

// --- Cache Size Management ---
// Limit image cache to ~100 entries to prevent storage bloat
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRIM_CACHES') {
    trimCache(IMAGE_CACHE, 100);
  }
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries (FIFO)
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} entries from ${cacheName}`);
  }
}
