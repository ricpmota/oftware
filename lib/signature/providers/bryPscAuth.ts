import {
  fetchBryApplicationAccessToken,
  type BryKmsData,
  type BryUserToken,
} from '@/lib/signature/providers/bryCloudApi';
import {
  getBryCloudEnvConfig,
  joinBryApiPath,
  type BryCloudEnvConfig,
} from '@/lib/signature/providers/bryCloudEnv';

const INTEGRA_KEY_HINT =
  /api[_-]?key|integra|credential|credencial|context|chave|identificador|authorization/i;

const SKIP_QUERY_KEYS = new Set(['state', 'menu', 'bry_cloud', 'bry_message', 'error', 'error_description']);

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function looksLikeIntegraCredential(value: string): boolean {
  const v = value.trim();
  if (v.length < 8 || v.length > 512) return false;
  if (v.includes(' ')) return false;
  return true;
}

function deepCollectIntegraKeys(node: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 10 || node == null) return out;

  if (typeof node === 'string') {
    if (looksLikeIntegraCredential(node)) out.push(node.trim());
    return out;
  }

  if (Array.isArray(node)) {
    for (const item of node) deepCollectIntegraKeys(item, depth + 1, out);
    return out;
  }

  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if (typeof value === 'string' && INTEGRA_KEY_HINT.test(key) && looksLikeIntegraCredential(value)) {
        out.push(value.trim());
      }
      deepCollectIntegraKeys(value, depth + 1, out);
    }
  }

  return out;
}

/** Apenas campos explícitos de apiKey do `POST /psc/link` (não mistura com `token` de assinatura). */
export function pickStrictIntegraApiKeyFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const direct = pickString(o, [
    'apiKey',
    'api_key',
    'xApiKey',
    'x-api-key',
    'integraApiKey',
    'integra_api_key',
  ]);
  if (direct) return direct;
  if (typeof o.data === 'object' && o.data) {
    return pickStrictIntegraApiKeyFromPayload(o.data);
  }
  return undefined;
}

/** Token de assinatura do `POST /psc/link` (HUB `kms_data.token` — não confundir com apiKey de sessão). */
export function pickPscLinkSigningTokenFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const direct = pickString(o, ['token', 'signingToken', 'integraToken', 'integra_token']);
  if (direct) return direct;
  if (typeof o.data === 'object' && o.data) {
    return pickPscLinkSigningTokenFromPayload(o.data);
  }
  return undefined;
}

export function pickAuthorizationContextIdFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const direct = pickString(o, [
    'authorizationContextId',
    'idContextoAutorizacao',
    'contextId',
    'authorization_context_id',
  ]);
  if (direct) return direct;
  if (typeof o.data === 'object' && o.data) {
    return pickAuthorizationContextIdFromPayload(o.data);
  }
  return undefined;
}

/** Credencial Integra retornada por `POST /psc/link` (usada em `GET /auth/info`). */
export function pickIntegraApiKeyFromPayload(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;

  const direct = pickString(o, [
    'apiKey',
    'api_key',
    'xApiKey',
    'x-api-key',
    'integraId',
    'integra_id',
    'integraApiKey',
    'credential',
    'credencial',
    'authorizationContextId',
    'idContextoAutorizacao',
    'contextId',
    'authorization_context_id',
    'identificador',
    'chave',
    'uuid',
  ]);
  if (direct) return direct;

  const fromDeep = deepCollectIntegraKeys(data);
  if (fromDeep[0]) return fromDeep[0];

  const genericId = pickString(o, ['id']);
  if (genericId && looksLikeIntegraCredential(genericId)) return genericId;

  if (typeof o.data === 'object' && o.data) {
    return pickIntegraApiKeyFromPayload(o.data);
  }

  return undefined;
}

/** Extrai credencial Integra embutida na URL do link PSC. */
export function pickIntegraApiKeyFromAuthorizationUrl(url?: string | null): string | undefined {
  if (!url?.trim()) return undefined;
  try {
    const parsed = new URL(url.trim());
    for (const key of [
      'apiKey',
      'api_key',
      'integraId',
      'integra_id',
      'integraApiKey',
      'credential',
      'credencial',
      'authorizationContextId',
      'contextId',
      'id',
      'key',
      'chave',
      'identificador',
      'x-api-key',
    ]) {
      const value = parsed.searchParams.get(key)?.trim();
      if (value && looksLikeIntegraCredential(value)) return value;
    }

  } catch {
    return undefined;
  }
  return undefined;
}

