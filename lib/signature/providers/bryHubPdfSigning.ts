import { randomUUID } from 'crypto';
import {
  BRY_HUB_KMS_TYPE_INTEGRABRY,
  BRY_HUB_PDF_PRESCRIPTION_PERFIL,
  BRY_PHYSICIAN_CRM_OID,
  BRY_PHYSICIAN_CRM_UF_OID,
  BRY_PHYSICIAN_SPECIALTY_OID,
  BRY_PRESCRIPTION_METADATA_OID,
} from '@/lib/signature/brySignatureConstants';
import {
  BryPdfSignError,
  sanitizeBryApiResponseForLog,
  type BryPdfSignResult,
} from '@/lib/signature/providers/bryCloudApi';
import {
  getBryCloudEnvConfig,
  joinBryHubApiPath,
  isLegacyPdfBatchEnvExplicitlyDisabled,
  shouldUseCmsKmsHub,
  shouldUseHubPdfPadesSigning,
  type BryCmsInputMode,
  type BryCloudEnvConfig,
} from '@/lib/signature/providers/bryCloudEnv';
import { sha256Base64, sha256Hex } from '@/lib/signature/sandboxSignaturePdf';
import type { BryPrescriptionPhysicianMetadata } from '@/types/signatureProviderAdapter';

export const BRY_HUB_CMS_SIGN_PATH_DEFAULT = '/fw/v1/cms/kms/assinaturas';
export const BRY_HUB_PDF_BATCH_SIGN_PATH_DEFAULT = '/fw/v1/pdf/kms/lote/assinaturas';
export const BRY_HUB_CMS_ORIGINAL_DOCUMENT_CONTENT_FIELD = 'originalDocuments[0][content]';
export const BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD = 'originalDocuments[0][hash]';
export const BRY_HUB_CMS_ORIGINAL_DOCUMENT_FILENAME_FIELD = 'originalDocuments[0][filename]';
export const BRY_HUB_CMS_ORIGINAL_DOCUMENT_NONCE_FIELD = 'originalDocuments[0][nonce]';
export const BRY_HUB_CMS_PADRAO = 'CADES';
export const BRY_HUB_CMS_FORMATO_ASSINATURA_HASH = 'HASH';
export const BRY_HUB_CMS_FORMATO_DADOS_ENTRADA = 'Base64';
/** Campo multipart JSON do endpoint CMS/KMS. */
export const BRY_HUB_CMS_REQUEST_FIELD = 'cmsRequest';
/** Campo multipart JSON do endpoint PDF/lote legado. */
export const BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD = 'dados_assinatura';

const SIGNED_BASE64_KEY =
  /^(documento|arquivo|conteudo|content|pdf|base64|signed|assinado|resultado|file)/i;

