// Rimiris AI — Service Worker
// Version bumps invalidate previous caches.
const SW_VERSION = 'rimiris-v1.0.0'
const STATIC_CACHE = `rimiris-static-${SW_VERSION}`
const RUNTIME_CACHE = `rimiris-runtime-${SW_VERSION}`
const OFFLINE_URL = '/offline.html'

// App shell — precached for offline availability.
// Note: Next.js standalone build assets live under /_next/static/* —
// we cache them at runtime (see fetch handler) rather than precaching
// because hashed filenames change between builds.
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  OFFLINE_URL,
]

// Install: precache the app shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch(() => {
              /* ignore individual failures (e.g., offline.html may not exist) */
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

// Activate: clean up old caches and take control.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Helpers
function isNavigationRequest(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  )
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/icon.svg' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.png' ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|eot)$/.test(url.pathname)
  )
}

// Fetch strategy:
// - Navigations: network-first, fall back to cache, then offline page.
// - Static assets: stale-while-revalidate (cache first, update in background).
// - API calls: network-only (don't cache — AI responses are dynamic).
// - Everything else: try network, fall back to cache.
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Skip cross-origin requests (e.g., Google Fonts, ZAI API).
  if (url.origin !== self.location.origin) return

  // Skip Next.js dev/HMR and RSC fetches.
  if (url.pathname.startsWith('/_next/webpack-hmr')) return

  // Skip API routes — they are dynamic and must always hit the network.
  if (url.pathname.startsWith('/api/')) return

  // 1. Navigations — network-first.
  if (isNavigationRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
          return new Response(
            '<h1>Hors ligne</h1><p>Rimiris AI est hors ligne. Revenez quand vous aurez du réseau.</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          )
        })
    )
    return
  }

  // 2. Static assets — stale-while-revalidate.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request)
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone())
            }
            return response
          })
          .catch(() => cached)
        return cached || networkFetch
      })
    )
    return
  }

  // 3. Default — try network, fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request))
  )
})

// Allow the page to trigger immediate update.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
