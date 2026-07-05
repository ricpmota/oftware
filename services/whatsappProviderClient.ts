/**
 * Cliente isolado do provedor WhatsApp (WPPConnect Server).
 *
 * Escopo: apenas sessão, QR Code e status de conexão.
 * Não envia mensagens, não sincroniza conversas, contatos ou CRM.
 *
 * ## Onde rodar o WPPConnect Server
 * O servidor WPPConnect **não deve rodar na Vercel** (precisa de Chromium/Puppeteer e
 * processo persistente). Hospede-o em infraestrutura com processo long-running, por exemplo:
 * - Google Cloud Run (com memória adequada)
 * - Railway
 * - VPS (DigitalOcean, Hetzner, etc.)
 *
 * Configure no Oftware (Vercel de cada organização):
 * - `WPP_SERVER_URL` — URL central (ex.: https://whatsapp.oftware.com.br)
 * - `WPP_SERVER_TOKEN` — token Bearer central da Oftware
 * - `WHATSAPP_MOCK_MODE=true` — força mock local (opcional)
 *
 * Mock automático apenas quando `WHATSAPP_MOCK_MODE=true` **ou** `WPP_SERVER_URL` vazio.
 * SessionId: `org_{organizationId}_doctor_{doctorId}` (fallback: `doctor_{doctorId}`).
 *
 * Endpoints WPPConnect utilizados (Etapa 2):
 * - POST `/api/:session/start-session`
 * - GET  `/api/:session/status-session`
 * - POST `/api/:session/logout-session`
 */

export type WhatsappProviderSessionStatus = 'qr_pending' | 'connected' | 'disconnected' | 'error';

/** Retorno padronizado interno do provider. */
export interface WhatsappProviderResult {
  status: WhatsappProviderSessionStatus;
  qrCode?: string;
  phone?: string;
  profileName?: string;
  errorMessage?: string;
}

export interface WhatsappProviderStartResult extends WhatsappProviderResult {
  sessionId: string;
}

export type WhatsappProviderStatusResult = WhatsappProviderResult;

const DEFAULT_TIMEOUT_MS = 30_000;

export class WhatsappProviderError extends Error {
  readonly code: string;

  constructor(message: string, code = 'PROVIDER_ERROR') {
    super(message);
    this.name = 'WhatsappProviderError';
    this.code = code;
  }
}

function isMockMode(): boolean {
  if (process.env.WHATSAPP_MOCK_MODE === 'true') return true;
  if (!process.env.WPP_SERVER_URL?.trim()) return true;
  return false;
}

function getTimeoutMs(): number {
  const raw = Number(process.env.WPP_REQUEST_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_TIMEOUT_MS;
}

function getWppConfig(): { baseUrl: string; token: string } {
  const baseUrl = process.env.WPP_SERVER_URL?.trim().replace(/\/$/, '');
  const token = process.env.WPP_SERVER_TOKEN?.trim();

  if (!baseUrl) {
    throw new WhatsappProviderError(
      'WPP_SERVER_URL não configurado. Defina a URL do servidor WPPConnect ou WHATSAPP_MOCK_MODE=true.',
      'CONFIG_MISSING_URL',
    );
  }
  if (!token) {
    throw new WhatsappProviderError(
      'WPP_SERVER_TOKEN ausente. Configure o token Bearer do WPPConnect Server.',
      'CONFIG_MISSING_TOKEN',
    );
  }

  return { baseUrl, token };
}

function maskSessionId(sessionId: string): string {
  const id = sessionId.trim();
  if (id.length <= 12) return id;
  return `${id.slice(0, 12)}…`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `***${digits.slice(-4)}`;
}

function providerLog(
  event: 'startSession' | 'getSessionStatus' | 'disconnectSession',
  meta: Record<string, string | number | boolean | undefined>,
): void {
  console.info(`[whatsapp.provider] ${event}`, meta);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** WPPConnect pode aninhar dados em `response`. */
function flattenWppPayload(data: unknown): Record<string, unknown> {
  const root = asRecord(data);
  const nested = asRecord(root.response);
  return { ...root, ...nested };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function pickBoolean(obj: Record<string, unknown>, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'boolean') return value;
  }
  return undefined;
}

/** Normaliza QR para exibição em `<img src>`. */
export function normalizeQrCode(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith('data:image')) return value;
  return `data:image/png;base64,${value}`;
}

