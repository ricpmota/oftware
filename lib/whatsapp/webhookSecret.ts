import { createHash, timingSafeEqual } from 'crypto';

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/** Compara secrets sem logar valores e sem vazar comprimento. */
export function webhookSecretsMatch(
  expected: string,
  received: string | null | undefined,
): boolean {
  if (!expected || !received) return false;
  return timingSafeEqual(sha256(expected), sha256(received));
}

export function readWebhookSecretHeader(headers: Headers): string | null {
  const named = headers.get('x-webhook-secret')?.trim();
  if (named) return named;
  const auth = headers.get('authorization')?.trim() ?? '';
  const bearer = /^Bearer\s+(.+)$/i.exec(auth);
  return bearer?.[1]?.trim() || null;
}

/** WPPConnect (callWebHook) não envia extraHeaders — aceitar secret na query. */
export function readWebhookSecret(
  request: { headers: Headers; nextUrl?: { searchParams: URLSearchParams }; url?: string },
): string | null {
  const header = readWebhookSecretHeader(request.headers);
  if (header) return header;
  const params = request.nextUrl?.searchParams;
  const fromNext =
    params?.get('secret')?.trim() || params?.get('token')?.trim() || null;
  if (fromNext) return fromNext;
  const rawUrl = request.url;
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl, 'http://localhost');
    return url.searchParams.get('secret')?.trim() || url.searchParams.get('token')?.trim() || null;
  } catch {
    return null;
  }
}

export function appendWebhookSecretToUrl(baseUrl: string, secret: string): string {
  const base = baseUrl.trim();
  const token = secret.trim();
  if (!base) return base;
  if (!token) return base;
  try {
    const url = new URL(base);
    if (!url.searchParams.get('secret') && !url.searchParams.get('token')) {
      url.searchParams.set('secret', token);
    }
    return url.toString();
  } catch {
    if (/[?&](secret|token)=/.test(base)) return base;
    return `${base}${base.includes('?') ? '&' : '?'}secret=${encodeURIComponent(token)}`;
  }
}

export function buildCanalChatInboundWebhookUrl(): string | undefined {
  const secret = process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET?.trim() ?? '';
  const explicit = process.env.WHATSAPP_INBOUND_WEBHOOK_URL?.trim();
  const origin = (
    process.env.PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://www.oftware.com.br'
  ).replace(/\/$/, '');
  const base = explicit || `${origin}/api/whatsapp/inbound`;
  if (!base) return undefined;
  return secret ? appendWebhookSecretToUrl(base, secret) : base;
}
