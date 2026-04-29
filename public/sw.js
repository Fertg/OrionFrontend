/**
 * Orion Service Worker
 *
 * Estrategia:
 * - App shell (HTML/CSS/JS): network-first con fallback a cache.
 *   Así siempre intentamos coger lo último, pero si no hay red,
 *   abrimos lo cacheado.
 * - Iconos/manifest: cache-first.
 * - API calls (/auth, /expenses, /categories, /budgets, /recurring):
 *   NUNCA se cachean — siempre fresco.
 * - Google Fonts/Identity: stale-while-revalidate.
 */

const CACHE_VERSION = 'orion-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Recursos críticos para que la app abra offline
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

// Hosts de la API (todo lo que NO debe cachearse)
const API_PATHS = ['/auth', '/expenses', '/categories', '/budgets', '/recurring'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejamos GET — los POST/PATCH/DELETE pasan directo
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Nunca cacheamos llamadas a la API (otro origen) ni a Google
  // (las identifica el origen, no el path)
  if (url.origin !== self.location.origin) {
    return; // dejamos que el navegador maneje normal
  }

  // Si el path empieza por uno de los de la API, no cacheamos
  // (esto en realidad no debería pasar porque la API está en otro origen,
  // pero es defensivo por si algún día se montan en el mismo)
  if (API_PATHS.some((p) => url.pathname.startsWith(p))) {
    return;
  }

  // Para navegación HTML: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cacheamos copia para offline
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/'))
        )
    );
    return;
  }

  // Resto (assets): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Solo cacheamos respuestas válidas y básicas
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((c) => c.put(request, copy));
        return response;
      });
    })
  );
});

// Permite que la página fuerce un skipWaiting() para activar nueva versión
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
