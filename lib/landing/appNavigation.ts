import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export const OFTWARE_APP_ORIGIN = 'https://www.oftware.com.br';

export const APP_ACCESS_PATHS = ['/meta', '/metaadmin', '/metanutri', '/metapersonal'] as const;
export type AppAccessPath = (typeof APP_ACCESS_PATHS)[number];

const APP_PATH_SET = new Set<string>(APP_ACCESS_PATHS);

export function isMetodoEmagrecerHost(hostname?: string): boolean {
  const host = (hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '')).toLowerCase();
  return /ometodoemagrecer\.com\.br$/i.test(host);
}

export function withIndicacaoRef(path: string): string {
  if (path !== '/meta' || typeof window === 'undefined') return path;
  const ref = localStorage.getItem('indicacao_ref');
  return ref ? `/meta?ref=${encodeURIComponent(ref)}` : path;
}

/** Aceita apenas rotas internas da plataforma (evita open redirect). Retorna path + query permitidos. */
export function sanitizeAppNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.includes('://') || raw.startsWith('//')) return null;

  const [pathOnly, query = ''] = raw.split('?');
  if (!APP_PATH_SET.has(pathOnly)) return null;

  if (!query) return pathOnly;
  const params = new URLSearchParams(query);
  if (pathOnly === '/meta' && params.has('ref')) {
    return `/meta?ref=${encodeURIComponent(params.get('ref') ?? '')}`;
  }
  return pathOnly;
}

/** Rotas internas permitidas no login `/acessar?next=…` (inclui Meta Admin Geral). */
export function sanitizeLoginNextPath(raw: string | null | undefined): string | null {
  const appPath = sanitizeAppNextPath(raw);
  if (appPath) return appPath;
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.includes('://') || raw.startsWith('//')) return null;

  const pathOnly = raw.split('?')[0] ?? '';
  if (pathOnly !== '/metaadmingeral' && !pathOnly.startsWith('/metaadmingeral/')) {
    return null;
  }

  const qIdx = raw.indexOf('?');
  if (qIdx === -1) return pathOnly;
  const query = raw.slice(qIdx + 1);
  if (!query || !/^[a-zA-Z0-9_=&%.-]*$/.test(query)) return pathOnly;
  return raw;
}

/** URL de login na Oftware com retorno para a área escolhida. */
export function resolveAppAccessUrl(path: string, hostname?: string): string {
  const normalized = withIndicacaoRef(path);
  const safeNext = sanitizeAppNextPath(normalized) ?? sanitizeAppNextPath(path) ?? '/meta';
  const next = encodeURIComponent(safeNext);
  return `${OFTWARE_APP_ORIGIN}/acessar?next=${next}`;
}

/** Caminho interno para área operacional (mesmo host — Oftware ou organização). */
export function resolveAppPath(path: string, _hostname?: string): string {
  return withIndicacaoRef(path);
}

export function navigateToAppPath(router: AppRouterInstance, path: string): void {
  router.push(withIndicacaoRef(path));
}

export function navigateToAppAccess(path: string): void {
  window.location.assign(resolveAppAccessUrl(path));
}
