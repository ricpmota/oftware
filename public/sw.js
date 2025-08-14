// Service Worker para UNAGI PWA
const CACHE_NAME = 'oftware-v1.0.0';
const STATIC_CACHE = 'oftware-static-v1.0.0';
const DYNAMIC_CACHE = 'oftware-dynamic-v1.0.0';

// Recursos estáticos para cache
const STATIC_ASSETS = [
  '/',
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
  '/favicon.ico'
];

// Estratégias de cache
const cacheStrategies = {
  // Cache primeiro para recursos estáticos
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
    } catch (error) {
      return new Response('Offline', { status: 503 });
    }
  },

  // Network primeiro para dados dinâmicos
  networkFirst: async (request) => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      return new Response('Offline', { status: 503 });
    }
  },

  // Stale while revalidate para recursos que mudam pouco
  staleWhileRevalidate: async (request) => {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then(async (networkResponse) => {
      if (networkResponse.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
  }
};

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Cache estático aberto');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('Recursos estáticos em cache');
      return self.skipWaiting();
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker ativado');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pular requisições não-GET
  if (request.method !== 'GET') {
    return;
  }

  // Pular requisições para APIs externas
  if (url.hostname !== location.hostname) {
    return;
  }

  // Estratégia baseada no tipo de recurso
  if (STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheStrategies.staticFirst(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(cacheStrategies.networkFirst(request));
  } else if (url.pathname.startsWith('/_next/')) {
    event.respondWith(cacheStrategies.staleWhileRevalidate(request));
  } else {
    event.respondWith(cacheStrategies.networkFirst(request));
  }
});

// Limpeza periódica de cache
self.addEventListener('message', (event) => {
  if (event.data === 'cleanup') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.keys().then((requests) => {
          const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 dias
          return Promise.all(
            requests.map((request) => {
              return cache.match(request).then((response) => {
                if (response && response.headers.get('date')) {
                  const date = new Date(response.headers.get('date'));
                  if (date.getTime() < cutoff) {
                    return cache.delete(request);
                  }
                }
              });
            })
          );
        });
      })
    );
  }
}); 