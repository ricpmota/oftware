import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ORGANIZACAO_METODO_PUBLIC_ORIGIN } from '@/lib/tenant/organizacaoPublicOrigin';

const OFTWARE_ORIGIN = 'https://www.oftware.com.br';
const METODO_EMAGRECER_DEST = `${OFTWARE_ORIGIN}/metodo`;

function metodoEmagrecerHosts(): Set<string> {
  const raw = process.env.METODO_SITE_HOSTS?.trim();
  if (raw) {
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return new Set(['www.ometodoemagrecer.com.br', 'ometodoemagrecer.com.br']);
}

function isMetodoEmagrecerHost(host: string): boolean {
  if (!host) return false;
  return metodoEmagrecerHosts().has(host);
}

/** Redireciona HTTP → HTTPS (cadeado “não seguro” quando o usuário entra sem https). */
function redirectHttpToHttps(request: NextRequest): NextResponse | null {
  const hostHeader = request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';
  if (hostHeader === 'localhost' || hostHeader.endsWith('.local')) {
    return null;
  }
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (!proto || proto === 'https') {
    return null;
  }
  if (proto !== 'http') {
    return null;
  }
  const url = request.nextUrl.clone();
  url.protocol = 'https:';
  return NextResponse.redirect(url, 308);
}

function rafaelaHosts(): Set<string> {
  const raw = process.env.RAFAELA_SITE_HOSTS?.trim();
  if (raw) {
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return new Set(['www.rafaelaalbuquerque.com', 'rafaelaalbuquerque.com']);
}

/** Host “canônico” do pedido (Vercel / proxies costumam preencher x-forwarded-host). */
function requestHost(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-host');
  const fromForwarded = xf?.split(',')[0]?.trim();
  const raw = (fromForwarded || request.headers.get('host') || '').trim();
  return raw.split(':')[0].toLowerCase();
}

function isRafaelaHost(host: string): boolean {
  if (!host) return false;
  return rafaelaHosts().has(host);
}

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isMetodoStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/icones') ||
    pathname.startsWith('/logo') ||
    pathname.startsWith('/og-metodo') ||
    pathname.startsWith('/criativo-metodo') ||
    pathname.startsWith('/metodo-emagrecer') ||
    pathname.startsWith('/metodo-simbolo') ||
    pathname.startsWith('/simbolo-metodo') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sw.js'
  );
}

/** Rotas institucionais da Oftware — no domínio Método redirecionam para www.oftware.com.br. */
const METODO_OFTWARE_ONLY_PREFIXES = [
  '/whitelabel',
  '/metaadmingeral',
  '/mentoria',
  '/apresentacao',
  '/oftpay',
] as const;

