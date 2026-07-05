/** URL padrão de retorno após callback BRy (sem fixar aba na query). */
export function buildDefaultBryOAuthReturnUrl(origin?: string): string {
  const base =
    origin?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.oftware.com.br';
  try {
    return new URL('/metaadmin', base).toString();
  } catch {
    return 'https://www.oftware.com.br/metaadmin';
  }
}

export function resolveBryOAuthReturnUrl(returnUrl?: string | null, origin?: string): string {
  const fallback = buildDefaultBryOAuthReturnUrl(origin);
  const raw = returnUrl?.trim();
  if (!raw) return fallback;

  try {
    const url = new URL(raw);
    if (url.pathname === '/' || url.pathname === '') {
      return fallback;
    }
    return url.toString();
  } catch {
    return fallback;
  }
}

export type BryCloudOAuthReturnStatus = 'connected' | 'error';

export function parseBryCloudOAuthReturn(search: string): {
  status: BryCloudOAuthReturnStatus;
  message?: string;
} | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const status = params.get('bry_cloud')?.trim();
  if (status !== 'connected' && status !== 'error') return null;
  const message = params.get('bry_message')?.trim();
  return { status, message: message || undefined };
}

const BRY_OAUTH_HANDLED_KEY = 'oftware_bry_oauth_return_v1';

function buildBryOAuthReturnFingerprint(search: string, parsed: {
  status: BryCloudOAuthReturnStatus;
  message?: string;
}): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const state = params.get('state')?.trim() ?? '';
  return `${parsed.status}|${parsed.message ?? ''}|${state.slice(0, 48)}`;
}

/**
 * Lê o retorno BRy na URL uma única vez por sessão do browser (evita reexibir erro ao dar F5).
 */
export function consumeBryCloudOAuthReturn(search: string): {
  status: BryCloudOAuthReturnStatus;
  message?: string;
} | null {
  const parsed = parseBryCloudOAuthReturn(search);
  if (!parsed) return null;

  if (typeof sessionStorage === 'undefined') return parsed;

  const fingerprint = buildBryOAuthReturnFingerprint(search, parsed);
  try {
    if (sessionStorage.getItem(BRY_OAUTH_HANDLED_KEY) === fingerprint) {
      return null;
    }
    sessionStorage.setItem(BRY_OAUTH_HANDLED_KEY, fingerprint);
  } catch {
    // storage bloqueado (modo privado, iframe, etc.)
  }

  return parsed;
}

/** Remove parâmetros de retorno OAuth/BRy da barra de endereço. */
export function stripBryOAuthReturnParamsFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of ['bry_cloud', 'bry_message', 'menu', 'state', 'code', 'error', 'error_description']) {
      parsed.searchParams.delete(key);
    }
    const qs = parsed.searchParams.toString();
    return `${parsed.pathname}${qs ? `?${qs}` : ''}${parsed.hash}`;
  } catch {
    return url;
  }
}

/** @deprecated Use stripBryOAuthReturnParamsFromUrl */
export const stripBryCloudOAuthParamsFromUrl = stripBryOAuthReturnParamsFromUrl;