function normalizePhone(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return undefined;
  return raw.trim();
}

function normalizeProfileName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  return value || undefined;
}

const CONNECTED_STATUS_TOKENS = new Set([
  'connected',
  'islogged',
  'inchat',
  'main',
  'chatsavailable',
]);

const QR_PENDING_STATUS_TOKENS = new Set([
  'qrcode',
  'qr',
  'notlogged',
  'qrread',
  'qrreadsuccess',
  'pairing',
  'initializing',
  'opening',
  'unlaunched',
  'syncing',
]);

const DISCONNECTED_STATUS_TOKENS = new Set([
  'disconnected',
  'closed',
  'logout',
  'desconnectedmobile',
  'notconnected',
  'false',
]);

const EXPIRED_STATUS_TOKENS = new Set(['expired', 'qrexpiried', 'qrexpired', 'timeout', 'qrrefused']);

function normalizeStatusToken(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
}

function mapStatusToken(
  raw: unknown,
  context: { connectedFlag?: boolean; hasQr?: boolean; hasPhone?: boolean },
): WhatsappProviderSessionStatus {
  const token = normalizeStatusToken(raw);

  if (context.connectedFlag === true || context.hasPhone || CONNECTED_STATUS_TOKENS.has(token)) {
    return 'connected';
  }
  if (token === 'success' && context.hasQr) {
    return 'qr_pending';
  }
  if (EXPIRED_STATUS_TOKENS.has(token)) {
    return 'error';
  }
  if (DISCONNECTED_STATUS_TOKENS.has(token)) {
    return 'disconnected';
  }
  if (QR_PENDING_STATUS_TOKENS.has(token) || context.hasQr) {
    return 'qr_pending';
  }
  if (token === 'error' || token === 'fail' || token === 'failed') {
    return 'error';
  }
  return 'error';
}

function buildExpiredMessage(): string {
  return 'O QR Code expirou. Clique em Conectar WhatsApp para gerar um novo código.';
}

function parseProviderPayload(data: unknown): WhatsappProviderResult {
  const payload = flattenWppPayload(data);

  const qrCode = normalizeQrCode(pickString(payload, ['qrcode', 'qrCode', 'qr', 'base64Qr']));
  const phone = normalizePhone(
    pickString(payload, ['phone', 'wid', 'user', 'number', 'phoneNumber', 'formattedPhone']),
  );
  const profileName = normalizeProfileName(
    pickString(payload, ['pushname', 'profileName', 'name', 'displayName']),
  );
  const connectedFlag = pickBoolean(payload, ['connected', 'isLogged', 'isConnected']);
  const statusRaw = pickString(payload, ['status', 'state', 'sessionState', 'connectionState']);

  const mappedStatus = mapStatusToken(statusRaw, {
    connectedFlag,
    hasQr: Boolean(qrCode),
    hasPhone: Boolean(phone),
  });

  if (EXPIRED_STATUS_TOKENS.has(normalizeStatusToken(statusRaw))) {
    return { status: 'error', errorMessage: buildExpiredMessage(), qrCode: undefined };
  }

  if (mappedStatus === 'connected') {
    return { status: 'connected', phone, profileName };
  }
  if (mappedStatus === 'disconnected') {
    return { status: 'disconnected' };
  }
  if (mappedStatus === 'qr_pending') {
    return { status: 'qr_pending', qrCode };
  }

  const message =
    pickString(payload, ['message', 'error', 'errorMessage', 'reason']) ??
    (statusRaw ? `Status desconhecido do WPPConnect: ${statusRaw}` : 'Resposta inválida do servidor WPPConnect.');

  return { status: 'error', errorMessage: message };
}

function mapFetchError(error: unknown): WhatsappProviderError {
  if (error instanceof WhatsappProviderError) return error;

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new WhatsappProviderError(
        'Tempo esgotado ao comunicar com o servidor WPPConnect.',
        'TIMEOUT',
      );
    }

    const msg = error.message.toLowerCase();
    if (
      msg.includes('fetch failed') ||
      msg.includes('econnrefused') ||
      msg.includes('enotfound') ||
      msg.includes('network') ||
      msg.includes('socket')
    ) {
      return new WhatsappProviderError(
        'Servidor WPPConnect indisponível. Verifique se o serviço está online e tente novamente.',
        'OFFLINE',
      );
    }
  }

  return new WhatsappProviderError(
    'Não foi possível comunicar com o servidor WPPConnect.',
    'NETWORK_ERROR',
  );
}