const DETACHED_CMS_KEY =
  /^(cms|pkcs7|pkcs#7|assinatura|signature|conteudoAssinado|signedCms|assinaturaDestacada|detached)/i;

export const BRY_HUB_DETACHED_CMS_ERROR_MESSAGE =
  'Endpoint CMS retornou assinatura destacada; é necessário aplicar a assinatura ao PDF ou usar endpoint PDF/PAdES.';

export const BRY_HUB_CMS_HASH_ALGORITHM = 'SHA256';
export const BRY_HUB_CMS_DEFAULT_FILENAME = 'document.pdf';

export type BryHubSignMode = 'cms' | 'pdf_batch_legacy';

export type BryHubIntegraSignParams = {
  accessToken: string;
  integraServiceUrl: string;
  integraSigningToken: string;
  originalPdfBuffer?: Buffer;
  originalPdfUrl: string;
  prescriptionMetadata: BryPrescriptionPhysicianMetadata;
  /** Firestore request id — vira originalDocuments[0][nonce] no CMS. */
  requestId?: string;
  config?: BryCloudEnvConfig;
};

export function resolveBryHubCmsDocumentNonce(requestId?: string): {
  nonce: string;
  nonceSource: 'requestId' | 'randomUUID';
} {
  const trimmed = requestId?.trim();
  if (trimmed) return { nonce: trimmed, nonceSource: 'requestId' };
  return { nonce: randomUUID(), nonceSource: 'randomUUID' };
}

export function buildBryHubCmsHashEntry(params: {
  pdfBuffer: Buffer;
  requestId?: string;
  filename?: string;
}): {
  /** Hex — multipart `originalDocuments[n][hash]` (doc BRy FW2). */
  hashHex: string;
  /** Base64 — array `hashes` do `cmsRequest` com `formatoDadosEntrada: Base64`. */
  hashBase64: string;
  filename: string;
  nonce: string;
  nonceSource: 'requestId' | 'randomUUID';
} {
  const { nonce, nonceSource } = resolveBryHubCmsDocumentNonce(params.requestId);
  return {
    hashHex: sha256Hex(params.pdfBuffer),
    hashBase64: sha256Base64(params.pdfBuffer),
    filename: params.filename?.trim() || BRY_HUB_CMS_DEFAULT_FILENAME,
    nonce,
    nonceSource,
  };
}

/** Payload JSON do endpoint CMS/KMS (`cmsRequest` / `dados_assinatura`). */
export function buildHubIntegraCmsRequestPayload(params: {
  integraUrl: string;
  signingToken: string;
  cmsInputMode?: BryCmsInputMode;
  pdfBuffer?: Buffer;
  requestId?: string;
}): {
  cmsRequest: Record<string, unknown>;
  nonceSource?: 'requestId' | 'randomUUID';
  hashesCount: number;
} {
  const cmsRequest: Record<string, unknown> = {
    kms_data: {
      url: params.integraUrl.replace(/\/$/, ''),
      token: params.signingToken,
    },
    algoritmoHash: BRY_HUB_CMS_HASH_ALGORITHM,
    padrao: BRY_HUB_CMS_PADRAO,
    formatoAssinatura: BRY_HUB_CMS_FORMATO_ASSINATURA_HASH,
    formatoDadosEntrada: BRY_HUB_CMS_FORMATO_DADOS_ENTRADA,
    perfil: BRY_HUB_PDF_PRESCRIPTION_PERFIL,
  };

  if (params.cmsInputMode === 'hashes' && params.pdfBuffer?.length) {
    const hashEntry = buildBryHubCmsHashEntry({
      pdfBuffer: params.pdfBuffer,
      requestId: params.requestId,
    });
    return {
      cmsRequest: {
        ...cmsRequest,
        hashes: [hashEntry.hashBase64],
        nonces: [hashEntry.nonce],
        nomeDocumentos: [hashEntry.filename],
      },
      nonceSource: hashEntry.nonceSource,
      hashesCount: 1,
    };
  }

  return { cmsRequest, hashesCount: 0 };
}

/** Payload JSON do endpoint PDF/lote legado (`dados_assinatura` apenas). */
function buildHubIntegraPdfBatchDadosAssinatura(params: {
  integraUrl: string;
  signingToken: string;
}): Record<string, unknown> {
  return {
    kms_data: {
      url: params.integraUrl.replace(/\/$/, ''),
      token: params.signingToken,
    },
    algoritmoHash: BRY_HUB_CMS_HASH_ALGORITHM,
    perfil: BRY_HUB_PDF_PRESCRIPTION_PERFIL,
    restructure: true,
    tipoRetorno: 'BASE64',
  };
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function decodesToPdfBytes(value: string): boolean {
  try {
    const buf = Buffer.from(value.trim(), 'base64');
    return buf.length >= 4 && buf.subarray(0, 4).toString() === '%PDF';
  } catch {
    return false;
  }
}

function looksLikePdfBase64(value: string): boolean {
  const v = value.trim();
  if (v.length < 16) return false;
  if (v.startsWith('%PDF')) return true;
  if (/^[A-Za-z0-9+/=\r\n]+$/.test(v)) return decodesToPdfBytes(v);
  return false;
}

function extractSignedPdfBase64FromHubResponse(payload: unknown, depth = 0): string | undefined {
  if (depth > 10 || payload == null) return undefined;

  if (typeof payload === 'string') {
    return looksLikePdfBase64(payload) ? payload.trim() : undefined;
  }

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractSignedPdfBase64FromHubResponse(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (typeof payload !== 'object') return undefined;

  const o = payload as Record<string, unknown>;

  for (const [key, value] of Object.entries(o)) {
    if (typeof value === 'string' && SIGNED_BASE64_KEY.test(key) && looksLikePdfBase64(value)) {
      return value.trim();
    }
  }

  for (const key of ['documentos', 'documento', 'arquivos', 'arquivo', 'resultado', 'resultados', 'data']) {
    const nested = o[key];
    if (nested != null) {
      const found = extractSignedPdfBase64FromHubResponse(nested, depth + 1);
      if (found) return found;
    }
  }

  for (const value of Object.values(o)) {
    if (value && typeof value === 'object') {
      const found = extractSignedPdfBase64FromHubResponse(value, depth + 1);
      if (found) return found;
    }
  }

  return undefined;
}

function extractSignedPdfUrlFromHubDocumentos(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const documentos = (payload as Record<string, unknown>).documentos;
  if (!Array.isArray(documentos)) return undefined;

  for (const doc of documentos) {
    if (!doc || typeof doc !== 'object') continue;
    const record = doc as Record<string, unknown>;
    const direct = pickString(record, ['url', 'link', 'href', 'signedPdfUrl', 'documentoAssinadoUrl']);
    if (direct?.startsWith('http')) return direct;

    const links = record.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      if (!link || typeof link !== 'object') continue;
      const href = pickString(link as Record<string, unknown>, ['href', 'url', 'link']);
      if (href?.startsWith('http')) return href;
    }
  }
  return undefined;
}

/** Detecta resposta com CMS/PKCS7 destacado sem PDF embutido. */
export function detectDetachedCmsInHubResponse(payload: unknown, depth = 0): boolean {
  if (depth > 10 || payload == null) return false;

  if (typeof payload === 'string') {
    const v = payload.trim();
    if (v.startsWith('%PDF')) return false;
    if (v.length > 64 && /^[A-Za-z0-9+/=\r\n]+$/.test(v) && !looksLikePdfBase64(v)) {
      return true;
    }
    return false;
  }

  if (Array.isArray(payload)) {
    return payload.some((item) => detectDetachedCmsInHubResponse(item, depth + 1));
  }

  if (typeof payload !== 'object') return false;

  const o = payload as Record<string, unknown>;
  for (const [key, value] of Object.entries(o)) {
    if (DETACHED_CMS_KEY.test(key) && typeof value === 'string' && value.trim().length > 32) {
      if (!decodesToPdfBytes(value)) return true;
    }
    if (value && typeof value === 'object' && detectDetachedCmsInHubResponse(value, depth + 1)) {
      return true;
    }
  }
  return false;
}

async function loadPdfBuffer(params: {
  originalPdfBuffer?: Buffer;
  originalPdfUrl: string;
}): Promise<Buffer> {
  if (params.originalPdfBuffer?.length) return params.originalPdfBuffer;
  const url = params.originalPdfUrl?.trim();
  if (!url || url.startsWith('sandbox://') || url.startsWith('bry://')) {
    throw new Error('PDF original inválido para assinatura BRy.');
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Não foi possível baixar o PDF (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}

export function buildBryHubPrescriptionMetadados(
  metadata: BryPrescriptionPhysicianMetadata
): Record<string, string> {
  return {
    [BRY_PRESCRIPTION_METADATA_OID]: '',
    [BRY_PHYSICIAN_CRM_OID]: metadata.crm?.trim() ?? '',
    [BRY_PHYSICIAN_CRM_UF_OID]: metadata.crmUf?.trim() ?? '',
    [BRY_PHYSICIAN_SPECIALTY_OID]: metadata.specialty?.trim() ?? '',
  };
}

function appendHubCmsOriginalDocumentHashFields(
  form: FormData,
  hashEntry: ReturnType<typeof buildBryHubCmsHashEntry>
): { pdfFieldName: string; hasNonce: boolean } {
  form.append(BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD, hashEntry.hashHex);
  form.append(BRY_HUB_CMS_ORIGINAL_DOCUMENT_FILENAME_FIELD, hashEntry.filename);
  form.append(BRY_HUB_CMS_ORIGINAL_DOCUMENT_NONCE_FIELD, hashEntry.nonce);
  return {
    pdfFieldName: BRY_HUB_CMS_ORIGINAL_DOCUMENT_HASH_FIELD,
    hasNonce: true,
  };
}

function appendHubPdfBatchMultipartFields(form: FormData, pdfBuffer: Buffer): { pdfFieldName: string } {
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  form.append('documento[0]', pdfBlob, 'document.pdf');
  return { pdfFieldName: 'documento[0]' };
}

function inspectHubFormDataForLog(form: FormData): {
  multipartFields: Array<{
    name: string;
    kind: 'string' | 'blob';
    contentType?: string;
    sizeBytes: number;
    filename?: string;
    containsPdfField: boolean;
  }>;
  dadosAssinaturaKeys: string[];
  cmsRequestHasHashes: boolean;
} {
  const multipartFields: Array<{
    name: string;
    kind: 'string' | 'blob';
    contentType?: string;
    sizeBytes: number;
    filename?: string;
    containsPdfField: boolean;
  }> = [];

  let dadosAssinaturaKeys: string[] = [];
  let cmsRequestHasHashes = false;

  form.forEach((value, name) => {
    if (typeof value === 'string') {
      multipartFields.push({
        name,
        kind: 'string',
        sizeBytes: value.length,
        containsPdfField: false,
      });
      if (name === BRY_HUB_CMS_REQUEST_FIELD || name === BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD) {
        try {
          const parsed = JSON.parse(value) as Record<string, unknown>;
          dadosAssinaturaKeys = Object.keys(parsed);
          if (Array.isArray(parsed.hashes) && parsed.hashes.length > 0) cmsRequestHasHashes = true;
        } catch {
          dadosAssinaturaKeys = ['<parse_error>'];
        }
      }
      return;
    }

    const blob = value as Blob;
    const filename = blob instanceof File ? blob.name : undefined;
    multipartFields.push({
      name,
      kind: 'blob',
      contentType: blob.type || undefined,
      sizeBytes: blob.size,
      filename,
      containsPdfField: blob.type === 'application/pdf' || name.toLowerCase().includes('document'),
    });
  });

  return { multipartFields, dadosAssinaturaKeys, cmsRequestHasHashes };
}

function logBryHubPdfPadesRequestAudit(params: {
  endpoint: string;
  pdfSizeBytes: number;
  requestId?: string;
}): void {
  console.info('[bry_pdf_pades_request]', {
    endpoint: params.endpoint,
    hubSigningMode: 'pdf_pades',
    pdfSizeBytes: params.pdfSizeBytes,
    requestId: params.requestId?.trim() || null,
    hasDocumentoMultipart: true,
  });
}

function logBryCmsRequestAudit(params: {
  endpoint: string;
  cmsInputMode: BryCmsInputMode;
  pdfSizeBytes: number;
  hashAlgorithm: string;
  hashesCount: number;
  hasPdfMultipart: boolean;
  nonceSource?: 'requestId' | 'randomUUID';
  form: FormData;
}): void {
  const inspection = inspectHubFormDataForLog(params.form);

  console.info('[bry_cms_request]', {
    endpoint: params.endpoint,
    mode: params.cmsInputMode,
    hashAlgorithm: params.hashAlgorithm,
    hashesCount: params.hashesCount,
    hasPdfMultipart: params.hasPdfMultipart,
    pdfSizeBytes: params.pdfSizeBytes,
    nonceSource: params.nonceSource,
    multipartFields: inspection.multipartFields.map(({ name, kind, contentType, sizeBytes, filename }) => ({
      name,
      kind,
      contentType,
      sizeBytes,
      filename,
    })),
    cmsRequestKeys: inspection.dadosAssinaturaKeys,
    cmsRequestHasHashes: inspection.cmsRequestHasHashes,
    sendsDadosAssinaturaAndCmsRequest: true,
  });
}

function resolveHubPdfPadesSignTarget(config: BryCloudEnvConfig): {
  endpoint: string;
  mode: BryHubSignMode;
  logTag: 'hub/pdf/lote';
} {
  return {
    endpoint: joinBryHubApiPath(config.hubApiUrl, config.hubPdfBatchSignPath),
    mode: 'pdf_batch_legacy',
    logTag: 'hub/pdf/lote',
  };
}

function resolveHubCmsKmsSignTarget(config: BryCloudEnvConfig): {
  endpoint: string;
  mode: BryHubSignMode;
  logTag: 'hub/cms/kms';
} {
  return {
    endpoint: joinBryHubApiPath(config.hubApiUrl, config.hubCmsSignPath),
    mode: 'cms',
    logTag: 'hub/cms/kms',
  };
}

function resolveHubSignTargetFromEnv(config: BryCloudEnvConfig): {
  endpoint: string;
  mode: BryHubSignMode;
  logTag: 'hub/cms/kms' | 'hub/pdf/lote';
} {
  return shouldUseHubPdfPadesSigning()
    ? resolveHubPdfPadesSignTarget(config)
    : resolveHubCmsKmsSignTarget(config);
}

async function submitBryHubIntegraSignatureInternal(
  params: BryHubIntegraSignParams & { mode?: BryHubSignMode; endpoint?: string }
): Promise<BryPdfSignResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  if (!config.hubApiUrl?.trim()) {
    throw new Error('SIGNATURE_BRY_HUB_API_URL não configurada no servidor.');
  }

  const integraUrl = params.integraServiceUrl?.trim() || config.apiUrl;
  const signingToken = params.integraSigningToken?.trim();
  if (!signingToken) {
    throw new Error('Token Integra BRy ausente. Reconecte o BRy Cloud em Meu Perfil.');
  }

  const target = params.endpoint
    ? {
        endpoint: params.endpoint,
        mode: params.mode ?? ('pdf_batch_legacy' as BryHubSignMode),
        logTag: (params.mode === 'cms' ? 'hub/cms/kms' : 'hub/pdf/lote') as
          | 'hub/cms/kms'
          | 'hub/pdf/lote',
      }
    : resolveHubSignTargetFromEnv(config);

  const pdfBuffer = await loadPdfBuffer(params);

  if (target.mode === 'pdf_batch_legacy') {
    logBryHubPdfPadesRequestAudit({
      endpoint: target.endpoint,
      pdfSizeBytes: pdfBuffer.length,
      requestId: params.requestId,
    });
  }
  const cmsInputMode = target.mode === 'cms' ? config.hubCmsInputMode : undefined;

  const metadados = buildBryHubPrescriptionMetadados(params.prescriptionMetadata);

  const form = new FormData();
  let hasPdfMultipart = false;
  let pdfFieldName = '';
  let hashNonceSource: 'requestId' | 'randomUUID' | undefined;
  let hashesCount = 0;
  let cmsRequestPayload: Record<string, unknown>;

  if (target.mode === 'cms') {
    const built = buildHubIntegraCmsRequestPayload({
      integraUrl,
      signingToken,
      cmsInputMode,
      pdfBuffer: cmsInputMode === 'hashes' ? pdfBuffer : undefined,
      requestId: params.requestId,
    });
    cmsRequestPayload = built.cmsRequest;
    hashNonceSource = built.nonceSource;
    hashesCount = built.hashesCount;

    if (cmsInputMode === 'originalDocuments') {
      const hashEntry = buildBryHubCmsHashEntry({
        pdfBuffer,
        requestId: params.requestId,
      });
      hashNonceSource = hashEntry.nonceSource;
      const multipart = appendHubCmsOriginalDocumentHashFields(form, hashEntry);
      pdfFieldName = multipart.pdfFieldName;
      hasPdfMultipart = true;
    }
  } else {
    cmsRequestPayload = buildHubIntegraPdfBatchDadosAssinatura({ integraUrl, signingToken });
    const multipart = appendHubPdfBatchMultipartFields(form, pdfBuffer);
    pdfFieldName = multipart.pdfFieldName;
    hasPdfMultipart = true;
  }

  if (target.mode === 'cms') {
    const cmsJson = JSON.stringify(cmsRequestPayload);
    form.append(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD, cmsJson);
    form.append(BRY_HUB_CMS_REQUEST_FIELD, cmsJson);
  } else {
    form.append(BRY_HUB_PDF_BATCH_DADOS_ASSINATURA_FIELD, JSON.stringify(cmsRequestPayload));
  }
  form.append('metadados', JSON.stringify(metadados));

  if (target.mode === 'cms') {
    logBryCmsRequestAudit({
      endpoint: target.endpoint,
      cmsInputMode: cmsInputMode ?? 'hashes',
      pdfSizeBytes: pdfBuffer.length,
      hashAlgorithm: BRY_HUB_CMS_HASH_ALGORITHM,
      hashesCount,
      hasPdfMultipart,
      nonceSource: hashNonceSource,
      form,
    });
  }

  const res = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      kms_type: BRY_HUB_KMS_TYPE_INTEGRABRY,
      Accept: 'application/json',
    },
    body: form,
  });

  const rawText = await res.text().catch(() => '');
  let json: unknown = {};
  if (rawText.trim()) {
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      json = { parseError: true, length: rawText.length };
    }
  }

  const sanitizedBody = sanitizeBryApiResponseForLog(json);
  const logPrefix = `[bry_cloud] ${target.logTag}`;

  if (!res.ok) {
    const rawMsg =
      typeof json === 'object' && json
        ? pickString(json as Record<string, unknown>, ['message', 'error', 'error_description'])
        : undefined;
    let msg = rawMsg || `Falha ao assinar PDF no HUB BRy (${res.status}).`;
    if (res.status === 403 && /sem permissão/i.test(msg)) {
      msg =
        'Sem permissão para assinar PDF no HUB BRy com Integra PSC (403). Verifique no portal BRy Cloud se o HUB Signer está habilitado.';
    }

    console.error(`${logPrefix} error`, {
      httpStatus: res.status,
      kmsType: BRY_HUB_KMS_TYPE_INTEGRABRY,
      hubMode: target.mode,
      cmsInputMode: cmsInputMode ?? null,
      hasPdfMultipart,
      hashesCount,
      bryMessage: rawMsg,
      sanitizedBody,
      endpoint: target.endpoint,
    });

    throw new BryPdfSignError(msg, { httpStatus: res.status, sanitizedBody });
  }

  const signedPdfBase64 = extractSignedPdfBase64FromHubResponse(json);
  const record = (typeof json === 'object' && json ? json : {}) as Record<string, unknown>;
  const operationId = pickString(record, [
    'operationId',
    'operation_id',
    'id',
    'protocolo',
    'identificador',
  ]);
  const signedPdfUrl =
    pickString(record, ['signedPdfUrl', 'url', 'link', 'documentoAssinadoUrl']) ||
    extractSignedPdfUrlFromHubDocumentos(json);

  if (
    target.mode === 'cms' &&
    !signedPdfBase64 &&
    detectDetachedCmsInHubResponse(json)
  ) {
    console.error(`${logPrefix} error`, {
      httpStatus: res.status,
      kmsType: BRY_HUB_KMS_TYPE_INTEGRABRY,
      hubMode: target.mode,
      reason: 'detached_cms',
      sanitizedBody,
      endpoint: target.endpoint,
    });
    throw new BryPdfSignError(BRY_HUB_DETACHED_CMS_ERROR_MESSAGE, {
      httpStatus: res.status,
      sanitizedBody,
    });
  }

  console.info(`${logPrefix} ok`, {
    httpStatus: res.status,
    kmsType: BRY_HUB_KMS_TYPE_INTEGRABRY,
    hubMode: target.mode,
    cmsInputMode: cmsInputMode ?? null,
    hasPdfMultipart,
    hashesCount,
    hasSignedBase64: !!signedPdfBase64,
    sanitizedBody,
    endpoint: target.endpoint,
  });

  if (signedPdfBase64) {
    return {
      operationId,
      status: 'signed',
      signedPdfBase64,
      signedPdfUrl,
      externalSignatureId: operationId,
      raw: json,
    };
  }

  if (
    target.mode === 'cms' &&
    !signedPdfUrl &&
    detectDetachedCmsInHubResponse(json)
  ) {
    throw new BryPdfSignError(BRY_HUB_DETACHED_CMS_ERROR_MESSAGE, {
      httpStatus: res.status,
      sanitizedBody,
    });
  }

  console.warn(`${logPrefix} resposta sem PDF assinado embutido`, {
    hubMode: target.mode,
    sanitizedBody,
  });

  const status =
    pickString(record, ['status', 'situacao']) ||
    (signedPdfUrl ? 'signed' : 'pending_provider_authorization');

  return {
    operationId,
    status,
    signedPdfUrl,
    externalSignatureId: operationId,
    raw: json,
  };
}

