import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SystemColorsCssVarsLoader from '@/components/systemColors/SystemColorsCssVarsLoader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  applicationName: "Método",
  title: "Sem método, tudo vira tentativa. E tentativa não sustenta resultado.",
  description: "Sistema completo de monitoramento",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icones/metodo-simbolo-pwa.jpg', type: 'image/jpeg' }
    ],
    shortcut: '/favicon.ico',
    apple: '/icones/metodo-simbolo-pwa.jpg',
  },
  openGraph: {
    title: "Sem método, tudo vira tentativa. E tentativa não sustenta resultado.",
    description: "Sistema completo de monitoramento",
    url: "https://www.oftware.com.br",
    siteName: "Oftware",
    images: [
      {
        url: "/og-mentoria.jpg",
        width: 1200,
        height: 630,
        alt: "Oftware - Método Emagrecer",
      },
    ],
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sem método, tudo vira tentativa. E tentativa não sustenta resultado.",
    description: "Sistema completo de monitoramento",
    images: ["/og-mentoria.jpg"],
  },
};

/** Equivale a <meta name="viewport" content="width=device-width, initial-scale=1"> (gerado pelo Next; evita meta duplicado no <head>). */
export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Método" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#22c55e" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="application-name" content="Método" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        {/* viewport: width=device-width, initial-scale=1 via `export const viewport` (Next injeta a meta). Rotas como /rafaelaalbuquerque podem sobrescrever. */}
        <link rel="preload" as="image" href="/icones/metodo-simbolo-pwa.jpg" />
        
        <link rel="apple-touch-icon" href="/icones/metodo-simbolo-pwa.jpg" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icones/metodo-simbolo-pwa.jpg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icones/metodo-simbolo-pwa.jpg" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icones/metodo-simbolo-pwa.jpg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SystemColorsCssVarsLoader />
        {children}
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Na página inicial e meta: verificar versão no servidor e forçar reload se desatualizado (evita cache antigo no celular)
              (function() {
                var path = typeof location !== 'undefined' && location.pathname;
                var isCacheBustPath =
                  path === '/' ||
                  path === '' ||
                  path === '/mentoria' ||
                  (path && path.startsWith('/meta'));
                if (!isCacheBustPath) return;
                var key = 'homePageVersion';
                try {
                  fetch('/api/version', { cache: 'no-store', method: 'GET' })
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                      var current = d && typeof d.version !== 'undefined' ? String(d.version) : '';
                      var saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(key) : null;
                      var urlMatch = location.search.match(/[?&]_v=([^&]*)/);
                      var urlV = '';
                      if (urlMatch && urlMatch[1]) {
                        try { urlV = decodeURIComponent(urlMatch[1]); } catch (e) { urlV = urlMatch[1]; }
                      }
                      var versionChanged = current && current !== saved;
                      var hasTs = /[?&]_t=/.test(location.search);
                      var mentoriaNeedsParams =
                        current &&
                        path === '/mentoria' &&
                        (!urlV || urlV !== current || !hasTs);
                      if (current && (versionChanged || mentoriaNeedsParams)) {
                        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(key, current);
                        var search = location.search.replace(/[?&]_v=[^&]*/g, '').replace(/[?&]_t=[^&]*/g, '').replace(/[?&]_nocache=[^&]*/g, '').replace(/^&/, '').replace(/&&+/g, '&');
                        var url = location.pathname + (search ? (search.charAt(0) === '?' ? search : '?' + search) : '') + location.hash;
                        var sep = url.indexOf('?') !== -1 ? '&' : '?';
                        location.replace(url + sep + '_v=' + encodeURIComponent(current) + '&_t=' + Date.now());
                      }
                    })
                    .catch(function() {});
                } catch (e) {}
              })();
              // Handler para ChunkLoadError (404 em chunks após deploy) - reload forçado sem cache
              (function() {
                var CHUNK_RELOAD_KEY = 'chunk_reload_count';
                var MAX_CHUNK_RELOADS = 3;
                
                function isChunkError(msg) {
                  if (!msg) return false;
                  return msg.indexOf('Loading chunk') !== -1 || msg.indexOf('ChunkLoadError') !== -1;
                }
                
                function doChunkReload() {
                  try {
                    var n = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0', 10);
                    if (n >= MAX_CHUNK_RELOADS) {
                      console.warn('ChunkLoadError: limite de recarregamentos. Use Ctrl+Shift+R para atualizar.');
                      return;
                    }
                    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(n + 1));
                    var url = location.pathname + location.search + location.hash;
                    var sep = url.indexOf('?') !== -1 ? '&' : '?';
                    location.replace(url + sep + '_nocache=' + Date.now());
                  } catch (e) {
                    location.reload();
                  }
                }
                
                window.addEventListener('error', function(event) {
                  if (isChunkError(event.message) || (event.target && event.target.tagName === 'SCRIPT' && event.target.src && event.target.src.indexOf('_next/static') !== -1)) {
                    event.preventDefault();
                    doChunkReload();
                  }
                }, true);
                
                window.addEventListener('unhandledrejection', function(event) {
                  var msg = event.reason && (event.reason.message || event.reason.toString && event.reason.toString());
                  if (isChunkError(msg)) {
                    event.preventDefault();
                    doChunkReload();
                  }
                });
                
                // Limpar contador quando a página carregar com sucesso (evita contar em visitas futuras)
                if (document.readyState === 'complete') {
                  sessionStorage.removeItem(CHUNK_RELOAD_KEY);
                } else {
                  window.addEventListener('load', function() { sessionStorage.removeItem(CHUNK_RELOAD_KEY); });
                }
              })();
              
              // FORÇAR SEMPRE MODO CLARO - NUNCA PERMITIR DARK
              (function() {
                const html = document.documentElement;
                const body = document.body;
                
                // Remover classe dark imediatamente e repetidamente
                setInterval(function() {
                  html.classList.remove('dark');
                  html.style.colorScheme = 'light';
                  body.style.backgroundColor = '#ffffff';
                  body.style.color = '#111827';
                }, 100);
                
                // Observar mudanças no DOM
                const observer = new MutationObserver(function() {
                  html.classList.remove('dark');
                  html.style.colorScheme = 'light';
                });
                
                observer.observe(html, {
                  attributes: true,
                  attributeFilter: ['class', 'style'],
                  subtree: true
                });
                
                // Interceptar tentativas de adicionar dark
                const originalAdd = DOMTokenList.prototype.add;
                DOMTokenList.prototype.add = function(...tokens) {
                  tokens = tokens.filter(t => t !== 'dark');
                  if (tokens.length > 0) {
                    return originalAdd.apply(this, tokens);
                  }
                };
                
                // Forçar variáveis CSS sempre claras
                document.documentElement.style.setProperty('--background', '#ffffff');
                document.documentElement.style.setProperty('--foreground', '#111827');
              })();
              
              if ('serviceWorker' in navigator) {
                setTimeout(function () {
                  navigator.serviceWorker
                    .register('/sw.js', { updateViaCache: 'none' })
                    .then(function (registration) {
                      registration.update();
                      console.log('SW registered: ', registration);
                    })
                    .catch(function (registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                }, 2000);
                window.addEventListener('pageshow', function (e) {
                  if (e.persisted && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(function (r) { r && r.update(); });
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
