// Service Worker — escopo mínimo: ícones/manifest offline; app não interceptada (evita HTML/JS antigo)
const STATIC_CACHE = 'oftware-static-v1.0.7';
const DYNAMIC_CACHE = 'oftware-dynamic-v1.0.7';

const STATIC_ASSETS = [
  '/icones/metodo-simbolo-17.png',
  '/icones/oftware.png',
  '/icones/greens.png',
  '/icones/catarata.png',
  '/icones/Glaucoma.png',
  '/icones/Retina.png',
  '/icones/cirurgia-refrativa.png',
  '/icones/cornea.png',
  '/icones/Emergência.png',
  '/icones/Estrabismo.png',
  '/icones/Farmacologia.png',
  '/icones/Genetica.png',
  '/icones/Lentes.png',
  '/icones/neurooftalmo.png',
  '/icones/oncologia.png',
  '/icones/plastica.png',
  '/icones/uveite.png',
  '/manifest.json',
  '/favicon.ico',
];

const cacheStrategies = {
  staticFirst: async (request) => {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (_error) {
      return new Response('Offline', { status: 503 });
    }
  },

  /** Rede primeiro sem cache HTTP do browser (evita página antiga até dar hard refresh) */
  networkFirstNoHttpCache: async (request) => {
    try {
      const networkResponse = await fetch(request, { cache: 'no-store' });
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (_error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('Offline', { status: 503 });
    }
  },
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              return caches.delete(cacheName);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.hostname !== self.location.hostname) {
    return;
  }

  // Navegação: browser busca o documento sem SW (sem cache HTTP envelhecido via respondWith)
  if (request.mode === 'navigate') {
    return;
  }

  // Bundles RSC/chunks Next: não interceptar — stale-while-revalidate servia JS antigo na hora
  if (url.pathname.startsWith('/_next/')) {
    return;
  }

  // APIs de páginas públicas de paciente: não interceptar (Safari/iOS retorna "Load failed")
  if (
    url.pathname.startsWith('/api/aplicacao/') ||
    url.pathname.startsWith('/api/conclusao/')
  ) {
    return;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheStrategies.staticFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(cacheStrategies.networkFirstNoHttpCache(request));
  } else {
    event.respondWith(cacheStrategies.networkFirstNoHttpCache(request));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'cleanup') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) =>
        cache.keys().then((requests) => {
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
          return Promise.all(
            requests.map((request) =>
              cache.match(request).then((response) => {
                if (response && response.headers.get('date')) {
                  const date = new Date(response.headers.get('date'));
                  if (date.getTime() < cutoff) {
                    return cache.delete(request);
                  }
                }
              })
            )
          );
        })
      )
    );
  }
});