/**
 * Assinatura HUB Integra PSC para prescrição — sempre PDF/PAdES.
 * Ignora `SIGNATURE_BRY_USE_CMS_KMS` (CMS não gera PDF assinado).
 */
export async function submitBryHubIntegraHubSignature(
  params: BryHubIntegraSignParams
): Promise<BryPdfSignResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const target = resolveHubPdfPadesSignTarget(config);
  if (isLegacyPdfBatchEnvExplicitlyDisabled()) {
    console.warn(
      '[bry_hub_sign] SIGNATURE_BRY_USE_LEGACY_PDF_BATCH=false no Vercel — ignorado; prescrição usa PDF/PAdES'
    );
  }
  if (shouldUseCmsKmsHub()) {
    console.warn(
      '[bry_hub_sign] SIGNATURE_BRY_USE_CMS_KMS está ativo mas prescrição usa PDF/PAdES (cms ignorado)'
    );
  }
  return submitBryHubIntegraSignatureInternal({
    ...params,
    config,
    mode: target.mode,
    endpoint: target.endpoint,
  });
}

/** CMS/KMS — CAdES destacado; apenas testes ou integrações não-PDF. */
export async function submitBryHubIntegraCmsHubSignature(
  params: BryHubIntegraSignParams
): Promise<BryPdfSignResult> {
  const config = params.config ?? getBryCloudEnvConfig();
  const target = resolveHubCmsKmsSignTarget(config);
  return submitBryHubIntegraSignatureInternal({
    ...params,
    config,
    mode: target.mode,
    endpoint: target.endpoint,
  });
}

/** Alias explícito de PDF/PAdES — mesmo que `submitBryHubIntegraHubSignature`. */
export async function submitBryHubIntegraPdfBatchSignature(
  params: BryHubIntegraSignParams
): Promise<BryPdfSignResult> {
  return submitBryHubIntegraHubSignature(params);
}
