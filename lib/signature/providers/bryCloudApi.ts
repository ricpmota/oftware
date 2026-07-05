import {
  bryCloudJwtAuthErrorHint,
  diagnoseBryClientSecretFormat,
  getBryCloudEnvConfig,
  joinBryApiPath,
  type BryCloudEnvConfig,
} from '@/lib/signature/providers/bryCloudEnv';
import {
  pickAuthorizationContextIdFromPayload,
  pickIntegraApiKeyFromAuthorizationUrl,
  pickIntegraApiKeyFromPayload,
  pickPscLinkSigningTokenFromPayload,
  pickStrictIntegraApiKeyFromPayload,
} from '@/lib/signature/providers/bryPscAuth';
import { resolveBryPscNameForConnect } from '@/lib/signature/providers/bryPscNameMap';

export type BryApplicationToken = {
  accessToken: string;
  expiresIn?: number;
  tokenType?: string;
};

export type BryUserToken = BryApplicationToken & {
  refreshToken?: string;
  externalAccountId?: string;
};

export type BryAuthorizationUrlResult = {
  authorizationUrl: string;
  authorizationContextId?: string;
  /** Credencial Integra (`X-API-KEY` em `/auth/info`). */
  integraApiKey?: string;
  /** Token de assinatura do `/psc/link` (HUB kms_data.token). */
  integraBrySigningToken?: string;
  /** Chaves presentes no JSON do `/psc/link` (debug). */
  pscLinkResponseKeys?: string[];
};

export type BryPdfSignResult = {
  operationId?: string;
  status: string;
  signedPdfUrl?: string;
  /** PDF assinado retornado pelo HUB (tipoRetorno BASE64). */
  signedPdfBase64?: string;
  externalSignatureId?: string;
  raw: unknown;
};

export class BryPdfSignError extends Error {
  readonly httpStatus: number;
  readonly sanitizedBody: unknown;

  constructor(message: string, details: { httpStatus: number; sanitizedBody: unknown }) {
    super(message);
    this.name = 'BryPdfSignError';
    this.httpStatus = details.httpStatus;
    this.sanitizedBody = details.sanitizedBody;
  }
}

const BRY_KMS_TYPE = 'BRYKMS';

const SENSITIVE_RESPONSE_KEYS =
  /token|secret|password|senha|pin|authorization|api[_-]?key|credential|credencial|jwt|bearer/i;

function maskValueForLog(value: string): string {
  const v = value.trim();
  if (v.length <= 8) return '***';
  return `${v.slice(0, 4)}…${v.slice(-4)} (len:${v.length})`;
}

/** Corpo da resposta BRy para logs (sem vazar tokens). */
export function sanitizeBryApiResponseForLog(payload: unknown, depth = 0): unknown {
  if (depth > 6 || payload == null) return payload;
  if (typeof payload === 'string') {
    return payload.length > 120 ? `${payload.slice(0, 80)}… (len:${payload.length})` : payload;
  }
  if (Array.isArray(payload)) {
    return payload.slice(0, 20).map((item) => sanitizeBryApiResponseForLog(item, depth + 1));
  }
  if (typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (typeof value === 'string' && SENSITIVE_RESPONSE_KEYS.test(key)) {
        out[key] = maskValueForLog(value);
      } else {
        out[key] = sanitizeBryApiResponseForLog(value, depth + 1);
      }
    }
    return out;
  }
  return payload;
}

/** OID ICP-Brasil — prescrição de medicamento (assinatura médica). */
export const BRY_PRESCRIPTION_DOCUMENT_OID = '2.16.76.1.12.1.1';

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNestedUrl(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  return (
    pickString(o, ['link', 'authorizationUrl', 'url', 'authorization_url', 'authUrl']) ||
    (typeof o.data === 'object' && o.data
      ? pickNestedUrl(o.data)
      : undefined) ||
    (Array.isArray(o.entidades) && o.entidades[0] && typeof o.entidades[0] === 'object'
      ? pickString(o.entidades[0] as Record<string, unknown>, ['url', 'authorizationUrl'])
      : undefined)
  );
}

function pickAuthorizationContextId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const o = data as Record<string, unknown>;
  return pickString(o, [
    'authorizationContextId',
    'idContextoAutorizacao',
    'contextId',
    'authorization_context_id',
  ]);
}

