// Prefijo estricto para evitar conflictos con otras aplicaciones del dominio.
const CACHE_PREFIX = 'BUNKKER_APP';
// El nombre es estable: los recursos del shell se revalidan en red, en vez de
// depender de que se incremente manualmente una versión de caché.
const CACHE_NAME = `${CACHE_PREFIX}-assets`;

// Archivos estáticos críticos para funcionar offline
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './pwa.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

const appShellUrls = new Set(
  urlsToCache.map(url => new URL(url, self.registration.scope).href)
);

function isAppShellRequest(request) {
  return appShellUrls.has(new URL(request.url).href);
}

async function removeLegacyExternalEntries() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();

  await Promise.all(
    requests
      .filter(request => new URL(request.url).origin !== self.location.origin)
      .map(request => cache.delete(request))
  );
}

async function networkFirst(request, navigationFallback = false) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // Evita que la caché HTTP del navegador mantenga indefinidamente un asset
    // local anterior. La copia válida se conserva después en Cache Storage.
    const response = await fetch(new Request(request, { cache: 'no-store' }));

    if (response && response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        // La respuesta de red sigue siendo válida aunque Cache Storage no
        // pueda actualizarse temporalmente (por ejemplo, falta de cuota).
      }
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    if (navigationFallback) {
      const appShellFallback = await cache.match('./index.html');
      return appShellFallback || cache.match('./');
    }

    throw error;
  }
}

// 1. INSTALACIÓN
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. ACTIVACIÓN (Limpieza Estricta)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // SOLO borra las cachés que tengan este prefijo exacto y no sean la actual.
          if (cacheName.startsWith(`${CACHE_PREFIX}-`) && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(removeLegacyExternalEntries).then(() => self.clients.claim())
  );
});

// 3. FETCH (Shell local)
self.addEventListener('fetch', event => {
  const { request } = event;

  // Navegación y shell local: red primero para incorporar cambios de HTML,
  // JS, CSS y manifest; caché como fallback cuando no hay conexión.
  if (request.method === 'GET' && (request.mode === 'navigate' || isAppShellRequest(request))) {
    event.respondWith(networkFirst(request, request.mode === 'navigate'));
    return;
  }

  // Las peticiones externas (AEMET, rss2json y favicons incluidos) no se
  // interceptan ni se guardan. Sus consumidores ya gestionan sus fallos.
});

// 4. ACTUALIZACIÓN MANUAL
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