async function readResponseBody(res: Response): Promise<{ json: unknown | null; text: string }> {
  const text = await res.text().catch(() => '');
  if (!text.trim()) return { json: null, text: '' };

  try {
    return { json: JSON.parse(text) as unknown, text };
  } catch {
    return { json: null, text };
  }
}

function mapHttpError(status: number, bodyText: string, json: unknown | null): WhatsappProviderError {
  const payload = json ? flattenWppPayload(json) : {};
  const serverMessage = pickString(payload, ['message', 'error', 'errorMessage']);

  if (status === 401 || status === 403) {
    return new WhatsappProviderError(
      'Token WPPConnect inválido ou ausente. Verifique WPP_SERVER_TOKEN.',
      'AUTH_ERROR',
    );
  }
  if (status === 404) {
    return new WhatsappProviderError('Sessão não encontrada no servidor WPPConnect.', 'SESSION_NOT_FOUND');
  }
  if (status === 408 || status === 504) {
    return new WhatsappProviderError(
      'Tempo esgotado ao comunicar com o servidor WPPConnect.',
      'TIMEOUT',
    );
  }
  if (status >= 500) {
    return new WhatsappProviderError(
      serverMessage ?? 'Servidor WPPConnect retornou erro interno. Tente novamente em instantes.',
      'SERVER_ERROR',
    );
  }

  return new WhatsappProviderError(
    serverMessage ?? bodyText.trim() ?? `Erro HTTP ${status} do servidor WPPConnect.`,
    'HTTP_ERROR',
  );
}

async function wppRequest(
  sessionId: string,
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const config = getWppConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
        ...(init?.headers ?? {}),
      },
    });

    const { json, text } = await readResponseBody(res);

    if (!res.ok) {
      throw mapHttpError(res.status, text, json);
    }

    if (json === null) {
      throw new WhatsappProviderError('Resposta inválida do servidor WPPConnect.', 'INVALID_RESPONSE');
    }

    return flattenWppPayload(json);
  } catch (error) {
    throw mapFetchError(error);
  } finally {
    clearTimeout(timeout);
  }
}