/**
 * Credencial retornada no redirect do PSC após autorização.
 * O parâmetro `code` aqui NÃO é OAuth — é a chave para `GET /auth/info` (X-API-KEY).
 */
export function pickPscRedirectCredentialFromSearchParams(
  searchParams: URLSearchParams
): string | undefined {
  const redirectCode = searchParams.get('code')?.trim();
  if (redirectCode && redirectCode.length >= 4) {
    return redirectCode;
  }
  return pickIntegraApiKeyFromSearchParams(searchParams);
}

/** Lê credencial Integra dos query params do redirect pós-PSC. */
export function pickIntegraApiKeyFromSearchParams(
  searchParams: URLSearchParams
): string | undefined {
  const fromCode = searchParams.get('code')?.trim();
  if (fromCode && looksLikeIntegraCredential(fromCode)) return fromCode;

  for (const key of [
    'apiKey',
    'api_key',
    'integraId',
    'integra_id',
    'integraApiKey',
    'x-api-key',
    'credential',
    'credencial',
    'authorizationContextId',
    'contextId',
    'identificador',
    'chave',
    'id',
  ]) {
    const value = searchParams.get(key)?.trim();
    if (value) return value;
  }

  for (const [key, value] of searchParams.entries()) {
    if (SKIP_QUERY_KEYS.has(key)) continue;
    if (INTEGRA_KEY_HINT.test(key) && value.trim()) return value.trim();
  }

  return undefined;
}

/**
 * Código OAuth legado (fluxo `/oauth2/authorize` — não usado no PSC `/psc/link`).
 * Não confundir com `code` do redirect PSC.
 */
export function pickOAuthCodeFromSearchParams(searchParams: URLSearchParams): string | undefined {
  for (const key of ['authorizationCode', 'authorization_code']) {
    const value = searchParams.get(key)?.trim();
    if (value) return value;
  }
  return undefined;
}

export function mapBryConnectErrorMessage(error: unknown): string {
  if (error instanceof BryPscAuthInfoError) {
    if (error.httpStatus === 400 || error.httpStatus === 404) {
      if (/invalid_grant/i.test(error.bryError || '')) {
        return (
          'A sessão PSC já foi utilizada ou expirou. Clique em Reconectar em Meu Perfil, autorize novamente no SafeID e escolha o certificado — em seguida gere a assinatura sem demora.'
        );
      }
      return (
        'Sessão PSC expirada ou credencial inválida na Integra BRy. Clique em Reconectar em Meu Perfil, autorize novamente no app do certificado (SafeID) e escolha o certificado.'
      );
    }
    if (error.bryError?.trim()) return error.bryError.trim();
  }

  const raw = error instanceof Error ? error.message : String(error);
  if (/invalid_grant/i.test(raw)) {
    return (
      'A Integra BRy ainda não liberou a credencial após o PSC. Confirme que você concluiu a autorização no app do certificado (escolha do certificado) e aguarde o retorno automático. ' +
      'Se persistir, verifique no portal BRy Cloud se o redirect URI cadastrado é exatamente https://www.oftware.com.br/api/signature/bry/callback e se o CPF pessoal do perfil corresponde ao certificado no PSC.'
    );
  }
  if (/sessão psc|credencial inválida|auth\/info/i.test(raw)) return raw;
  return raw;
}

export function buildIntegraApiKeyCandidates(params: {
  searchParams: URLSearchParams;
  integraApiKeyFromPending?: string | null;
  authorizationUrlFromPending?: string | null;
}): string[] {
  const seen = new Set<string>();
  const add = (value?: string | null) => {
    const v = value?.trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
  };

  add(pickPscRedirectCredentialFromSearchParams(params.searchParams));
  add(params.integraApiKeyFromPending);
  add(pickIntegraApiKeyFromAuthorizationUrl(params.authorizationUrlFromPending));

  for (const [key, value] of params.searchParams.entries()) {
    if (SKIP_QUERY_KEYS.has(key)) continue;
    if (INTEGRA_KEY_HINT.test(key)) add(value);
  }

  return [...seen];
}

/**
 * Credenciais para `GET /auth/info` no callback PSC.
 * Documentação BRy: a chave vem do `POST /psc/link`; o redirect costuma devolver só `state`.
 * Prioriza pending/url do link; `code` na query (quando existir) é tentativa adicional.
 */