export async function fetchBryApplicationAccessToken(
  config: BryCloudEnvConfig = getBryCloudEnvConfig()
): Promise<BryApplicationToken> {
  const secretFormatIssue = diagnoseBryClientSecretFormat(config.clientSecret);
  if (secretFormatIssue) {
    throw new Error(secretFormatIssue);
  }

  const tokenUrl = config.applicationTokenUrl;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      pickString(json, ['error_description', 'message', 'error']) ||
      `Falha ao obter token da aplicação BRy (${res.status}).`;
    const hint =
      res.status === 401 || /client (id|secret) incorreto/i.test(msg)
        ? ` ${bryCloudJwtAuthErrorHint(config.deployment, msg, config.clientSecret)}`
        : '';
    throw new Error(`${msg}${hint}`);
  }

  const accessToken = pickString(json, ['access_token', 'accessToken']);
  if (!accessToken) throw new Error('Resposta BRy sem access_token.');

  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : undefined;
  const tokenType = pickString(json, ['token_type', 'tokenType']);

  return { accessToken, expiresIn, tokenType };
}

function normalizeCpfDigits(cpf?: string): string | undefined {
  const digits = cpf?.replace(/\D/g, '') ?? '';
  return digits.length === 11 ? digits : undefined;
}

function extractPscNamesFromListPayload(json: unknown): string[] {
  const names = new Set<string>();
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === 'string' && node.trim()) {
      names.add(node.trim());
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      const o = node as Record<string, unknown>;
      const name = pickString(o, ['pscName', 'name', 'nome', 'id', 'provider']);
      if (name) names.add(name);
      visit(o.data);
      visit(o.items);
      visit(o.pscs);
      visit(o.entidades);
    }
  };
  visit(json);
  return [...names];
}

/** Lista PSCs Integra BRy (`GET /psc/list`). */
export async function listBryPscProviders(params: {
  config?: BryCloudEnvConfig;
  appToken: string;
  cpf?: string;
}): Promise<string[]> {
  const config = params.config ?? getBryCloudEnvConfig();
  const listUrl = new URL(joinBryApiPath(config.apiUrl, '/psc/list'));
  const cpf = normalizeCpfDigits(params.cpf);
  if (cpf) listUrl.searchParams.set('cpf', cpf);

  const res = await fetch(listUrl.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.appToken}`,
      Accept: 'application/json',
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      pickString(json as Record<string, unknown>, ['message', 'error']) ||
      `Falha ao listar PSCs BRy (${res.status}).`;
    throw new Error(msg);
  }

  return extractPscNamesFromListPayload(json);
}

/** Resolve PSC para `/psc/link` a partir do provedor escolhido pelo médico (não usa env global). */
export function resolveBryPscNameForAuthorization(params: {
  signatureProvider?: string | null;
}): string {
  return resolveBryPscNameForConnect(params.signatureProvider);
}

/**
 * Gera link de autenticação PSC (Integra BRy — `POST /psc/link`).
 * Documentação: https://bry-developer.readme.io/reference/post_psc-link
 */
export async function requestBryAuthorizationUrl(params: {
  config?: BryCloudEnvConfig;
  state: string;
  returnUrl?: string;
  cpf?: string;
  /** ID do PSC no perfil (ex.: safeid). */
  signatureProvider?: string | null;
}): Promise<BryAuthorizationUrlResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const appToken = await fetchBryApplicationAccessToken(config);
  const pscName = resolveBryPscNameForAuthorization({
    signatureProvider: params.signatureProvider,
  });

  const linkEndpoint = joinBryApiPath(config.apiUrl, config.pscLinkPath);
  const res = await fetch(linkEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appToken.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      pscName,
      redirectUri: config.redirectUri,
      state: params.state,
      scope: config.pscScope,
      lifetime: config.pscAuthLifetimeSec,
      numberOfDocuments: config.pscNumberOfDocuments,
      ...(normalizeCpfDigits(params.cpf) ? { cpf: normalizeCpfDigits(params.cpf) } : {}),
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      pickString(json as Record<string, unknown>, ['message', 'error', 'error_description']) ||
      `Falha ao gerar link de autenticação BRy (${res.status}).`;
    throw new Error(`${msg} (PSC: ${pscName})`);
  }

  const authorizationUrl = pickNestedUrl(json);
  if (!authorizationUrl) {
    throw new Error('BRy Integra não retornou URL de autenticação do PSC.');
  }

  const authorizationContextId =
    pickAuthorizationContextIdFromPayload(json) || pickAuthorizationContextId(json);
  const integraBrySigningToken = pickPscLinkSigningTokenFromPayload(json);
  const strictApiKey = pickStrictIntegraApiKeyFromPayload(json);
  const integraApiKey =
    strictApiKey ||
    pickIntegraApiKeyFromPayload(json) ||
    authorizationContextId ||
    pickIntegraApiKeyFromAuthorizationUrl(authorizationUrl);

  const pscLinkResponseKeys =
    json && typeof json === 'object' ? Object.keys(json as Record<string, unknown>) : undefined;

  return {
    authorizationUrl,
    authorizationContextId,
    integraApiKey,
    integraBrySigningToken,
    pscLinkResponseKeys,
  };
}

export async function exchangeBryAuthorizationCode(params: {
  code: string;
  config?: BryCloudEnvConfig;
}): Promise<BryUserToken> {
  const config = params.config ?? getBryCloudEnvConfig();
  const appToken = await fetchBryApplicationAccessToken(config);
  const tokenEndpoint = joinBryApiPath(config.apiUrl, config.oauthTokenPath);

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code.trim(),
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Bearer ${appToken.accessToken}`,
    },
    body: body.toString(),
  });

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg =
      pickString(json, ['error_description', 'message', 'error']) ||
      `Falha ao trocar código OAuth BRy (${res.status}).`;
    throw new Error(msg);
  }

  const accessToken = pickString(json, ['access_token', 'accessToken']);
  if (!accessToken) throw new Error('Resposta BRy OAuth sem access_token do titular.');

  return {
    accessToken,
    refreshToken: pickString(json, ['refresh_token', 'refreshToken']),
    expiresIn: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    tokenType: pickString(json, ['token_type', 'tokenType']),
    externalAccountId: pickString(json, ['sub', 'user_id', 'userId', 'cpf']),
  };
}