function isMetodoOftwareOnlyRoute(pathname: string): boolean {
  if (pathname === '/instagram') return true;
  return METODO_OFTWARE_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Rotas operacionais da organização Método Emagrecer (Oftware 2.0 — Fase 1). */
function isMetodoOrganizacaoOperationalRoute(pathname: string): boolean {
  if (
    pathname === '/meta' ||
    pathname.startsWith('/meta/') ||
    pathname === '/metaadmin' ||
    pathname.startsWith('/metaadmin/') ||
    pathname === '/metanutri' ||
    pathname.startsWith('/metanutri/') ||
    pathname === '/metapersonal' ||
    pathname.startsWith('/metapersonal/')
  ) {
    return true;
  }
  if (pathname.startsWith('/aplicacao/')) return true;
  if (pathname.startsWith('/conclusao/')) return true;
  if (pathname.startsWith('/relatorio/')) return true;
  if (pathname.startsWith('/plano/')) return true;
  if (pathname.startsWith('/plano-terapeutico/')) return true;
  if (pathname.startsWith('/dr/')) return true;
  if (pathname.startsWith('/instagram/') && pathname.length > '/instagram/'.length) return true;
  return false;
}

/**
 * Domínio ometodoemagrecer.com.br (organização Método — Oftware 2.0):
 * - `/` reescreve internamente para `/metodo` (URL na barra permanece no domínio do Método).
 * - `/metodo` → 308 para `/`.
 * - Rotas operacionais da organização → permanecem no host Método.
 * - Rotas institucionais Oftware → redirect para www.oftware.com.br.
 * - Demais rotas → redirect para www.oftware.com.br.
 *
 * `METODO_SITE_HOSTS` (opcional): lista separada por vírgula.
 */
function handleMetodoEmagrecerHost(
  request: NextRequest,
  host: string,
  pathnameRaw: string,
  pathname: string,
  search: string
): NextResponse | null {
  if (!isMetodoEmagrecerHost(host)) {
    return null;
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  if (isMetodoStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname === '/metodo') {
    const u = new URL(request.url);
    u.pathname = '/';
    u.search = search;
    return NextResponse.redirect(u, 308);
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/metodo';
    const res = NextResponse.rewrite(url);
    res.headers.set('Vary', 'Host');
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res;
  }

  if (isMetodoOftwareOnlyRoute(pathname)) {
    return NextResponse.redirect(new URL(`${OFTWARE_ORIGIN}${pathnameRaw}${search}`));
  }

  if (isMetodoOrganizacaoOperationalRoute(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(`${OFTWARE_ORIGIN}${pathnameRaw}${search}`));
}

/** Quem cai na home da Oftware com Referer do domínio legado → /metodo. */
function redirectOftwareHomeFromMetodoReferer(request: NextRequest, host: string): NextResponse | null {
  const isOftwareHost = host === 'www.oftware.com.br' || host === 'oftware.com.br';
  if (!isOftwareHost) return null;

  const pathname = stripTrailingSlash(request.nextUrl.pathname) || '/';
  if (pathname !== '/') return null;

  const referer = (request.headers.get('referer') ?? '').toLowerCase();
  if (!referer.includes('ometodoemagrecer.com.br')) return null;

  return NextResponse.redirect(METODO_EMAGRECER_DEST, 308);
}

/**
 * Links legados em oftware.com.br/dr/* (artes, QR, etc.) → domínio da Organização Método.
 * Mesmo path e query; 308 permanente para SEO/bookmarks.
 */
function redirectOftwareDrLinksToMetodo(
  host: string,
  pathnameRaw: string,
  search: string
): NextResponse | null {
  const isOftwareHost = host === 'www.oftware.com.br' || host === 'oftware.com.br';
  if (!isOftwareHost) return null;

  const pathname = stripTrailingSlash(pathnameRaw) || '/';
  if (!pathname.startsWith('/dr/') && pathname !== '/dr') return null;

  const dest = new URL(`${ORGANIZACAO_METODO_PUBLIC_ORIGIN}${pathnameRaw}${search}`);
  return NextResponse.redirect(dest, 308);
}

/**
 * Domínio próprio da landing (ex.: www.rafaelaalbuquerque.com):
 * - `/` reescreve internamente para `/rafaelaalbuquerque` (URL na barra permanece no domínio comprado).
 * - `/rafaelaalbuquerque` ou `/rafaelaalbuquerque/` → 308 para `/`.
 * - `/.well-known/*` segue no mesmo host (ACME, apps links, etc.).
 * - Demais rotas → redirecionam para oftware.com.br.
 *
 * `RAFAELA_SITE_HOSTS` (opcional): lista separada por vírgula de hosts que disparam esta lógica.
 */
export function middleware(request: NextRequest) {
  const https = redirectHttpToHttps(request);
  if (https) return https;

  const host = requestHost(request);
  const pathnameRaw = request.nextUrl.pathname;
  const pathname = stripTrailingSlash(pathnameRaw) || '/';
  const search = request.nextUrl.search;

  const metodoHostResponse = handleMetodoEmagrecerHost(request, host, pathnameRaw, pathname, search);
  if (metodoHostResponse) return metodoHostResponse;

  const metodoRefererRedirect = redirectOftwareHomeFromMetodoReferer(request, host);
  if (metodoRefererRedirect) return metodoRefererRedirect;

  const drLegacyRedirect = redirectOftwareDrLinksToMetodo(host, pathnameRaw, search);
  if (drLegacyRedirect) return drLegacyRedirect;

  if (!isRafaelaHost(host)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/.well-known/')) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/rafaela-albuquerque') ||
    pathname.startsWith('/icones') ||
    pathname.startsWith('/logo') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sw.js'
  ) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/rafaelaalbuquerque';
    const res = NextResponse.rewrite(url);
    res.headers.set('Vary', 'Host');
    return res;
  }

  if (pathname === '/rafaelaalbuquerque') {
    const u = new URL(request.url);
    u.pathname = '/';
    u.search = search;
    return NextResponse.redirect(u, 308);
  }

  if (pathname.startsWith('/rafaelaalbuquerque/')) {
    return NextResponse.redirect(new URL(`${OFTWARE_ORIGIN}${pathnameRaw}${search}`));
  }

  return NextResponse.redirect(new URL(`${OFTWARE_ORIGIN}${pathnameRaw}${search}`));
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|webp|svg|gif|woff2?)$).*)'],
};
