import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const OFTWARE_ORIGIN = 'https://www.oftware.com.br';

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
  if (!isRafaelaHost(host)) {
    return NextResponse.next();
  }

  const pathnameRaw = request.nextUrl.pathname;
  const pathname = stripTrailingSlash(pathnameRaw) || '/';
  const search = request.nextUrl.search;

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
