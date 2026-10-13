/**
 * Cliente isolado do provedor WhatsApp (WPPConnect Server).
 *
 * Escopo: sessão, QR Code, status e envio de teste manual.
 * Não sincroniza conversas, contatos ou CRM.
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
 * - `WPP_SERVER_SECRET_KEY` — mesma SECRET_KEY do servidor WPPConnect (apenas server-side)
 * - `WHATSAPP_MOCK_MODE=true` — força mock local (opcional)
 *
 * Mock automático apenas quando `WHATSAPP_MOCK_MODE=true` **ou** `WPP_SERVER_URL` vazio.
 * SessionId: `org_{organizationId}_doctor_{doctorId}` (fallback: `doctor_{doctorId}`).
 * Token Bearer por sessão: gerado via `POST /api/:session/:secretkey/generate-token`.
 *
 * Endpoints WPPConnect utilizados:
 * - POST `/api/:session/:secretkey/generate-token`
 * - POST `/api/:session/start-session`
 * - GET  `/api/:session/status-session`
 * - POST `/api/:session/logout-session`
 * - POST `/api/:session/close-session`
 * - POST `/api/:session/:secretkey/clear-session-data`
 * - POST `/api/:session/send-message` (envio de teste / automações)
 */

import {
  applyBrazilMobileNinthDigit,
  InternationalPhoneError,
  resolveInternationalPhone,
  resolvePhoneForWhatsappSend,
} from '@/lib/whatsapp/resolveInternationalPhone';

export { applyBrazilMobileNinthDigit };

export type WhatsappProviderSessionStatus = 'qr_pending' | 'connected' | 'disconnected' | 'error';

/** Retorno padronizado interno do provider. */
export interface WhatsappProviderResult {
  status: WhatsappProviderSessionStatus;
  qrCode?: string;
  /** Código bruto do WPP (quando o PNG ainda não veio no status). */
  urlcode?: string;
  phone?: string;
  profileName?: string;
  errorMessage?: string;
}

export interface WhatsappProviderStartResult extends WhatsappProviderResult {
  sessionId: string;
  /** Sessão já estava em QR/inicialização — nenhum reset/start extra foi feito. */
  alreadyStarting?: boolean;
}

export type WhatsappProviderStatusResult = WhatsappProviderResult;

const DEFAULT_TIMEOUT_MS = 30_000;
const QR_POLL_INTERVAL_MS = 2_000;
const QR_POLL_MAX_ATTEMPTS = 15;

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

function getWppServerConfig(): { baseUrl: string; secretKey: string } {
  const baseUrl = process.env.WPP_SERVER_URL?.trim().replace(/\/$/, '');
  const secretKey = process.env.WPP_SERVER_SECRET_KEY?.trim();

  if (!baseUrl) {
    throw new WhatsappProviderError(
      'WPP_SERVER_URL não configurado. Defina a URL do servidor WPPConnect ou WHATSAPP_MOCK_MODE=true.',
      'CONFIG_MISSING_URL',
    );
  }
  if (!secretKey) {
    throw new WhatsappProviderError(
      'WPP_SERVER_SECRET_KEY ausente. Configure a SECRET_KEY do WPPConnect Server (apenas server-side).',
      'CONFIG_MISSING_SECRET',
    );
  }

  return { baseUrl, secretKey };
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
  event: 'generateToken' | 'startSession' | 'getSessionStatus' | 'disconnectSession' | 'sendTestMessage',
  meta: Record<string, string | number | boolean | undefined>,
): void {
  console.info(`[whatsapp.provider] ${event}`, meta);
}

function newSendTraceId(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return uuid.replace(/-/g, '').slice(0, 12);
}

/** Logs de rastreio do envio — nunca podem alterar o fluxo. */
function sendTestMessageTrace(meta: Record<string, unknown>): void {
  try {
    console.info('[whatsapp.provider] sendTestMessage', meta);
  } catch {
    /* ignore */
  }
}