export function buildIntegraApiKeyCandidatesForCallback(params: {
  searchParams: URLSearchParams;
  integraApiKeyFromPending?: string | null;
  authorizationContextIdFromPending?: string | null;
  authorizationUrlFromPending?: string | null;
}): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (value?: string | null) => {
    const v = value?.trim();
    if (!v || seen.has(v)) return;
    seen.add(v);
    ordered.push(v);
  };

  add(params.integraApiKeyFromPending);
  add(params.authorizationContextIdFromPending);
  add(pickIntegraApiKeyFromAuthorizationUrl(params.authorizationUrlFromPending));

  for (const key of buildIntegraApiKeyCandidates(params)) {
    add(key);
  }

  return ordered;
}

export class BryPscAuthInfoError extends Error {
  readonly httpStatus?: number;
  readonly bryError?: string;

  constructor(message: string, opts?: { httpStatus?: number; bryError?: string }) {
    super(message);
    this.name = 'BryPscAuthInfoError';
    this.httpStatus = opts?.httpStatus;
    this.bryError = opts?.bryError;
  }
}

export function maskIntegraCredentialHint(value?: string | null): string | undefined {
  const v = value?.trim();
  if (!v) return undefined;
  if (v.length <= 8) return `len:${v.length}`;
  return `${v.slice(0, 4)}…${v.slice(-4)} (len:${v.length})`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function looksLikeJwt(value: string): boolean {
  return /^eyJ[\w-]+\.[\w-]+\.[\w-]*$/i.test(value.trim());
}

const INVALID_INTEGRA_SESSION_KEY =
  /^(single_signature|multi_signature|signature_session|signature-session)$/i;

/** Credencial `X-API-KEY` válida (token do `POST /psc/link`, não escopo OAuth nem `code` de uso único). */
export function isValidIntegraSessionApiKey(value?: string | null): boolean {
  const v = value?.trim();
  if (!v || !looksLikeIntegraCredential(v)) return false;
  if (INVALID_INTEGRA_SESSION_KEY.test(v)) return false;
  if (looksLikeJwt(v)) return false;
  return true;
}

/**
 * Persiste o token estável do `/psc/link`, não o `code` do redirect (válido só na 1ª chamada a `/auth/info`).
 */
export function resolveIntegraSessionApiKeyForStorage(params: {
  pscLinkIntegraApiKey?: string | null;
  authInfoWinningKey?: string | null;
}): string | undefined {
  const fromLink = params.pscLinkIntegraApiKey?.trim();
  if (isValidIntegraSessionApiKey(fromLink)) return fromLink;

  const fromAuth = params.authInfoWinningKey?.trim();
  if (isValidIntegraSessionApiKey(fromAuth)) return fromAuth;

  return undefined;
}

/** Token hex de pré-autorização PSC/KMS (vai em `kms_data.token`, não no Bearer). */
export function looksLikeKmsHexToken(value: string): boolean {
  const v = value.trim();
  if (!v || looksLikeJwt(v)) return false;
  if (v.length < 8 || v.length > 512) return false;
  return /^[0-9a-fA-F]+$/.test(v);
}

/** Token de assinatura PSC (hex ou base64), distinto da chave Integra e do JWT. */
export function looksLikeKmsSigningSecret(value: string, sessionApiKey?: string): boolean {
  const v = value.trim();
  if (!v || v === sessionApiKey?.trim()) return false;
  if (looksLikeJwt(v)) return false;
  if (looksLikeKmsHexToken(v)) return true;
  if (v.length < 16 || v.length > 512) return false;
  if (v.includes(' ')) return false;
  return /^[A-Za-z0-9+/=_-]+$/.test(v);
}

function looksLikeBearerAccessToken(value: string, integraApiKey: string): boolean {
  const v = value.trim();
  if (!v || v === integraApiKey) return false;
  if (looksLikeKmsHexToken(v)) return false;
  return looksLikeJwt(v);
}

const ACCESS_TOKEN_KEY_HINT =
  /token|jwt|bearer|acesso|access/i;

const KMS_HEX_TOKEN_KEY_HINT =
  /token|kms|assinatura|autoriz|credencial|credential|chave|pre/i;

const UUID_CERT_KEY_HINT = /uuid|cert|certificado|certificate/i;

function deepCollectJwtTokens(node: unknown, depth = 0, out: string[] = []): string[] {
  if (depth > 12 || node == null) return out;

  if (typeof node === 'string') {
    const v = node.trim();
    if (looksLikeJwt(v)) out.push(v);
    return out;
  }

  if (Array.isArray(node)) {
    for (const item of node) deepCollectJwtTokens(item, depth + 1, out);
    return out;
  }

  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if (typeof value === 'string' && ACCESS_TOKEN_KEY_HINT.test(key)) {
        const v = value.trim();
        if (v.length >= 16 && !v.includes(' ') && looksLikeJwt(v)) out.push(v);
      }
      deepCollectJwtTokens(value, depth + 1, out);
    }
  }

  return out;
}