export type BryKmsData = {
  user?: string;
  uuid_cert?: string;
  /** Token de pré-autorização BRy KMS (hex) — não é PIN. */
  token?: string;
  [key: string]: string | undefined;
};

async function loadPdfBuffer(params: {
  originalPdfBuffer?: Buffer;
  originalPdfUrl: string;
}): Promise<Buffer> {
  if (params.originalPdfBuffer?.length) return params.originalPdfBuffer;
  const url = params.originalPdfUrl?.trim();
  if (!url || url.startsWith('sandbox://')) {
    throw new Error('PDF original inválido para assinatura BRy.');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não foi possível baixar o PDF (${res.status}).`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

/**
 * Assina PDF/PAdES com certificado em nuvem (kms_type=BRYKMS).
 * Referência: bry-developer — Assinar PDF/PAdES utilizando Certificado em nuvem.
 */
export async function submitBryPdfSignature(params: {
  accessToken: string;
  /** `PSC` para certificado em PSC (SafeID, Vidaas…); `BRYKMS` para certificado no BRy KMS. */
  kmsType?: string;
  originalPdfBuffer?: Buffer;
  originalPdfUrl: string;
  kmsData: BryKmsData;
  dadosAssinatura?: Record<string, unknown>;
  /** Quando `prescription`, envia metadados OID de prescrição médica. */
  documentType?: string;
  config?: BryCloudEnvConfig;
}): Promise<BryPdfSignResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const pdfBuffer = await loadPdfBuffer(params);
  const endpoint = joinBryApiPath(config.apiUrl, config.pdfSignPath);
  const kmsType = (params.kmsType?.trim() || BRY_KMS_TYPE).toUpperCase();

  const dadosAssinatura: Record<string, unknown> = {
    perfil: 'PADES_ICP_BR',
    algoritmoHash: 'SHA256',
    ...params.dadosAssinatura,
  };
  if (params.documentType?.trim().toLowerCase() === 'prescription') {
    dadosAssinatura.metadados = {
      ...(typeof dadosAssinatura.metadados === 'object' && dadosAssinatura.metadados
        ? (dadosAssinatura.metadados as Record<string, unknown>)
        : {}),
      [BRY_PRESCRIPTION_DOCUMENT_OID]: '',
    };
  }

  if (kmsType === 'PSC') {
    dadosAssinatura.kms_data = { ...params.kmsData };
  }

  const form = new FormData();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  form.append('documento[0]', pdfBlob, 'document.pdf');
  form.append('dados_assinatura', JSON.stringify(dadosAssinatura));
  if (kmsType !== 'PSC') {
    form.append('kms_data', JSON.stringify(params.kmsData));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${params.accessToken}`,
    kms_type: kmsType,
    Accept: 'application/json',
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: form,
  });

  const rawText = await res.text().catch(() => '');
  let json: unknown = {};
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { rawText: rawText.slice(0, 500) };
    }
  }

  const sanitizedBody = sanitizeBryApiResponseForLog(json);

  if (!res.ok) {
    const rawMsg =
      typeof json === 'object' && json
        ? pickString(json as Record<string, unknown>, ['message', 'error', 'error_description'])
        : undefined;
    let msg = rawMsg || `Falha ao enviar PDF para assinatura BRy (${res.status}).`;
    if (res.status === 403 && /sem permissão/i.test(msg)) {
      msg =
        'Sem permissão para assinar PDF no BRy Cloud com este PSC (403). Verifique no portal BRy Cloud se o HUB Signer / assinatura PDF com Integra PSC está habilitado para sua aplicação.';
    }

    console.error('[bry_cloud] pdf/assinar error', {
      httpStatus: res.status,
      kmsType,
      kmsDataInDadosAssinatura: kmsType === 'PSC',
      kmsDataKeys: Object.keys(params.kmsData),
      bryMessage: rawMsg,
      sanitizedBody,
      endpoint,
    });

    throw new BryPdfSignError(msg, { httpStatus: res.status, sanitizedBody });
  }

  console.info('[bry_cloud] pdf/assinar ok', {
    httpStatus: res.status,
    kmsType,
    kmsDataKeys: Object.keys(params.kmsData),
    sanitizedBody,
  });

  const record = (typeof json === 'object' && json ? json : {}) as Record<string, unknown>;
  const operationId = pickString(record, ['operationId', 'operation_id', 'id', 'protocolo']);
  const signedPdfUrl = pickString(record, ['signedPdfUrl', 'url', 'link', 'documentoAssinadoUrl']);
  const status = pickString(record, ['status', 'situacao']) || (signedPdfUrl ? 'signed' : 'pending_provider_authorization');

  return {
    operationId,
    status,
    signedPdfUrl,
    externalSignatureId: operationId,
    raw: json,
  };
}

