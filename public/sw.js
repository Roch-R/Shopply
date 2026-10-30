/**
 * Shopply Service Worker
 * 
 * Real caching strategies:
 * - Static assets (JS/CSS/fonts): Cache-first with long TTL
 * - Product images: Stale-while-revalidate
 * - Page navigations and Next.js route data: Browser network handling
 * - API calls: Network-only (handled by client-side apiCache)
 */

const CACHE_VERSION = 'shopply-v60';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

// Static assets to precache on install
const PRECACHE_URLS = [];

// --- Install: precache critical pages ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE)
      .then(cache => {
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

  // Let the browser handle document redirects and Next.js route responses.
  // Cached HTML/RSC can display the wrong route or an obsolete access gate.
  if (request.mode === 'navigate' ||
      request.headers.get('accept')?.includes('text/html') ||
      request.headers.get('rsc') === '1' ||
      request.headers.has('next-router-state-tree')) return;

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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
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
              background:#F7F7F5;
              font-family:Inter,-apple-system,sans-serif;color:#111827}
            .container{text-align:center;padding:40px;background:#FFFFFF;border:1px solid #E5E7EB;border-radius:16px;max-width:420px;margin:20px}
            .icon{width:48px;height:48px;margin:0 auto 20px;border-radius:12px;background:#F3F4F6;display:flex;align-items:center;justify-content:center;color:#111827}
            h1{font-size:22px;font-weight:700;margin-bottom:10px;letter-spacing:-0.02em}
            p{font-size:14px;color:#4B5563;max-width:340px;line-height:1.6}
            .retry{margin-top:24px;padding:11px 22px;background:#111827;
              color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;
              cursor:pointer;transition:background .15s}
            .retry:hover{background:#1F2937}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
            </div>
            <h1>No internet connection</h1>
            <p>Check your Wi-Fi or mobile data connection and refresh the page to continue shopping on Shopply.</p>
            <button class="retry" onclick="location.reload()">Try again</button>
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
self.addEventListener('message', (event) => {
  if (event.data?.type === 'TRIM_CACHES') {
    trimCache(IMAGE_CACHE, 100);
  }
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} entries from ${cacheName}`);
  }
}
