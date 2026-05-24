// Nombre y prefijo estricto para evitar conflictos con otras aplicaciones del dominio
const CACHE_PREFIX = 'BUNKKER_APP';
const CACHE_NAME = `${CACHE_PREFIX}-cache-v6`;

// Archivos estáticos críticos para funcionar offline
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './app.js',
  './pwa.js',
  './manifest.json'
];

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
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH (Aislamiento de lectura)
self.addEventListener('fetch', event => {
  event.respondWith(
    // Solo buscamos match dentro de NUESTRA caché específica, nunca un global caches.match()
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          // Si queremos cachear nuevas peticiones dinámicas en nuestra carpeta (ej: iconos AEMET)
          if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Fallback en caso de desconexión sin caché
          console.log('Fallo de red al buscar:', event.request.url);
        });
      });
    })
  );
});

// 4. ACTUALIZACIÓN MANUAL
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});