/** QR Code placeholder (SVG) para mock mode — não é um QR real do WhatsApp. */
export function generateMockQrCode(sessionId: string): string {
  const label = 'WhatsApp Mock';
  const sub = sessionId.slice(0, 24);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
    <rect width="280" height="280" fill="#f0fdf4"/>
    <rect x="20" y="20" width="240" height="240" fill="#fff" stroke="#059669" stroke-width="4"/>
    <text x="140" y="120" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" fill="#047857" font-weight="600">${label}</text>
    <text x="140" y="148" text-anchor="middle" font-family="monospace" font-size="11" fill="#6b7280">${sub}</text>
    <text x="140" y="175" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" fill="#9ca3af">Escaneie no app WhatsApp</text>
    <text x="140" y="200" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="#d1d5db">(modo mock)</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export async function startSession(sessionId: string): Promise<WhatsappProviderStartResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');

  if (isMockMode()) {
    providerLog('startSession', { mode: 'mock', sessionId: maskSessionId(id), hasQrCode: true });
    return {
      sessionId: id,
      status: 'qr_pending',
      qrCode: generateMockQrCode(id),
    };
  }

  providerLog('startSession', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  try {
    const payload = await wppRequest(id, `/api/${encodeURIComponent(id)}/start-session`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const parsed = parseProviderPayload(payload);

    if (parsed.status === 'connected') {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'connected',
        hasPhone: Boolean(parsed.phone),
        phoneMasked: parsed.phone ? maskPhone(parsed.phone) : undefined,
        hasProfileName: Boolean(parsed.profileName),
      });
      return { sessionId: id, ...parsed };
    }

    if (parsed.status === 'qr_pending' && parsed.qrCode) {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'qr_pending',
        hasQrCode: true,
        qrCodeLength: parsed.qrCode.length,
      });
      return { sessionId: id, status: 'qr_pending', qrCode: parsed.qrCode };
    }

    if (parsed.status === 'error') {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'error',
        errorMessage: parsed.errorMessage,
      });
      throw new WhatsappProviderError(
        parsed.errorMessage ?? 'Não foi possível iniciar a sessão WhatsApp.',
        'START_SESSION_ERROR',
      );
    }

    // Sessão já em andamento sem QR na resposta — consulta status atual.
    const status = await getSessionStatus(id);

    if (status.status === 'connected') {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'connected_via_status',
        hasPhone: Boolean(status.phone),
        phoneMasked: status.phone ? maskPhone(status.phone) : undefined,
      });
      return { sessionId: id, ...status };
    }

    if (status.status === 'qr_pending' && status.qrCode) {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'qr_pending_via_status',
        hasQrCode: true,
        qrCodeLength: status.qrCode.length,
      });
      return { sessionId: id, status: 'qr_pending', qrCode: status.qrCode };
    }

    if (status.status === 'error') {
      throw new WhatsappProviderError(
        status.errorMessage ?? 'Não foi possível obter o QR Code do WhatsApp.',
        'QR_NOT_RECEIVED',
      );
    }

    providerLog('startSession', { sessionId: maskSessionId(id), result: 'qr_not_received' });
    throw new WhatsappProviderError(
      'QR Code não recebido do servidor WPPConnect. Tente novamente.',
      'QR_NOT_RECEIVED',
    );
  } catch (error) {
    const mapped = mapFetchError(error);
    providerLog('startSession', {
      sessionId: maskSessionId(id),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  }
}

export async function getSessionStatus(sessionId: string): Promise<WhatsappProviderStatusResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');

  if (isMockMode()) {
    providerLog('getSessionStatus', { mode: 'mock', sessionId: maskSessionId(id), result: 'qr_pending' });
    return { status: 'qr_pending' };
  }

  providerLog('getSessionStatus', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  try {
    const payload = await wppRequest(id, `/api/${encodeURIComponent(id)}/status-session`, {
      method: 'GET',
    });

    const parsed = parseProviderPayload(payload);

    providerLog('getSessionStatus', {
      sessionId: maskSessionId(id),
      result: parsed.status,
      hasQrCode: Boolean(parsed.qrCode),
      hasPhone: Boolean(parsed.phone),
      phoneMasked: parsed.phone ? maskPhone(parsed.phone) : undefined,
      hasProfileName: Boolean(parsed.profileName),
      errorMessage: parsed.status === 'error' ? parsed.errorMessage : undefined,
    });

    if (parsed.status === 'error' && !parsed.errorMessage) {
      return { status: 'error', errorMessage: 'Erro ao consultar status da sessão WhatsApp.' };
    }

    return parsed;
  } catch (error) {
    const mapped = mapFetchError(error);

    providerLog('getSessionStatus', {
      sessionId: maskSessionId(id),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });

    return { status: 'error', errorMessage: mapped.message };
  }
}

export async function disconnectSession(sessionId: string): Promise<void> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');

  if (isMockMode()) {
    providerLog('disconnectSession', { mode: 'mock', sessionId: maskSessionId(id), result: 'ok' });
    return;
  }

  providerLog('disconnectSession', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  try {
    await wppRequest(id, `/api/${encodeURIComponent(id)}/logout-session`, { method: 'POST', body: '{}' });
    providerLog('disconnectSession', { sessionId: maskSessionId(id), result: 'ok' });
  } catch (error) {
    const mapped = mapFetchError(error);

    const msg = mapped.message.toLowerCase();
    const alreadyClosed =
      mapped.code === 'SESSION_NOT_FOUND' ||
      msg.includes('not found') ||
      msg.includes('already') ||
      msg.includes('closed') ||
      msg.includes('logout');

    if (alreadyClosed) {
      providerLog('disconnectSession', {
        sessionId: maskSessionId(id),
        result: 'already_disconnected',
        code: mapped.code,
      });
      return;
    }

    providerLog('disconnectSession', {
      sessionId: maskSessionId(id),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });

    throw mapped;
  }
}

export function isWhatsappMockMode(): boolean {
  return isMockMode();
}

/** Em mock mode, simula conexão após aguardar leitura do QR (apenas testes de UI). */
export const MOCK_QR_AUTO_CONNECT_MS = 15_000;

export function getMockConnectedProfile(sessionId: string): { phone: string; profileName: string } {
  return {
    phone: '+55 83 90000-0000',
    profileName: `Dr. Mock (${sessionId.slice(-6)})`,
  };
}