export function normalizeCpfDigits(value?: string | null): string | undefined {
  const digits = value?.replace(/\D/g, '') ?? '';
  return digits.length === 11 ? digits : undefined;
}

export function pickCpfFromAuthInfoPayload(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  const direct = pickString(o, [
    'cpf',
    'cpfCnpj',
    'cpfTitular',
    'cpf_titular',
    'document',
    'documento',
    'sub',
    'user_id',
    'userId',
    'usuario',
    'titular',
    'holderDocument',
  ]);
  if (direct) return direct;
  if (typeof o.data === 'object' && o.data) return pickCpfFromAuthInfoPayload(o.data);
  if (Array.isArray(o.entidades)) {
    for (const item of o.entidades) {
      const cpf = pickCpfFromAuthInfoPayload(item);
      if (cpf) return cpf;
    }
  }
  return undefined;
}

function hasTruthyAuthFlag(node: unknown, depth = 0): boolean {
  if (depth > 10 || node == null) return false;
  if (typeof node === 'object' && !Array.isArray(node)) {
    const o = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if (/autoriz|autentic|valid|conclu|success|liber/i.test(key) && value === true) {
        return true;
      }
      if (hasTruthyAuthFlag(value, depth + 1)) return true;
    }
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      if (hasTruthyAuthFlag(item, depth + 1)) return true;
    }
  }
  return false;
}

function hasCertificateHint(node: unknown, depth = 0): boolean {
  if (depth > 10 || node == null) return false;
  if (typeof node === 'object' && !Array.isArray(node)) {
    const o = node as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if (/certific|titular|holder|psc|nuvem|cloud/i.test(key) && value != null && value !== '') {
        return true;
      }
      if (hasCertificateHint(value, depth + 1)) return true;
    }
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      if (hasCertificateHint(item, depth + 1)) return true;
    }
  }
  return false;
}

function responseMatchesSessionApiKey(
  json: Record<string, unknown>,
  sessionApiKey: string
): boolean {
  const candidates = [
    pickStrictIntegraApiKeyFromPayload(json),
    pickIntegraApiKeyFromPayload(json),
    pickString(json, ['apiKey', 'api_key', 'x-api-key', 'integraApiKey']),
  ].filter(Boolean);
  return candidates.some((k) => k === sessionApiKey);
}

/** Indica que o PSC concluiu a autorização (corpo do `/auth/info` 200). */
export function isBryPscAuthInfoAuthorized(
  json: Record<string, unknown>,
  sessionApiKey?: string
): boolean {
  const status = pickString(json, [
    'status',
    'situacao',
    'estado',
    'authorizationStatus',
    'authorization_status',
  ])?.toLowerCase();
  if (status) {
    if (/pend|aguard|wait|process/i.test(status)) return false;
    if (/autoriz|conclu|success|ok|valid|liber|ativ|complet/i.test(status)) return true;
  }
  if (pickCpfFromAuthInfoPayload(json)) return true;
  if (hasTruthyAuthFlag(json)) return true;
  if (hasCertificateHint(json)) return true;

  if (sessionApiKey && responseMatchesSessionApiKey(json, sessionApiKey)) {
    const err = pickString(json, ['error', 'error_description', 'message'])?.toLowerCase();
    if (err && /invalid|denied|negad|expir|revog/i.test(err)) return false;
    if (pickCpfFromAuthInfoPayload(json) || hasCertificateHint(json) || hasTruthyAuthFlag(json)) {
      return true;
    }
  }

  if (typeof json.data === 'object' && json.data) {
    return isBryPscAuthInfoAuthorized(json.data as Record<string, unknown>, sessionApiKey);
  }
  if (Array.isArray(json.entidades) && json.entidades.length > 0) {
    const first = json.entidades[0];
    if (first && typeof first === 'object') {
      return isBryPscAuthInfoAuthorized(first as Record<string, unknown>, sessionApiKey);
    }
  }
  return false;
}