export async function getBrySignatureOperationStatus(params: {
  accessToken: string;
  operationId: string;
  config?: BryCloudEnvConfig;
}): Promise<BryPdfSignResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const path = `/assinadores/pdf/operacao/${encodeURIComponent(params.operationId.trim())}`;
  const endpoint = joinBryApiPath(config.apiUrl, path);

  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: 'application/json',
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (typeof json === 'object' && json && pickString(json as Record<string, unknown>, ['message', 'error'])) ||
      `Falha ao consultar operação BRy (${res.status}).`;
    throw new Error(msg);
  }

  const record = (typeof json === 'object' && json ? json : {}) as Record<string, unknown>;
  return {
    operationId: params.operationId,
    status: pickString(record, ['status', 'situacao']) || 'pending_provider_authorization',
    signedPdfUrl: pickString(record, ['signedPdfUrl', 'url', 'link', 'documentoAssinadoUrl']),
    externalSignatureId: params.operationId,
    raw: json,
  };
}

export async function downloadBrySignedPdfUrl(params: {
  accessToken: string;
  signedPdfUrl?: string;
  operationId?: string;
  config?: BryCloudEnvConfig;
}): Promise<string> {
  const direct = params.signedPdfUrl?.trim();
  if (direct) return direct;

  if (params.operationId?.trim()) {
    const status = await getBrySignatureOperationStatus({
      accessToken: params.accessToken,
      operationId: params.operationId,
      config: params.config,
    });
    if (status.signedPdfUrl) return status.signedPdfUrl;
  }

  throw new Error('PDF assinado BRy ainda não disponível.');
}

export { BRY_KMS_TYPE };
