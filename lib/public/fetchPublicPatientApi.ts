/** Fetch para páginas públicas de paciente (aplicação/conclusão), com retry e bypass de cache. */
export async function fetchPublicPatientApi(
  path: string,
  init?: RequestInit,
  options?: { retries?: number; retryDelayMs?: number }
): Promise<Response> {
  const retries = options?.retries ?? 2;
  const retryDelayMs = options?.retryDelayMs ?? 500;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = path.startsWith('http') ? path : `${origin}${path.startsWith('/') ? path : `/${path}`}`;

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, {
        ...init,
        cache: 'no-store',
        credentials: 'same-origin',
      });
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export function formatPublicPatientFetchError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/load failed|failed to fetch|networkerror|network error|the internet connection appears to be offline/i.test(msg)) {
    return 'Falha de conexão. Verifique sua internet e tente abrir o link novamente.';
  }
  return msg || 'Erro ao carregar';
}