export function listAuthInfoResponseKeys(json: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(json)) {
    const path = prefix ? `${prefix}.${key}` : key;
    keys.push(path);
    const value = json[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && keys.length < 24) {
      keys.push(...listAuthInfoResponseKeys(value as Record<string, unknown>, path));
    }
  }
  return keys.slice(0, 32);
}

function pickAccessTokenFromAuthInfoPayload(
  data: unknown,
  integraApiKey: string
): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;

  const direct = pickString(o, [
    'access_token',
    'accessToken',
    'bearerToken',
    'jwt',
    'tokenAcesso',
    'token_acesso',
    'tokenDeAcesso',
    'pscAccessToken',
    'accessTokenPSC',
    'jwtToken',
    'valorToken',
    'token_psc',
    'tokenPsc',
  ]);
  if (direct && looksLikeBearerAccessToken(direct, integraApiKey)) return direct;

  const jwt = deepCollectJwtTokens(o).find((t) => t !== integraApiKey);
  if (jwt) return jwt;

  if (Array.isArray(o.entidades)) {
    for (const item of o.entidades) {
      const nested = pickAccessTokenFromAuthInfoPayload(item, integraApiKey);
      if (nested) return nested;
    }
  }
  if (typeof o.data === 'object' && o.data) {
    return pickAccessTokenFromAuthInfoPayload(o.data, integraApiKey);
  }
  if (typeof o.credencial === 'object' && o.credencial) {
    return pickAccessTokenFromAuthInfoPayload(o.credencial, integraApiKey);
  }
  return undefined;
}