function compactTraceScalar(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}…` : trimmed;
}

function compactWidShape(value: unknown): unknown {
  const scalar = compactTraceScalar(value);
  if (scalar !== undefined) return scalar;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const rec = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of ['_serialized', 'id', 'user', 'server'] as const) {
    const compact = compactTraceScalar(rec[key]);
    if (compact !== undefined) out[key] = compact;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Recorte mínimo do pn-lid — sem contact/nome/foto/payload completo. */
function summarizePnLidShape(payload: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const serialized = compactTraceScalar(payload._serialized);
  if (serialized !== undefined) out._serialized = serialized;
  const lid = compactWidShape(payload.lid);
  if (lid !== undefined) out.lid = lid;
  const id = compactWidShape(payload.id);
  if (id !== undefined) out.id = id;
  const user = compactTraceScalar(payload.user);
  if (user !== undefined) out.user = user;
  return out;
}

function resolvedChatTypeOf(chatId: string): 'lid' | 'c.us' | 'other' {
  if (/@lid$/i.test(chatId)) return 'lid';
  if (/@c\.us$/i.test(chatId)) return 'c.us';
  return 'other';
}

function peekSendResponseForLog(payload: Record<string, unknown>): {
  providerStatus?: string;
  ack?: number;
  isSendFailure?: boolean;
  error?: string;
} {
  const providerStatus =
    typeof payload.status === 'string' && payload.status.trim()
      ? payload.status.trim()
      : undefined;
  const response = payload.response;
  const first = Array.isArray(response) ? asRecord(response[0]) : asRecord(response);
  const error =
    pickString(first, ['message', 'error', 'errorMessage']) ||
    pickString(payload, ['message', 'error', 'errorMessage']);
  return {
    providerStatus,
    ack: typeof first.ack === 'number' ? first.ack : undefined,
    isSendFailure: first.isSendFailure === true,
    error,
  };
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

function extractWppErrorMessage(json: unknown, bodyText: string): string | undefined {
  const trimmedBody = bodyText.trim();
  if (trimmedBody && !trimmedBody.startsWith('{') && !trimmedBody.startsWith('[')) {
    return trimmedBody;
  }

  if (!json || typeof json !== 'object') return undefined;
  const payload = flattenWppPayload(json);

  const direct = pickString(payload, ['message', 'errorMessage']);
  if (direct && direct !== 'Error') return direct;

  const errField = payload.error;
  if (typeof errField === 'string' && errField.trim()) return errField.trim();
  if (errField && typeof errField === 'object' && !Array.isArray(errField)) {
    const nested = errField as Record<string, unknown>;
    const nestedMsg = pickString(nested, ['message', 'errorMessage', 'reason']);
    if (nestedMsg) return nestedMsg;
  }

  return direct;
}

function userFacingSendError(serverMessage: string | undefined): string {
  const raw = (serverMessage ?? '').toLowerCase();

  if (raw.includes('não existe') || raw.includes('not exist') || raw.includes('invalid wid')) {
    return 'O número informado não está disponível no WhatsApp. Confira o país e o número informado.';
  }
  if (
    raw.includes('msgchunks') ||
    raw.includes('not connected') ||
    raw.includes('disconnected') ||
    raw.includes('session is not active')
  ) {
    return 'Sessão WhatsApp instável. Clique em Conectar e gere um novo QR Code.';
  }
  if (raw.includes('error sending')) {
    return 'Falha ao enviar pelo WhatsApp. A sessão pode estar instável — use Desconectar, remova o dispositivo no celular se ainda aparecer, e Conectar com QR novo.';
  }
  if (!serverMessage?.trim()) {
    return 'Falha ao enviar pelo WhatsApp. Clique em Conectar, gere um novo QR Code e tente novamente.';
  }
  return serverMessage;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function phonesLikelyMatch(a: string, b: string): boolean {
  const da = applyBrazilMobileNinthDigit(digitsOnly(a));
  const db = applyBrazilMobileNinthDigit(digitsOnly(b));
  if (!da || !db) return false;
  if (da === db) return true;
  // Últimos 8 dígitos = linha local (ignora DDI/DDD/9º dígito).
  if (da.length >= 8 && db.length >= 8 && da.slice(-8) === db.slice(-8)) return true;
  const tailLen = Math.min(11, da.length, db.length);
  return tailLen >= 8 && da.slice(-tailLen) === db.slice(-tailLen);
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
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    return normalizeQrCode(obj.base64 ?? obj.base64Image ?? obj.qrcode ?? obj.qrCode ?? obj.code);
  }
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith('data:image')) return value;
  // urlcode bruto do WPP (não é imagem) — ignorar aqui; usar qrcode-session / QRCode.toDataURL.
  if (value.length < 200 && !/^[A-Za-z0-9+/=]+$/.test(value.slice(0, 80))) return undefined;
  if (value.length < 64) return undefined;
  return `data:image/png;base64,${value}`;
}

function normalizePhone(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  // wid: 5583999999999@c.us → extrai dígitos
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 8) return undefined;
  // WPP costuma devolver BR sem o 9º dígito (ex.: 558388192848 → 5583988192848).
  const withCountry =
    digits.startsWith('55') || digits.length > 11
      ? digits
      : digits.length >= 10
        ? `55${digits}`
        : digits;
  return applyBrazilMobileNinthDigit(withCountry);
}

const phoneCacheBySession = new Map<string, { phone?: string; profileName?: string; at: number }>();
const PHONE_CACHE_TTL_MS = 5 * 60_000;

async function fetchConnectedPhone(
  sessionId: string,
  accessToken: string,
): Promise<{ phone?: string; profileName?: string }> {
  const cached = phoneCacheBySession.get(sessionId);
  if (cached && Date.now() - cached.at < PHONE_CACHE_TTL_MS) {
    return { phone: cached.phone, profileName: cached.profileName };
  }

  const tryPaths = [
    `/api/${encodeURIComponent(sessionId)}/get-phone-number`,
    `/api/${encodeURIComponent(sessionId)}/host-device`,
  ];

  for (const path of tryPaths) {
    try {
      const payload = await wppRequest(sessionId, path, accessToken, { method: 'GET' }, { timeoutMs: 6_000 });
      const flat = flattenWppPayload(payload);
      const phone =
        normalizePhone(
          pickString(flat, [
            'phone',
            'response',
            'wid',
            'user',
            'number',
            'phoneNumber',
            'formattedPhone',
            'id',
          ]),
        ) ?? normalizePhone(typeof flat.response === 'string' ? flat.response : undefined);
      const profileName = normalizeProfileName(
        pickString(flat, ['pushname', 'profileName', 'name', 'displayName']),
      );
      if (phone || profileName) {
        phoneCacheBySession.set(sessionId, { phone, profileName, at: Date.now() });
        return { phone, profileName };
      }
    } catch {
      // tenta próximo endpoint
    }
  }

  return {};
}

function normalizeProfileName(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  return value || undefined;
}

const CONNECTED_STATUS_TOKENS = new Set([
  'connected',
  'inchat',
  'main',
  'chatsavailable',
]);

/** isLogged sozinho costuma ser sessão fantasma no disco; só confiar com telefone. */
const WEAK_CONNECTED_STATUS_TOKENS = new Set(['islogged']);

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
  'success',
  'browser',
]);

/**
 * Estados WPP 2.10.4 (e equivalentes já mapeados neste cliente) em que um
 * Chromium já está subindo ou esperando pareamento. Não inventar tokens.
 * status-session devolve client.status: INITIALIZING | QRCODE | PHONECODE | CONNECTED | CLOSED.
 */
const SESSION_START_IN_PROGRESS_TOKENS = new Set([
  'qrcode',
  'qr',
  'initializing',
  'pairing',
  'opening',
  'phonecode',
]);

const startSessionInFlight = new Map<string, Promise<WhatsappProviderStartResult>>();

/** True quando status-session indica start/QR já em andamento nesta sessionId. */
export function isSessionStartInProgress(input: {
  status?: WhatsappProviderSessionStatus | string;
  rawStatus?: string;
}): boolean {
  const raw = normalizeStatusToken(input.rawStatus);
  if (raw && SESSION_START_IN_PROGRESS_TOKENS.has(raw)) return true;
  const statusToken = normalizeStatusToken(input.status);
  return Boolean(statusToken) && SESSION_START_IN_PROGRESS_TOKENS.has(statusToken);
}

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

  // CONNECTED/inChat após pareamento — aceitar mesmo sem telefone no payload.
  if (CONNECTED_STATUS_TOKENS.has(token) || (context.connectedFlag === true && context.hasPhone)) {
    return 'connected';
  }
  if (WEAK_CONNECTED_STATUS_TOKENS.has(token) && context.hasPhone) {
    return 'connected';
  }
  // QR / pairing
  if (context.hasQr || QR_PENDING_STATUS_TOKENS.has(token)) {
    return 'qr_pending';
  }
  // isLogged sem telefone = restauração fantasma (não promover).
  if (WEAK_CONNECTED_STATUS_TOKENS.has(token)) {
    return 'qr_pending';
  }
  if (EXPIRED_STATUS_TOKENS.has(token)) {
    return 'error';
  }
  if (DISCONNECTED_STATUS_TOKENS.has(token)) {
    return 'disconnected';
  }
  if (token === 'error' || token === 'fail' || token === 'failed') {
    return 'error';
  }
  if (!token) {
    return 'qr_pending';
  }
  return 'error';
}

function buildExpiredMessage(): string {
  return 'O QR Code expirou. Clique em Conectar WhatsApp para gerar um novo código.';
}

function parseProviderPayload(data: unknown): WhatsappProviderResult {
  const payload = flattenWppPayload(data);

  const qrCode =
    normalizeQrCode(pickString(payload, ['qrcode', 'qrCode', 'qr', 'base64Qr', 'base64'])) ??
    normalizeQrCode(payload.qrcode) ??
    normalizeQrCode(payload.qrCode);

  const phone = normalizePhone(
    pickString(payload, ['phone', 'wid', 'user', 'number', 'phoneNumber', 'formattedPhone']),
  );
  const profileName = normalizeProfileName(
    pickString(payload, ['pushname', 'profileName', 'name', 'displayName']),
  );
  const connectedFlag = pickBoolean(payload, ['connected', 'isLogged', 'isConnected']);
  const statusRaw = pickString(payload, ['status', 'state', 'sessionState', 'connectionState']);
  const urlcode = pickString(payload, ['urlcode', 'urlCode']);

  const mappedStatus = mapStatusToken(statusRaw, {
    connectedFlag,
    hasQr: Boolean(qrCode || urlcode),
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
    return { status: 'qr_pending', qrCode, urlcode: urlcode && !qrCode ? urlcode : undefined };
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
  const serverMessage = extractWppErrorMessage(json, bodyText);

  if (status === 401 || status === 403) {
    return new WhatsappProviderError(
      'Token da sessão WPPConnect inválido ou ausente.',
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
      userFacingSendError(serverMessage),
      'SERVER_ERROR',
    );
  }

  return new WhatsappProviderError(
    userFacingSendError(serverMessage) ??
      serverMessage ??
      bodyText.trim() ??
      `Erro HTTP ${status} do servidor WPPConnect.`,
    'HTTP_ERROR',
  );
}

async function wppRequest(
  sessionId: string,
  path: string,
  accessToken: string,
  init?: RequestInit,
  options?: {
    timeoutMs?: number;
    flatten?: boolean;
    /** Observabilidade apenas — não altera o retorno nem o throw. */
    onHttp?: (httpStatus: number, ok: boolean) => void;
  },
): Promise<Record<string, unknown>> {
  const { baseUrl } = getWppServerConfig();
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? getTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });

    const { json, text } = await readResponseBody(res);

    if (options?.onHttp) {
      try {
        options.onHttp(res.status, res.ok);
      } catch {
        /* ignore */
      }
    }

    if (!res.ok) {
      throw mapHttpError(res.status, text, json);
    }

    if (json === null) {
      throw new WhatsappProviderError('Resposta inválida do servidor WPPConnect.', 'INVALID_RESPONSE');
    }

    if (options?.flatten === false) {
      return asRecord(json);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSessionStatusPayload(
  sessionId: string,
  accessToken: string,
): Promise<WhatsappProviderResult> {
  const payload = await wppRequest(
    sessionId,
    `/api/${encodeURIComponent(sessionId)}/status-session`,
    accessToken,
    { method: 'GET' },
  );
  return parseProviderPayload(payload);
}

async function peekWppSessionForStart(
  sessionId: string,
  accessToken: string,
): Promise<{ mapped: WhatsappProviderResult; rawStatus: string } | null> {
  try {
    const payload = await wppRequest(
      sessionId,
      `/api/${encodeURIComponent(sessionId)}/status-session`,
      accessToken,
      { method: 'GET' },
    );
    const rawStatus = pickString(payload, ['status', 'state', 'sessionState', 'connectionState']) ?? '';
    return { mapped: parseProviderPayload(payload), rawStatus };
  } catch (error) {
    const mapped = mapFetchError(error);
    if (mapped.code === 'AUTH_ERROR') throw mapped;
    return null;
  }
}

/** GET /qrcode-session — retorna PNG quando o Chromium já gerou o urlcode. */
async function fetchQrCodePngDataUrl(
  sessionId: string,
  accessToken: string,
): Promise<string | undefined> {
  const { baseUrl } = getWppServerConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const res = await fetch(`${baseUrl}/api/${encodeURIComponent(sessionId)}/qrcode-session`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'image/png, application/json',
      },
    });

    const contentType = res.headers.get('content-type') ?? '';
    if (!res.ok) return undefined;

    if (contentType.includes('image')) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength < 80) return undefined;
      return `data:image/png;base64,${buf.toString('base64')}`;
    }

    const { json } = await readResponseBody(res);
    if (!json) return undefined;
    const parsed = parseProviderPayload(json);
    return parsed.qrCode;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveQrImage(
  sessionId: string,
  accessToken: string,
  parsed: WhatsappProviderResult,
): Promise<string | undefined> {
  if (parsed.qrCode) return parsed.qrCode;

  const fromEndpoint = await fetchQrCodePngDataUrl(sessionId, accessToken);
  if (fromEndpoint) return fromEndpoint;

  if (parsed.urlcode) {
    try {
      const QRCode = (await import('qrcode')).default;
      return await QRCode.toDataURL(parsed.urlcode, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 400,
      });
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/** Gera token Bearer WPPConnect para uma sessão via SECRET_KEY (server-side only). */
export async function generateWppSessionToken(sessionId: string): Promise<string> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');

  if (isMockMode()) {
    providerLog('generateToken', { mode: 'mock', sessionId: maskSessionId(id) });
    return 'mock-wpp-session-token';
  }

  const { baseUrl, secretKey } = getWppServerConfig();
  const path = `/api/${encodeURIComponent(id)}/${encodeURIComponent(secretKey)}/generate-token`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  providerLog('generateToken', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const { json, text } = await readResponseBody(res);

    if (!res.ok) {
      const payload = json ? flattenWppPayload(json) : {};
      const serverMessage = pickString(payload, ['message', 'error', 'errorMessage']);

      if (res.status === 400 && serverMessage?.toLowerCase().includes('secret')) {
        throw new WhatsappProviderError(
          'WPP_SERVER_SECRET_KEY incorreta. Verifique se coincide com a SECRET_KEY da VM.',
          'CONFIG_INVALID_SECRET',
        );
      }

      throw mapHttpError(res.status, text, json);
    }

    if (json === null) {
      throw new WhatsappProviderError('Resposta inválida ao gerar token WPPConnect.', 'INVALID_RESPONSE');
    }

    const payload = flattenWppPayload(json);
    const token = pickString(payload, ['token']);
    if (!token) {
      throw new WhatsappProviderError('Campo token ausente na resposta do WPPConnect.', 'INVALID_RESPONSE');
    }

    providerLog('generateToken', { mode: 'wppconnect', sessionId: maskSessionId(id), result: 'ok' });
    return token;
  } catch (error) {
    const mapped = mapFetchError(error);
    providerLog('generateToken', {
      sessionId: maskSessionId(id),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });
    throw mapped;
  } finally {
    clearTimeout(timeout);
  }
}

async function runStartSession(
  id: string,
  token: string,
  options?: { forceFreshQr?: boolean },
): Promise<WhatsappProviderStartResult> {
  if (isMockMode()) {
    providerLog('startSession', { mode: 'mock', sessionId: maskSessionId(id), hasQrCode: true });
    return {
      sessionId: id,
      status: 'qr_pending',
      qrCode: generateMockQrCode(id),
    };
  }

  const forceFreshQr = options?.forceFreshQr !== false;

  providerLog('startSession', {
    mode: 'wppconnect',
    sessionId: maskSessionId(id),
    forceFreshQr,
  });

  try {
    const peeked = await peekWppSessionForStart(id, token);

    if (peeked?.mapped.status === 'connected') {
      let phone = peeked.mapped.phone;
      let profileName = peeked.mapped.profileName;
      if (!phone) {
        const host = await fetchConnectedPhone(id, token);
        phone = host.phone;
        profileName = profileName ?? host.profileName;
      }
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'already_connected',
        forceFreshQr,
        hasPhone: Boolean(phone),
        phoneMasked: phone ? maskPhone(phone) : undefined,
      });
      return { sessionId: id, status: 'connected', phone, profileName };
    }

    if (
      peeked &&
      isSessionStartInProgress({ status: peeked.rawStatus, rawStatus: peeked.rawStatus })
    ) {
      const qr = await resolveQrImage(id, token, peeked.mapped);
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'already_starting',
        forceFreshQr,
        rawStatus: peeked.rawStatus || undefined,
        hasQrCode: Boolean(qr),
      });
      return {
        sessionId: id,
        status: 'qr_pending',
        qrCode: qr ?? peeked.mapped.qrCode,
        urlcode: peeked.mapped.urlcode,
        alreadyStarting: true,
      };
    }

    if (forceFreshQr) {
      await resetSessionForFreshQr(id, token);
    }

    // waitQrCode:false — responde rápido (evita 504). O QR vem no poll / qrcode-session.
    const payload = await wppRequest(
      id,
      `/api/${encodeURIComponent(id)}/start-session`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ waitQrCode: false }),
      },
      { timeoutMs: Math.min(getTimeoutMs(), 12_000) },
    );

    const parsed = parseProviderPayload(payload);

    if (parsed.status === 'connected') {
      let phone = parsed.phone;
      let profileName = parsed.profileName;
      if (!phone) {
        const host = await fetchConnectedPhone(id, token);
        phone = host.phone;
        profileName = profileName ?? host.profileName;
      }
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'connected',
        hasPhone: Boolean(phone),
        phoneMasked: phone ? maskPhone(phone) : undefined,
        hasProfileName: Boolean(profileName),
      });
      return { sessionId: id, status: 'connected', phone, profileName };
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

    const qrFromStart = await resolveQrImage(id, token, parsed);
    if (qrFromStart) {
      providerLog('startSession', {
        sessionId: maskSessionId(id),
        result: 'qr_pending',
        hasQrCode: true,
        qrCodeLength: qrFromStart.length,
      });
      return { sessionId: id, status: 'qr_pending', qrCode: qrFromStart };
    }

    // Chromium sobe em background após start — tenta status/qrcode algumas vezes (curto).
    for (let attempt = 0; attempt < 4; attempt++) {
      await sleep(1_500);
      const status = await fetchSessionStatusPayload(id, token);
      if (status.status === 'connected') {
        let phone = status.phone;
        let profileName = status.profileName;
        if (!phone) {
          const host = await fetchConnectedPhone(id, token);
          phone = host.phone;
          profileName = profileName ?? host.profileName;
        }
        return { sessionId: id, status: 'connected', phone, profileName };
      }
      if (status.status === 'error') {
        throw new WhatsappProviderError(
          status.errorMessage ?? 'Não foi possível obter o QR Code do WhatsApp.',
          'QR_NOT_RECEIVED',
        );
      }
      const qr = await resolveQrImage(id, token, status);
      if (qr) {
        providerLog('startSession', {
          sessionId: maskSessionId(id),
          result: 'qr_pending_via_status',
          hasQrCode: true,
          qrCodeLength: qr.length,
        });
        return { sessionId: id, status: 'qr_pending', qrCode: qr };
      }
    }

    providerLog('startSession', {
      sessionId: maskSessionId(id),
      result: 'qr_pending_deferred',
      hasQrCode: false,
    });
    return { sessionId: id, status: 'qr_pending' };
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

export async function startSession(
  sessionId: string,
  accessToken: string,
  options?: { forceFreshQr?: boolean },
): Promise<WhatsappProviderStartResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');
  const token = accessToken?.trim();
  if (!token && !isMockMode()) {
    throw new WhatsappProviderError('accessToken é obrigatório.', 'INVALID_TOKEN');
  }

  const inFlight = startSessionInFlight.get(id);
  if (inFlight) return inFlight;

  const run = runStartSession(id, token, options).finally(() => {
    if (startSessionInFlight.get(id) === run) {
      startSessionInFlight.delete(id);
    }
  });
  startSessionInFlight.set(id, run);
  return run;
}

export async function closeSession(sessionId: string, accessToken: string): Promise<void> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');
  const token = accessToken?.trim();
  if (!token && !isMockMode()) {
    throw new WhatsappProviderError('accessToken é obrigatório.', 'INVALID_TOKEN');
  }

  if (isMockMode()) {
    providerLog('disconnectSession', { mode: 'mock', sessionId: maskSessionId(id), result: 'close_ok' });
    return;
  }

  providerLog('disconnectSession', { mode: 'wppconnect', sessionId: maskSessionId(id), action: 'close-session' });

  try {
    await wppRequest(
      id,
      `/api/${encodeURIComponent(id)}/close-session`,
      token,
      { method: 'POST', body: '{}' },
      { timeoutMs: 8_000 },
    );
  } catch (error) {
    const mapped = mapFetchError(error);
    const msg = mapped.message.toLowerCase();
    const alreadyClosed =
      mapped.code === 'SESSION_NOT_FOUND' ||
      mapped.code === 'TIMEOUT' ||
      msg.includes('not found') ||
      msg.includes('already') ||
      msg.includes('closed') ||
      msg.includes('not a function') ||
      msg.includes('tempo esgotado');
    if (alreadyClosed) return;
    throw mapped;
  }
}

/**
 * Apaga userDataDir/tokens da sessão no WPP (requer SECRET_KEY).
 * Complementa logout — sem isso o aparelho pode continuar “conectado a dispositivos”.
 */
async function clearSessionDataOnServer(sessionId: string): Promise<boolean> {
  const id = sessionId?.trim();
  if (!id || isMockMode()) return false;

  try {
    const { baseUrl, secretKey } = getWppServerConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      const res = await fetch(
        `${baseUrl}/api/${encodeURIComponent(id)}/${encodeURIComponent(secretKey)}/clear-session-data`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: '{}',
        },
      );
      if (!res.ok) {
        console.warn('[whatsapp.provider] clear-session-data HTTP', res.status);
        return false;
      }
      return true;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn('[whatsapp.provider] clear-session-data:', error);
    return false;
  }
}

function clearPhoneCache(sessionId: string): void {
  phoneCacheBySession.delete(sessionId);
}

export type WhatsappDisconnectResult = {
  loggedOut: boolean;
  closed: boolean;
  clearedData: boolean;
};

/** Encerra sessão antiga. Se o client já morreu (CLOSED), logout falha — seguimos para start. */
export async function resetSessionForFreshQr(sessionId: string, accessToken: string): Promise<void> {
  const id = sessionId?.trim();
  if (!id) return;
  const token = accessToken?.trim();
  if (!token && !isMockMode()) return;

  providerLog('startSession', {
    sessionId: maskSessionId(id),
    result: 'reset_for_fresh_qr',
  });

  // Logout primeiro (desvincula o celular). Close sozinho NÃO tira o aparelho dos dispositivos.
  try {
    await wppRequest(
      id,
      `/api/${encodeURIComponent(id)}/logout-session`,
      token,
      { method: 'POST', body: '{}' },
      { timeoutMs: 12_000 },
    );
    await sleep(2_000);
  } catch (error) {
    console.warn('[whatsapp.provider] reset logout:', error);
  }

  try {
    await wppRequest(
      id,
      `/api/${encodeURIComponent(id)}/close-session`,
      token,
      { method: 'POST', body: '{}' },
      { timeoutMs: 4_000 },
    );
  } catch (error) {
    console.warn('[whatsapp.provider] reset close:', error);
  }

  await clearSessionDataOnServer(id);
  clearPhoneCache(id);
  await sleep(400);
}

export async function getSessionStatus(
  sessionId: string,
  accessToken: string,
): Promise<WhatsappProviderStatusResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');
  const token = accessToken?.trim();
  if (!token && !isMockMode()) {
    throw new WhatsappProviderError('accessToken é obrigatório.', 'INVALID_TOKEN');
  }

  if (isMockMode()) {
    providerLog('getSessionStatus', { mode: 'mock', sessionId: maskSessionId(id), result: 'qr_pending' });
    return { status: 'qr_pending' };
  }

  providerLog('getSessionStatus', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  try {
    const parsed = await fetchSessionStatusPayload(id, token);

    if (parsed.status === 'connected') {
      const fullyConnected = await isProviderSessionFullyConnected(id, token);
      if (!fullyConnected) {
        providerLog('getSessionStatus', {
          sessionId: maskSessionId(id),
          result: 'error',
          reason: 'status_connected_but_check_failed',
        });
        return {
          status: 'error',
          errorMessage:
            'Pareamento incompleto: o WhatsApp ficou em “sincronizando” no celular. Remova o dispositivo em Aparelhos conectados, Desconecte na Oftware e Conecte de novo com o app aberto.',
        };
      }

      let phone = parsed.phone;
      let profileName = parsed.profileName;
      if (!phone) {
        const host = await fetchConnectedPhone(id, token);
        phone = host.phone;
        profileName = profileName ?? host.profileName;
      }
      // Sempre normaliza 9º dígito BR para exibição/comparação.
      phone = phone ? normalizePhone(phone) ?? phone : undefined;

      providerLog('getSessionStatus', {
        sessionId: maskSessionId(id),
        result: 'connected',
        hasQrCode: false,
        hasPhone: Boolean(phone),
        phoneMasked: phone ? maskPhone(phone) : undefined,
        hasProfileName: Boolean(profileName),
      });
      return { status: 'connected', phone, profileName };
    }

    if (parsed.status === 'qr_pending' && !parsed.qrCode) {
      const qr = await resolveQrImage(id, token, parsed);
      if (qr) {
        providerLog('getSessionStatus', {
          sessionId: maskSessionId(id),
          result: 'qr_pending',
          hasQrCode: true,
          qrCodeLength: qr.length,
        });
        return { status: 'qr_pending', qrCode: qr };
      }
    }

    providerLog('getSessionStatus', {
      sessionId: maskSessionId(id),
      result: parsed.status,
      hasQrCode: Boolean(parsed.qrCode),
      hasUrlcode: Boolean(parsed.urlcode),
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

    if (mapped.code === 'AUTH_ERROR') {
      throw mapped;
    }

    providerLog('getSessionStatus', {
      sessionId: maskSessionId(id),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });

    return { status: 'error', errorMessage: mapped.message };
  }
}

export async function disconnectSession(
  sessionId: string,
  accessToken: string,
): Promise<WhatsappDisconnectResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');
  const token = accessToken?.trim();
  if (!token && !isMockMode()) {
    throw new WhatsappProviderError('accessToken é obrigatório.', 'INVALID_TOKEN');
  }

  if (isMockMode()) {
    providerLog('disconnectSession', { mode: 'mock', sessionId: maskSessionId(id), result: 'ok' });
    return { loggedOut: true, closed: true, clearedData: true };
  }

  providerLog('disconnectSession', { mode: 'wppconnect', sessionId: maskSessionId(id) });

  let loggedOut = false;
  let closed = false;

  // 1) logout-session = desvincula no celular (Dispositivos conectados).
  //    close-session sozinho NÃO remove o aparelho — só fecha o Chromium.
  try {
    await wppRequest(
      id,
      `/api/${encodeURIComponent(id)}/logout-session`,
      token,
      { method: 'POST', body: '{}' },
      { timeoutMs: 30_000 },
    );
    loggedOut = true;
    // WPP apaga userDataDir ~500ms após responder — espera a limpeza.
    await sleep(2_000);
    providerLog('disconnectSession', { sessionId: maskSessionId(id), result: 'logout_ok' });
  } catch (error) {
    const mapped = mapFetchError(error);
    const msg = mapped.message.toLowerCase();
    // Só trata como “já saiu” em casos inequívocos — NÃO usar includes('logout')
    // (mensagens tipo "Error on logout" / "Error closing session" engoliam a falha).
    const alreadyGone =
      mapped.code === 'SESSION_NOT_FOUND' ||
      msg.includes('not found') ||
      msg.includes('already logged') ||
      msg.includes('already closed') ||
      msg.includes('session is not active') ||
      msg.includes('não está ativa') ||
      msg.includes('disconnected');

    providerLog('disconnectSession', {
      sessionId: maskSessionId(id),
      result: alreadyGone ? 'logout_already_gone' : 'logout_failed',
      code: mapped.code,
      errorMessage: mapped.message,
    });

    if (alreadyGone) {
      loggedOut = true;
    }
  }

  // 2) close — fecha browser se ainda existir
  try {
    await closeSession(id, token);
    closed = true;
  } catch (error) {
    console.warn('[whatsapp.provider] disconnect close:', error);
  }

  // 3) clear-session-data — remove tokens órfãos no disco da VM
  const clearedData = await clearSessionDataOnServer(id);
  clearPhoneCache(id);

  providerLog('disconnectSession', {
    sessionId: maskSessionId(id),
    result: loggedOut ? 'ok' : 'partial',
    loggedOut,
    closed,
    clearedData,
  });

  return { loggedOut, closed, clearedData };
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

function wrapPhoneResolution<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof InternationalPhoneError) {
      throw new WhatsappProviderError(error.message, 'INVALID_PHONE');
    }
    throw error;
  }
}

/**
 * Normaliza telefone cru/legado para o formato WPPConnect (apenas dígitos, com DDI).
 * 10/11 dígitos sem 55 → Brasil. Número já resolvido: `sendTestMessage(..., { phoneIsResolved: true })`.
 */
export function normalizeWhatsappPhone(raw: string): string {
  return wrapPhoneResolution(() => resolveInternationalPhone({ telefone: raw }));
}

async function assertWhatsappSessionReady(sessionId: string, accessToken: string): Promise<void> {
  const payload = await wppRequest(
    sessionId,
    `/api/${encodeURIComponent(sessionId)}/check-connection-session`,
    accessToken,
    { method: 'GET' },
  );

  const status = payload.status;
  const connected = status === true || status === 'true' || normalizeStatusToken(status) === 'true';
  if (!connected) {
    throw new WhatsappProviderError(
      'Sessão WhatsApp indisponível para envio. Clique em Conectar e gere um novo QR Code.',
      'SESSION_NOT_READY',
    );
  }
}

export type WhatsappSessionRecheckResult = {
  healthy: boolean;
  rawStatus?: string;
  errorCode?: string;
};

/**
 * GET /check-connection-session — uma leitura, sem gravar Firestore.
 * 404/500/WAPI contam como unhealthy (o caller decide strikes).
 */
export async function recheckProviderSessionHealth(
  sessionId: string,
  accessToken: string,
): Promise<WhatsappSessionRecheckResult> {
  try {
    const payload = await wppRequest(
      sessionId,
      `/api/${encodeURIComponent(sessionId)}/check-connection-session`,
      accessToken,
      { method: 'GET' },
      { timeoutMs: 8_000 },
    );
    const status = payload.status;
    const healthy =
      status === true || status === 'true' || normalizeStatusToken(status) === 'true';
    const message = pickString(payload, ['message']) ?? '';
    const rawStatus = healthy
      ? 'CONNECTED'
      : String(message || status || 'not_connected').slice(0, 64);
    return { healthy, rawStatus };
  } catch (error) {
    const mapped = mapFetchError(error);
    return {
      healthy: false,
      errorCode: mapped.code,
      rawStatus: mapped.code,
    };
  }
}

/** check-connection-session: true só quando o WA Web está de fato ativo (não só “isLogged”). */
async function isProviderSessionFullyConnected(
  sessionId: string,
  accessToken: string,
): Promise<boolean> {
  const recheck = await recheckProviderSessionHealth(sessionId, accessToken);
  return recheck.healthy;
}

/**
 * Confirma que o número existe no WhatsApp e devolve o id serializado (@c.us / @lid).
 */
async function resolveWhatsappChatId(
  sessionId: string,
  accessToken: string,
  phoneDigits: string,
  sendTraceId?: string,
  sendWhenNumberCheckUnconfirmed?: boolean,
): Promise<string> {
  const candidate = `${phoneDigits}@c.us`;

  const logResolved = (resolvedChatId: string) => {
    if (!sendTraceId) return;
    sendTestMessageTrace({
      event: 'chat_resolved',
      sendTraceId,
      normalizedPhone: phoneDigits,
      resolvedChatId,
      resolvedType: resolvedChatTypeOf(resolvedChatId),
    });
  };

  // Preferir mapeamento PN↔LID (WPP 2.x) — check-number sozinho às vezes devolve LID “frio”.
  let pnHttpStatus: number | undefined;
  try {
    const pnLidPayload = await wppRequest(
      sessionId,
      `/api/${encodeURIComponent(sessionId)}/contact/pn-lid/${encodeURIComponent(candidate)}`,
      accessToken,
      { method: 'GET' },
      {
        timeoutMs: 20_000,
        onHttp: (httpStatus) => {
          pnHttpStatus = httpStatus;
        },
      },
    );
    const flat = flattenWppPayload(pnLidPayload);
    const lid =
      pickString(flat, ['_serialized', 'lid', 'id']) ||
      pickString(asRecord(flat.lid), ['_serialized', 'id', 'user']) ||
      pickString(asRecord(flat.id), ['_serialized']);
    if (sendTraceId) {
      sendTestMessageTrace({
        event: 'pn_lid_result',
        sendTraceId,
        candidate,
        httpStatus: pnHttpStatus,
        rawShape: summarizePnLidShape(flat),
        extractedLid: lid,
      });
    }
    if (lid?.includes('@lid')) {
      logResolved(lid);
      return lid;
    }
    if (lid && !lid.includes('@')) {
      const asLid = `${lid}@lid`;
      logResolved(asLid);
      return asLid;
    }
  } catch (error) {
    if (sendTraceId) {
      sendTestMessageTrace({
        event: 'pn_lid_result',
        sendTraceId,
        candidate,
        httpStatus: pnHttpStatus,
        rawShape: {},
        extractedLid: undefined,
        errorCode: error instanceof WhatsappProviderError ? error.code : undefined,
      });
    }
    console.warn('[whatsapp.provider] contact/pn-lid:', error);
  }

  let statusHttpStatus: number | undefined;
  try {
    const payload = await wppRequest(
      sessionId,
      `/api/${encodeURIComponent(sessionId)}/check-number-status/${encodeURIComponent(candidate)}`,
      accessToken,
      { method: 'GET' },
      {
        timeoutMs: 20_000,
        onHttp: (httpStatus) => {
          statusHttpStatus = httpStatus;
        },
      },
    );

    const flat = flattenWppPayload(payload);
    const responseObj = asRecord(flat.response);
    const profile = Object.keys(responseObj).length > 0 ? responseObj : flat;
    const profileId = asRecord(profile.id);

    if (profile.numberExists === false) {
      if (sendTraceId) {
        sendTestMessageTrace({
          event: 'number_status_result',
          sendTraceId,
          candidate,
          httpStatus: statusHttpStatus,
          chatId: sendWhenNumberCheckUnconfirmed ? candidate : undefined,
        });
      }
      if (sendWhenNumberCheckUnconfirmed) {
        logResolved(candidate);
        return candidate;
      }
      throw new WhatsappProviderError(
        `O número informado não está disponível no WhatsApp. Confira o país e o número informado.`,
        'INVALID_PHONE',
      );
    }

    const chatId =
      pickString(profileId, ['_serialized']) ||
      pickString(profile, ['_serialized', 'id', 'wid']) ||
      (typeof profile.id === 'string' ? profile.id : undefined);

    const resolved = chatId?.includes('@') ? chatId : candidate;
    if (sendTraceId) {
      sendTestMessageTrace({
        event: 'number_status_result',
        sendTraceId,
        candidate,
        httpStatus: statusHttpStatus,
        chatId: resolved,
      });
    }
    logResolved(resolved);
    if (chatId?.includes('@')) return chatId;
    return candidate;
  } catch (error) {
    if (error instanceof WhatsappProviderError) {
      if (sendTraceId && error.code !== 'INVALID_PHONE') {
        sendTestMessageTrace({
          event: 'number_status_result',
          sendTraceId,
          candidate,
          httpStatus: statusHttpStatus,
          chatId: undefined,
          errorCode: error.code,
        });
      }
      throw error;
    }
    if (sendTraceId) {
      sendTestMessageTrace({
        event: 'number_status_result',
        sendTraceId,
        candidate,
        httpStatus: statusHttpStatus,
        chatId: candidate,
        errorCode: error instanceof Error ? error.name : undefined,
      });
      logResolved(candidate);
    }
    console.warn('[whatsapp.provider] check-number-status:', error);
    return candidate;
  }
}

async function postSendMessage(
  sessionId: string,
  accessToken: string,
  body: Record<string, unknown>,
  onHttp?: (httpStatus: number, ok: boolean) => void,
): Promise<Record<string, unknown>> {
  return wppRequest(
    sessionId,
    `/api/${encodeURIComponent(sessionId)}/send-message`,
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
    },
    { timeoutMs: Math.max(getTimeoutMs(), 45_000), flatten: false, onHttp },
  );
}

function assertSendMessageSuccess(payload: Record<string, unknown>): {
  ack?: number;
  messageId?: string;
} {
  // Usar o body bruto do controller: { status: 'success', response: [...] }.
  // Não fazer flatten aqui — response[0].status poderia sobrescrever o status do envio.
  const statusRaw = String(payload.status ?? '');
  const status = normalizeStatusToken(statusRaw);
  const message = pickString(payload, ['message', 'error', 'errorMessage']) ?? '';
  const messageLower = message.toLowerCase();

  // Sucesso real do controller WPP: { status: 'success', response: [...] }
  if (status !== 'success') {
    throw new WhatsappProviderError(
      message || `Envio rejeitado pelo WhatsApp (status=${statusRaw || 'desconhecido'}).`,
      'SEND_REJECTED',
    );
  }

  if (
    messageLower.includes('não existe') ||
    messageLower.includes('not exist') ||
    messageLower.includes('error sending') ||
    messageLower.includes('invalid wid') ||
    messageLower.includes('not found')
  ) {
    throw new WhatsappProviderError(message || 'O WhatsApp rejeitou o envio.', 'SEND_REJECTED');
  }

  const response = payload.response;
  const results = Array.isArray(response) ? response : response ? [response] : [];
  if (results.length === 0) {
    throw new WhatsappProviderError(
      'Envio sem confirmação do WhatsApp (resposta vazia).',
      'SEND_REJECTED',
    );
  }

  const first = asRecord(results[0]);
  if (first.erro === true || first.error === true || first.isSendFailure === true) {
    throw new WhatsappProviderError(
      pickString(first, ['message', 'error', 'errorMessage']) ||
        'WhatsApp registrou a mensagem como falha de envio (isSendFailure). Se o celular já está Ativo, costuma ser problema de LID/contato — tente de novo em alguns segundos ou use outro número de teste.',
      'SEND_REJECTED',
    );
  }

  const ack = typeof first.ack === 'number' ? first.ack : undefined;
  const messageId =
    pickString(first, ['id', 'messageId']) ||
    pickString(asRecord(first.id), ['_serialized', 'id']);

  // ack -1 = erro; 0 = só enfileirou local; >=1 = aceito pelo servidor WA
  if (ack === -1) {
    throw new WhatsappProviderError(
      'WhatsApp recusou a mensagem (ack=-1). Verifique o número e a sessão.',
      'SEND_REJECTED',
    );
  }

  if (!messageId) {
    throw new WhatsappProviderError(
      'Envio sem ID de mensagem do WhatsApp — não confirmei entrega.',
      'SEND_REJECTED',
    );
  }

  // Sem ack>=1 a API às vezes “aceita” LID fantasma sem a mensagem sair.
  if (ack === undefined || ack < 1) {
    throw new WhatsappProviderError(
      `Envio sem confirmação do servidor WhatsApp (ack=${ack ?? 'ausente'}). Se o celular ainda mostra “Mantenha o app aberto…”, a sessão não está ativa de verdade.`,
      'SEND_REJECTED',
    );
  }

  return { ack, messageId };
}

export interface WhatsappSendTestMessageResult {
  phone: string;
  chatId?: string;
  mock: boolean;
  /**
   * WPPConnect às vezes responde erro/timeout depois de já ter enfileirado a mensagem
   * (bem comum ao enviar para o próprio número conectado).
   */
  deliveryUncertain?: boolean;
  selfSend?: boolean;
}

/**
 * Falhas anteriores à entrega — nunca mascarar como "enviada".
 * Checar antes das regras ambíguas (ex.: "Error sending" + findChat).
 */
function isHardPostSendFailureMessage(message: string): boolean {
  const raw = message.toLowerCase();
  return (
    raw.includes('findchat') ||
    raw.includes('new chat not found') ||
    raw.includes('invalid wid') ||
    raw.includes('invalid contact') ||
    raw.includes('contact not found') ||
    raw.includes('failed to resolve') ||
    raw.includes('not found') ||
    raw.includes('disconnected') ||
    raw.includes('not connected') ||
    raw.includes('session is not active')
  );
}

/**
 * Erro pós-POST que pode significar "já enfileirou / ack lento", não falha de destino.
 * SERVER_ERROR genérico NÃO entra — HTTP 500 de findChat/sendText é falha dura.
 */
export function isAmbiguousPostSendError(error: WhatsappProviderError): boolean {
  const msg = error.message.toLowerCase();
  if (isHardPostSendFailureMessage(msg)) return false;

  if (error.code === 'TIMEOUT') return true;

  return (
    msg.includes('getmessagebyid') ||
    msg.includes('oftware_send_unconfirmed') ||
    msg.includes('msgchunks') ||
    msg.includes('evaluation failed') ||
    msg.includes('protocol error') ||
    msg.includes('cannot read properties') ||
    msg.includes('error sending') ||
    msg.includes('failed to send') ||
    msg.includes('tempo esgotado')
  );
}

export type WhatsappSendMessageOptions = {
  connectedPhone?: string;
  allowSelfSend?: boolean;
  /**
   * true = `phone` já é E.164 canônico (fila / resolveInternationalPhone).
   * Não reaplica a heurística 10/11 = Brasil.
   * omitido/false = telefone cru/legado (strings BR sem DDI).
   * A tela TESTE DE ENVIO resolve no servidor e envia `true`.
   */
  phoneIsResolved?: boolean;
  /**
   * A consulta check-number-status às vezes responde numberExists=false para número que existe.
   * Com true, o envio segue para o WhatsApp em vez de abortar nessa consulta.
   */
  sendWhenNumberCheckUnconfirmed?: boolean;
  /** Não consulta pn-lid nem check-number-status. O envio sai direto; a recusa vem do próprio disparo. */
  skipNumberLookup?: boolean;
  /**
   * LID do destinatário obtido por outra sessão (o LID é o mesmo para todas as contas).
   * Usado quando esta sessão só resolve `@c.us` para um contato “frio” e o envio por PN falha.
   */
  lidHint?: string;
};

/** Só consulta: devolve `<id>@lid` se a sessão conhece o LID do número, senão null. */
export async function lookupWhatsappLid(
  sessionId: string,
  accessToken: string,
  phoneDigits: string,
): Promise<string | null> {
  const chatId = await resolveWhatsappChatId(sessionId, accessToken, phoneDigits, undefined, true);
  return /@lid$/i.test(chatId) ? chatId : null;
}

export async function sendTestMessage(
  sessionId: string,
  accessToken: string,
  phone: string,
  message: string,
  options?: WhatsappSendMessageOptions,
): Promise<WhatsappSendTestMessageResult> {
  const id = sessionId?.trim();
  if (!id) throw new WhatsappProviderError('sessionId é obrigatório.', 'INVALID_SESSION');

  const token = accessToken?.trim();
  if (!token && !isMockMode()) {
    throw new WhatsappProviderError('accessToken é obrigatório.', 'INVALID_TOKEN');
  }

  const sendTraceId = newSendTraceId();
  const normalizedPhone = wrapPhoneResolution(() =>
    resolvePhoneForWhatsappSend(phone, options?.phoneIsResolved === true),
  );
  sendTestMessageTrace({
    event: 'normalized_phone',
    sendTraceId,
    sessionId: id,
    normalizedPhone,
  });
  const text = message?.trim();
  if (!text) {
    throw new WhatsappProviderError('A mensagem não pode estar vazia.', 'INVALID_MESSAGE');
  }
  if (text.length > 1024) {
    throw new WhatsappProviderError('A mensagem de teste pode ter no máximo 1024 caracteres.', 'INVALID_MESSAGE');
  }

  const connectedPhone = options?.connectedPhone?.trim();
  const isSelfDestination = Boolean(
    connectedPhone && phonesLikelyMatch(normalizedPhone, connectedPhone),
  );

  if (!options?.allowSelfSend && isSelfDestination) {
    throw new WhatsappProviderError(
      'Não é possível enviar teste para o mesmo número conectado. Use outro WhatsApp de destino.',
      'SELF_SEND_NOT_ALLOWED',
    );
  }

  if (isMockMode()) {
    providerLog('sendTestMessage', {
      mode: 'mock',
      sessionId: maskSessionId(id),
      phoneMasked: maskPhone(normalizedPhone),
      messageLength: text.length,
      result: 'ok',
    });
    return { phone: normalizedPhone, mock: true, selfSend: isSelfDestination };
  }

  providerLog('sendTestMessage', {
    mode: 'wppconnect',
    sessionId: maskSessionId(id),
    phoneMasked: maskPhone(normalizedPhone),
    messageLength: text.length,
    selfDestination: isSelfDestination,
  });

  /** true depois do 1º POST send-message — timeout daí em diante NÃO derruba a sessão. */
  let sendAttempted = false;
  let sendHttpStatus: number | undefined;

  try {
    await assertWhatsappSessionReady(id, token);
    const lookedUpChatId = options?.skipNumberLookup
      ? `${normalizedPhone}@c.us`
      : await resolveWhatsappChatId(
          id,
          token,
          normalizedPhone,
          sendTraceId,
          options?.sendWhenNumberCheckUnconfirmed === true,
        );
    const lidHintDigits = options?.lidHint?.trim().replace(/@lid$/i, '');
    const chatId =
      lidHintDigits && !/@lid$/i.test(lookedUpChatId) ? `${lidHintDigits}@lid` : lookedUpChatId;
    const isLid = /@lid$/i.test(chatId);
    const phoneForSend = chatId.includes('@') ? chatId.split('@')[0]! : normalizedPhone;

    // 1ª tentativa: id resolvido (LID ou PN) + createChat.
    // Contatos “frios” no WhatsApp atual falham sem isso (isSendFailure + ack 0).
    sendTestMessageTrace({
      event: 'send_request',
      sendTraceId,
      sessionId: id,
      resolvedChatId: chatId,
      phoneForSend,
      isLid,
      createChat: true,
      waitForAck: true,
    });
    sendAttempted = true;
    let payload = await postSendMessage(
      id,
      token,
      {
        phone: phoneForSend,
        isGroup: false,
        isNewsletter: false,
        isLid,
        message: text,
        options: { createChat: true, waitForAck: true },
      },
      (httpStatus) => {
        sendHttpStatus = httpStatus;
      },
    );
    sendTestMessageTrace({
      event: 'send_response',
      sendTraceId,
      httpStatus: sendHttpStatus,
      ...peekSendResponseForLog(payload),
    });

    try {
      const confirmation = assertSendMessageSuccess(payload);
      providerLog('sendTestMessage', {
        sessionId: maskSessionId(id),
        phoneMasked: maskPhone(normalizedPhone),
        resolvedChatSuffix: chatId.includes('@') ? chatId.split('@')[1] : undefined,
        usedLid: isLid,
        ack: confirmation.ack,
        hasMessageId: Boolean(confirmation.messageId),
        result: 'ok',
        selfDestination: isSelfDestination,
      });
      return {
        phone: normalizedPhone,
        chatId,
        mock: false,
        selfSend: isSelfDestination,
      };
    } catch (firstError) {
      // Retry uma vez no formato alternativo (LID ↔ E.164) — comum no WA atual.
      const altIsLid = !isLid;
      const altPhone = altIsLid && chatId.includes('@lid')
        ? chatId.split('@')[0]!
        : normalizedPhone;
      providerLog('sendTestMessage', {
        sessionId: maskSessionId(id),
        phoneMasked: maskPhone(normalizedPhone),
        result: 'retry_alt_format',
        usedLid: altIsLid,
        errorMessage: firstError instanceof Error ? firstError.message : String(firstError),
      });

      sendTestMessageTrace({
        event: 'send_request',
        sendTraceId,
        sessionId: id,
        resolvedChatId: chatId,
        phoneForSend: altPhone,
        isLid: altIsLid,
        createChat: true,
        waitForAck: true,
      });
      payload = await postSendMessage(
        id,
        token,
        {
          phone: altPhone,
          isGroup: false,
          isNewsletter: false,
          isLid: altIsLid,
          message: text,
          options: { createChat: true, waitForAck: true },
        },
        (httpStatus) => {
          sendHttpStatus = httpStatus;
        },
      );
      sendTestMessageTrace({
        event: 'send_response',
        sendTraceId,
        httpStatus: sendHttpStatus,
        ...peekSendResponseForLog(payload),
      });

      const confirmation = assertSendMessageSuccess(payload);
      providerLog('sendTestMessage', {
        sessionId: maskSessionId(id),
        phoneMasked: maskPhone(normalizedPhone),
        resolvedChatSuffix: chatId.includes('@') ? chatId.split('@')[1] : undefined,
        usedLid: altIsLid,
        ack: confirmation.ack,
        hasMessageId: Boolean(confirmation.messageId),
        result: 'ok_retry',
        selfDestination: isSelfDestination,
      });
      return {
        phone: normalizedPhone,
        chatId,
        mock: false,
        selfSend: isSelfDestination,
      };
    }
  } catch (error) {
    const mapped = mapFetchError(error);
    if (sendAttempted && sendHttpStatus !== undefined && sendHttpStatus >= 400) {
      sendTestMessageTrace({
        event: 'send_http_error',
        sendTraceId,
        httpStatus: sendHttpStatus,
        errorCode: mapped.code,
        providerMessage: mapped.message,
      });
    }
    // Depois do POST send-message, só TIMEOUT / crash de serialização (getMessageById)
    // são ambíguos. HTTP 500 genérico e findChat são falha dura.
    const treatAsDelivered =
      sendAttempted && isAmbiguousPostSendError(mapped);

    if (treatAsDelivered) {
      sendTestMessageTrace({
        event: 'delivery_marked_uncertain',
        sendTraceId,
        originalErrorCode: mapped.code,
        originalMessage: mapped.message,
      });
      providerLog('sendTestMessage', {
        sessionId: maskSessionId(id),
        phoneMasked: maskPhone(normalizedPhone),
        result: 'ok_ambiguous',
        code: mapped.code,
        errorMessage: mapped.message,
        selfDestination: isSelfDestination,
        sendAttempted,
      });
      return {
        phone: normalizedPhone,
        mock: false,
        deliveryUncertain: true,
        selfSend: isSelfDestination,
      };
    }

    providerLog('sendTestMessage', {
      sessionId: maskSessionId(id),
      phoneMasked: maskPhone(normalizedPhone),
      result: 'failed',
      code: mapped.code,
      errorMessage: mapped.message,
      sendAttempted,
    });
    throw mapped;
  }
}
