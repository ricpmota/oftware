/**
 * Classificação de erros Gemini + retry com backoff/jitter e Retry-After.
 */

export type GeminiErrorType =
  | 'GEMINI_RATE_LIMITED'
  | 'GEMINI_UNAVAILABLE'
  | 'GEMINI_TIMEOUT'
  | 'GEMINI_INVALID_RESPONSE'
  | 'GEMINI_AUTH'
  | 'GEMINI_PERMISSION'
  | 'GEMINI_BAD_REQUEST'
  | 'GEMINI_UNKNOWN';

export type FoodImportErrorCode =
  | GeminiErrorType
  | 'TABLE_DETECTED_ZERO_ITEMS'
  | 'NO_FOOD_TABLE'
  | 'PARSER_ERROR'
  | 'VALIDATION_ERROR';

export class GeminiImportError extends Error {
  readonly code: GeminiErrorType;
  readonly httpStatus: number | null;
  readonly retryAfterMs: number | null;
  readonly transient: boolean;

  constructor(opts: {
    message: string;
    code: GeminiErrorType;
    httpStatus?: number | null;
    retryAfterMs?: number | null;
    transient?: boolean;
  }) {
    super(opts.message);
    this.name = 'GeminiImportError';
    this.code = opts.code;
    this.httpStatus = opts.httpStatus ?? null;
    this.retryAfterMs = opts.retryAfterMs ?? null;
    this.transient =
      opts.transient ??
      (opts.code === 'GEMINI_RATE_LIMITED' ||
        opts.code === 'GEMINI_UNAVAILABLE' ||
        opts.code === 'GEMINI_TIMEOUT');
  }
}

export function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;
  const asInt = Number(header);
  if (Number.isFinite(asInt) && asInt >= 0) return Math.round(asInt * 1000);
  const asDate = Date.parse(header);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());
  return null;
}

export function classifyGeminiHttpError(
  status: number,
  bodyMessage: string,
  retryAfterHeader: string | null
): GeminiImportError {
  const msg = bodyMessage || `HTTP ${status}`;
  const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
  const exhausted = /resource.?exhausted|rate.?limit|quota/i.test(msg);

  if (status === 429 || exhausted) {
    return new GeminiImportError({
      message: msg,
      code: 'GEMINI_RATE_LIMITED',
      httpStatus: status,
      retryAfterMs,
      transient: true,
    });
  }
  if (status === 503 || status === 502 || status === 504) {
    return new GeminiImportError({
      message: msg,
      code: 'GEMINI_UNAVAILABLE',
      httpStatus: status,
      retryAfterMs,
      transient: true,
    });
  }
  if (status === 401 || status === 403) {
    return new GeminiImportError({
      message: msg,
      code: status === 401 ? 'GEMINI_AUTH' : 'GEMINI_PERMISSION',
      httpStatus: status,
      transient: false,
    });
  }
  if (status === 400) {
    return new GeminiImportError({
      message: msg,
      code: 'GEMINI_BAD_REQUEST',
      httpStatus: status,
      transient: false,
    });
  }
  return new GeminiImportError({
    message: msg,
    code: 'GEMINI_UNKNOWN',
    httpStatus: status,
    retryAfterMs,
    transient: status >= 500,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  const spread = ms * 0.25;
  return Math.round(ms - spread + Math.random() * spread * 2);
}

export type GeminiRetryConfig = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export async function withGeminiRetry<T>(
  fn: (attempt: number) => Promise<T>,
  config?: GeminiRetryConfig
): Promise<T> {
  const maxAttempts = config?.maxAttempts ?? 5;
  const baseDelayMs = config?.baseDelayMs ?? 2000;
  const maxDelayMs = config?.maxDelayMs ?? 32000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (e) {
      lastError = e;
      const isTransient =
        e instanceof GeminiImportError
          ? e.transient
          : e instanceof Error && /timeout|network|ECONNRESET|fetch failed/i.test(e.message);

      if (!isTransient || attempt >= maxAttempts) throw e;

      let delay =
        e instanceof GeminiImportError && e.retryAfterMs != null
          ? e.retryAfterMs
          : Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      delay = jitter(Math.max(500, delay));
      await sleep(delay);
    }
  }
  throw lastError;
}

/** Delay sugerido para persistir nextRetryAt após esgotar tentativas na request. */
export function computeNextRetryDelayMs(attemptCount: number): number {
  const base = 2000 * 2 ** Math.max(0, attemptCount - 1);
  return jitter(Math.min(60000, base));
}