function pickKmsSigningTokenFromAuthInfoNode(
  data: unknown,
  sessionApiKey: string,
  depth = 0
): string | undefined {
  if (depth > 12 || data == null) return undefined;

  if (typeof data === 'string') {
    return looksLikeKmsSigningSecret(data, sessionApiKey) ? data.trim() : undefined;
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = pickKmsSigningTokenFromAuthInfoNode(item, sessionApiKey, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof data === 'object') {
    const o = data as Record<string, unknown>;
    for (const [key, value] of Object.entries(o)) {
      if (typeof value === 'string' && KMS_HEX_TOKEN_KEY_HINT.test(key)) {
        const v = value.trim();
        if (looksLikeKmsSigningSecret(v, sessionApiKey)) return v;
      }
    }
    for (const value of Object.values(o)) {
      const found = pickKmsSigningTokenFromAuthInfoNode(value, sessionApiKey, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

function pickUuidCertFromAuthInfoNode(data: unknown, depth = 0): string | undefined {
  if (depth > 12 || data == null) return undefined;

  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const direct = pickString(o, [
      'uuid_cert',
      'uuidCert',
      'certificateUuid',
      'certificadoUuid',
      'idCertificado',
      'certificateId',
      'certUuid',
    ]);
    if (direct) return direct;
    for (const [key, value] of Object.entries(o)) {
      if (typeof value === 'string' && UUID_CERT_KEY_HINT.test(key) && value.includes('-')) {
        return value.trim();
      }
      const nested = pickUuidCertFromAuthInfoNode(value, depth + 1);
      if (nested) return nested;
    }
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = pickUuidCertFromAuthInfoNode(item, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

/** Credenciais KMS para `kms_type: PSC` a partir do corpo do `GET /auth/info`. */
export function parseBryPscKmsDataFromAuthInfo(
  json: Record<string, unknown>,
  options?: { cpf?: string; sessionApiKey?: string }
): BryKmsData {
  const sessionApiKey = options?.sessionApiKey?.trim() ?? '';
  const kmsData: BryKmsData = {};

  const cpf = normalizeCpfDigits(options?.cpf) || normalizeCpfDigits(pickCpfFromAuthInfoPayload(json));
  if (cpf) kmsData.user = cpf;

  mergeNestedKmsDataFromAuthInfo(kmsData, json, sessionApiKey);

  const signingToken = pickKmsSigningTokenFromAuthInfoNode(json, sessionApiKey);
  if (signingToken) kmsData.token = signingToken;

  const uuidCert = pickUuidCertFromAuthInfoNode(json);
  if (uuidCert) kmsData.uuid_cert = uuidCert;

  return kmsData;
}

/** `kms_data.token` igual à credencial Integra (X-API-KEY) — não é token hex de pré-autorização KMS. */
export function isIntegraSessionCredentialInKms(
  kmsData: BryKmsData,
  integraApiKey?: string
): boolean {
  const token = kmsData.token?.trim();
  const session = integraApiKey?.trim();
  return !!(token && session && token === session);
}

/** Token hex de pré-autorização persistível (exclui credencial Integra repetida em kms_data). */
export function hasPersistablePscHexToken(kmsData: BryKmsData, integraApiKey?: string): boolean {
  const token = kmsData.token?.trim();
  if (!token || isIntegraSessionCredentialInKms(kmsData, integraApiKey)) return false;
  return looksLikeKmsHexToken(token);
}

export function assertPscKmsReadyForPdfSigning(params: {
  kmsData: BryKmsData;
  signatureReady?: boolean;
  integraApiKey?: string;
}): void {
  if (params.signatureReady === false) {
    throw new Error(
      'O certificado no app do PSC ainda não está pronto para assinar. Escolha o certificado e aguarde a confirmação antes de imprimir a prescrição.'
    );
  }
  if (hasPscKmsSigningSecret(params.kmsData) && !isIntegraSessionCredentialInKms(params.kmsData, params.integraApiKey)) {
    return;
  }
  if (params.signatureReady === true && normalizeCpfDigits(params.kmsData.user)) {
    return;
  }
  throw new Error(
    'A Integra BRy não liberou credenciais de assinatura PSC. Reconecte o provedor em Meu Perfil e autorize novamente no app do certificado.'
  );
}

/** Token hex/base64 ou UUID do certificado — obrigatório para `pdf/assinar` com `kms_type: PSC`. */
export function hasPscKmsSigningSecret(kmsData: BryKmsData): boolean {
  return !!(kmsData.token?.trim() || kmsData.uuid_cert?.trim());
}

/** Identificação do titular (CPF) — insuficiente sozinha para assinar no PSC. */
export function hasPscKmsSigningMaterial(kmsData: BryKmsData): boolean {
  return hasPscKmsSigningSecret(kmsData) || !!normalizeCpfDigits(kmsData.user);
}

/** `GET /auth/info` — indica se o PSC liberou assinatura (documentação Integra BRy). */
export function pickBryPscSignatureReady(data: unknown, depth = 0): boolean | undefined {
  if (depth > 12 || data == null) return undefined;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    if (typeof o.signatureReady === 'boolean') return o.signatureReady;
    if (typeof o.signature_ready === 'boolean') return o.signature_ready;
    if (typeof o.prontoParaAssinar === 'boolean') return o.prontoParaAssinar;
    for (const value of Object.values(o)) {
      const nested = pickBryPscSignatureReady(value, depth + 1);
      if (nested !== undefined) return nested;
    }
  }
  if (Array.isArray(data)) {
    for (const item of data) {
      const nested = pickBryPscSignatureReady(item, depth + 1);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

function mergeKmsFieldsFromObject(
  target: BryKmsData,
  o: Record<string, unknown>,
  sessionApiKey: string
): void {
  const user =
    normalizeCpfDigits(pickString(o, ['user', 'cpf', 'cpfCnpj', 'cpfTitular', 'documento'])) ||
    normalizeCpfDigits(pickCpfFromAuthInfoPayload(o));
  if (user) target.user = user;

  for (const [key, value] of Object.entries(o)) {
    if (typeof value !== 'string') continue;
    const v = value.trim();
    if (KMS_HEX_TOKEN_KEY_HINT.test(key) && looksLikeKmsSigningSecret(v, sessionApiKey)) {
      target.token = v;
      break;
    }
  }

  const uuidCert = pickUuidCertFromAuthInfoNode(o);
  if (uuidCert) target.uuid_cert = uuidCert;
}

function mergeNestedKmsDataFromAuthInfo(
  target: BryKmsData,
  json: Record<string, unknown>,
  sessionApiKey: string
): void {
  const nestedKeys = [
    'kms_data',
    'kmsData',
    'dadosKms',
    'credencialKms',
    'credencial',
    'credential',
    'autenticacao',
    'authentication',
  ];

  for (const key of nestedKeys) {
    const raw = json[key];
    if (!raw) continue;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          mergeKmsFieldsFromObject(target, parsed as Record<string, unknown>, sessionApiKey);
        }
      } catch {
        if (looksLikeKmsSigningSecret(raw, sessionApiKey)) target.token = raw.trim();
      }
      continue;
    }
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      mergeKmsFieldsFromObject(target, raw as Record<string, unknown>, sessionApiKey);
    }
  }
}

/** Monta `kms_data` mínimo quando o PSC autorizou mas o JSON não traz token explícito. */
export function buildPscKmsDataForSigning(params: {
  pscKmsData: BryKmsData;
  connection?: { externalAccountId?: string; pscSigningKmsUser?: string };
  authInfoExternalId?: string;
}): BryKmsData {
  const cpf =
    normalizeCpfDigits(params.pscKmsData.user) ||
    normalizeCpfDigits(params.authInfoExternalId) ||
    normalizeCpfDigits(params.connection?.pscSigningKmsUser) ||
    normalizeCpfDigits(params.connection?.externalAccountId);

  const out: BryKmsData = { ...params.pscKmsData };
  if (cpf) out.user = cpf;
  return out;
}

export function resolveIntegraSessionApiKeyFromAuthInfo(
  json: Record<string, unknown>,
  fallbackApiKey: string
): string {
  return (
    pickStrictIntegraApiKeyFromPayload(json) ||
    pickIntegraApiKeyFromPayload(json) ||
    fallbackApiKey.trim()
  );
}

export type BryPscAuthInfoResult = BryUserToken & {
  authInfoAttempts: number;
  /** Credencial `X-API-KEY` (pode ser atualizada pelo corpo do `/auth/info`). */
  sessionApiKey: string;
  /** JWT da aplicação BRy Cloud (Bearer recomendado em `pdf/assinar` + PSC). */
  appAccessToken: string;
  pscKmsData: BryKmsData;
  /** Quando `false`, o PSC ainda não liberou assinatura (escolha do certificado pendente). */
  signatureReady?: boolean;
};

/**
 * Monta token do titular a partir do JSON do `GET /auth/info`.
 * Se o PSC autorizou mas não expõe JWT do titular, usa o JWT da aplicação (padrão Integra: Bearer app + X-API-KEY da sessão).
 */
export function parseBryUserTokenFromAuthInfo(
  json: Record<string, unknown>,
  integraApiKey: string,
  appAccessToken: string
): BryUserToken | null {
  const titularToken = pickAccessTokenFromAuthInfoPayload(json, integraApiKey);
  const externalAccountId = normalizeCpfDigits(pickCpfFromAuthInfoPayload(json));

  if (titularToken) {
    return {
      accessToken: titularToken,
      refreshToken: pickString(json, ['refresh_token', 'refreshToken']),
      expiresIn: typeof json.expires_in === 'number' ? json.expires_in : undefined,
      tokenType: pickString(json, ['token_type', 'tokenType']),
      externalAccountId,
    };
  }

  if (isBryPscAuthInfoAuthorized(json, integraApiKey)) {
    return {
      accessToken: appAccessToken,
      ...(externalAccountId ? { externalAccountId } : {}),
    };
  }

  return null;
}

/**
 * Obtém token do titular após autenticação PSC (Integra BRy — `GET /auth/info`).
 * Documentação: https://bry-developer.readme.io/reference/get_auth-info
 */
export async function fetchBryPscAuthInfo(params: {
  integraApiKey: string;
  config?: BryCloudEnvConfig;
  /** CPF do titular (fallback quando o JSON do `/auth/info` não traz documento). */
  cpf?: string;
  /** Tentativas quando o PSC acabou de autorizar e o token ainda não está disponível. */
  retryAttempts?: number;
  /** Aguarda o PSC propagar a autorização antes da 1ª consulta (ms). */
  initialDelayMs?: number;
}): Promise<BryPscAuthInfoResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const apiKey = params.integraApiKey?.trim();
  if (!apiKey) throw new Error('Credencial Integra BRy ausente no retorno do PSC.');

  const attempts = Math.max(1, params.retryAttempts ?? 3);
  const initialDelayMs =
    params.initialDelayMs ??
    Number.parseInt(process.env.SIGNATURE_BRY_AUTH_INFO_INITIAL_DELAY_MS || '2500', 10);
  if (initialDelayMs > 0) await sleep(initialDelayMs);

  let lastError: Error | null = null;
  let lastResponseKeys: string[] | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(1500);

    try {
      const appToken = await fetchBryApplicationAccessToken(config);
      const authInfoPath = (process.env.SIGNATURE_BRY_AUTH_INFO_PATH || '/auth/info').trim();
      const endpoint = joinBryApiPath(config.apiUrl, authInfoPath);

      const res = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${appToken.accessToken}`,
          'X-API-KEY': apiKey,
          Accept: 'application/json',
        },
      });

      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      lastResponseKeys = listAuthInfoResponseKeys(json);

      if (!res.ok) {
        const bryError = pickString(json, ['error', 'message', 'error_description']);
        const msg =
          bryError || `Falha ao obter credencial BRy após autenticação PSC (${res.status}).`;
        if (res.status === 400 || res.status === 404) {
          console.warn('[bry_psc] auth/info rejected', {
            httpStatus: res.status,
            bryError,
            apiKeyHint: maskIntegraCredentialHint(apiKey),
            responseKeys: lastResponseKeys,
          });
        }
        throw new BryPscAuthInfoError(msg, { httpStatus: res.status, bryError });
      }

      const sessionApiKey = resolveIntegraSessionApiKeyFromAuthInfo(json, apiKey);
      const pscKmsData = parseBryPscKmsDataFromAuthInfo(json, {
        sessionApiKey,
        cpf: normalizeCpfDigits(params.cpf) || normalizeCpfDigits(pickCpfFromAuthInfoPayload(json)),
      });
      const parsed = parseBryUserTokenFromAuthInfo(json, apiKey, appToken.accessToken);
      if (parsed) {
        const kmsData = buildPscKmsDataForSigning({
          pscKmsData,
          authInfoExternalId: parsed.externalAccountId,
        });
        const signatureReady = pickBryPscSignatureReady(json);
        if (!hasPscKmsSigningSecret(kmsData)) {
          console.warn('[bry_psc] auth/info sem kms_data.token/uuid_cert', {
            apiKeyHint: maskIntegraCredentialHint(apiKey),
            responseKeys: lastResponseKeys,
            kmsDataKeys: Object.keys(kmsData),
            signatureReady,
          });
        }
        return {
          ...parsed,
          authInfoAttempts: attempt + 1,
          sessionApiKey,
          appAccessToken: appToken.accessToken,
          pscKmsData: kmsData,
          signatureReady,
        };
      }

      throw new Error(
        'Autenticação PSC concluída, mas a Integra BRy ainda não liberou o token. Aguarde alguns segundos e tente reconectar.'
      );
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const retryable =
        attempt < attempts - 1 &&
        (lastError instanceof BryPscAuthInfoError
          ? lastError.httpStatus === 404 ||
            lastError.httpStatus === 401 ||
            lastError.httpStatus === 403
          : /ainda não liberou|aguarde|invalid_grant/i.test(lastError.message));
      if (!retryable) break;
    }
  }

  const hint = lastResponseKeys?.length
    ? ` Campos na resposta: ${lastResponseKeys.join(', ')}.`
    : '';
  if (lastError) {
    lastError.message = `${lastError.message}${hint}`;
  }
  throw lastError ?? new Error(`Não foi possível obter o token do PSC na Integra BRy.${hint}`);
}

export async function fetchBryPscAuthInfoWithCandidates(params: {
  candidates: string[];
  config?: BryCloudEnvConfig;
  cpf?: string;
}): Promise<{
  tokens: BryUserToken;
  integraApiKey: string;
  authInfoAttempts: number;
  pscKmsData?: BryKmsData;
  signatureReady?: boolean;
}> {
  const keys = params.candidates.map((k) => k.trim()).filter(Boolean);
  if (!keys.length) {
    throw new Error(
      'Credencial Integra BRy não encontrada. Gere o link PSC novamente e conclua a autorização no app do certificado.'
    );
  }

  let lastError: Error | null = null;
  for (const integraApiKey of keys) {
    try {
      const result = await fetchBryPscAuthInfo({
        integraApiKey,
        config: params.config,
        cpf: params.cpf,
        initialDelayMs: keys[0] === integraApiKey ? undefined : 0,
      });
      const { authInfoAttempts, sessionApiKey, pscKmsData, appAccessToken, ...tokens } = result;
      return {
        tokens: {
          ...tokens,
          accessToken: tokens.accessToken?.trim() || appAccessToken,
        },
        integraApiKey: sessionApiKey,
        authInfoAttempts,
        pscKmsData: pscKmsData ?? {},
        signatureReady: result.signatureReady,
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw (
    lastError ??
    new Error('Não foi possível validar a autenticação PSC na Integra BRy. Tente reconectar.')
  );
}
