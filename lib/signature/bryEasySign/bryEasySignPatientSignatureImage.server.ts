import { getBryEasySignConfig } from '@/lib/signature/bryEasySign/bryEasySignConfig';
import {
  fetchBryEasySignSignerByNonce,
  resolveBryEasySignPatientSignerNonce,
} from '@/lib/signature/bryEasySign/bryEasySignPatientEvidence.server';
import { signersFromStatusPayload } from '@/lib/signature/bryEasySign/bryEasySignSignerPayload';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function decodeBase64Image(value: string): Uint8Array | null {
  const trimmed = value.trim();
  const base64 = trimmed.includes(',') ? trimmed.split(',').pop()! : trimmed;
  if (!base64 || base64.length < 80) return null;
  try {
    const buf = Buffer.from(base64, 'base64');
    return buf.length ? new Uint8Array(buf) : null;
  } catch {
    return null;
  }
}

const IMAGE_FIELD_KEYS = [
  'image',
  'signatureImage',
  'rubrica',
  'rubricaImage',
  'visualSignature',
  'signature',
  'base64Image',
  'base64',
] as const;

function findBase64ImageInTree(root: unknown, depth = 0): Uint8Array | null {
  if (depth > 10) return null;

  if (typeof root === 'string') {
    const normalized = root.replace(/^data:image\/[a-z+]+;base64,/i, '').trim();
    if (normalized.length >= 80 && /^[A-Za-z0-9+/=\s]+$/.test(normalized)) {
      return decodeBase64Image(normalized);
    }
    return null;
  }

  const rec = asRecord(root);
  if (!rec) {
    if (Array.isArray(root)) {
      for (const item of root) {
        const found = findBase64ImageInTree(item, depth + 1);
        if (found?.length) return found;
      }
    }
    return null;
  }

  for (const key of IMAGE_FIELD_KEYS) {
    const v = rec[key];
    if (typeof v === 'string') {
      const decoded = decodeBase64Image(v);
      if (decoded?.length) return decoded;
    }
  }

  for (const value of Object.values(rec)) {
    const found = findBase64ImageInTree(value, depth + 1);
    if (found?.length) return found;
  }

  return null;
}

function collectImageNonces(root: unknown, out: Set<string>, depth = 0): void {
  if (depth > 8) return;
  const rec = asRecord(root);
  if (!rec) {
    if (Array.isArray(root)) {
      for (const item of root) collectImageNonces(item, out, depth + 1);
    }
    return;
  }

  const nonce = asString(rec.imageNonce);
  if (nonce) out.add(nonce);

  for (const value of Object.values(rec)) {
    if (Array.isArray(value) || (value && typeof value === 'object')) {
      collectImageNonces(value, out, depth + 1);
    }
  }
}

async function fetchJson(
  url: string,
  accessToken: string
): Promise<Record<string, unknown> | unknown[]> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[easysign] signature_image_fetch_failed', {
      url: url.replace(/signatures\/[^/]+/, 'signatures/:id'),
      httpStatus: res.status,
    });
    return {};
  }
  return data as Record<string, unknown> | unknown[];
}

async function fetchImageBytesByNonce(
  envelopeId: string,
  imageNonce: string,
  accessToken: string,
  baseUrl: string
): Promise<Uint8Array | null> {
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(
    envelopeId
  )}/images/${encodeURIComponent(imageNonce)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return null;

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('json')) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const fromJson = findBase64ImageInTree(data);
    if (fromJson?.length) return fromJson;
    return null;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length ? new Uint8Array(buf) : null;
}

/**
 * Obtém a rubrica visual do paciente na BRy EasySign (PNG/JPG em base64 ou binário).
 */
export async function fetchBryEasySignPatientSignatureImageBytes(args: {
  envelopeId: string;
  documentUuid: string;
  signerNonce?: string | null;
}): Promise<Uint8Array | undefined> {
  const envelopeId = args.envelopeId.trim();
  const documentUuid = args.documentUuid.trim();
  if (!envelopeId || !documentUuid) return undefined;

  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const signerNonce = await resolveBryEasySignPatientSignerNonce(envelopeId, args.signerNonce);

  const [signerPayload, envelopePayload, positionsPayload, documentPayload] = await Promise.all([
    signerNonce
      ? fetchBryEasySignSignerByNonce(envelopeId, signerNonce)
      : Promise.resolve({} as Record<string, unknown>),
    fetchJson(
      `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId)}`,
      accessToken
    ),
    fetchJson(
      `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(
        envelopeId
      )}/documents/${encodeURIComponent(documentUuid)}/signaturePositions`,
      accessToken
    ),
    fetchJson(
      `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(
        envelopeId
      )}/documents/${encodeURIComponent(documentUuid)}`,
      accessToken
    ),
  ]);

  const fromSigner = findBase64ImageInTree(signerPayload);
  if (fromSigner?.length) return fromSigner;

  const fromDocument = findBase64ImageInTree(documentPayload);
  if (fromDocument?.length) return fromDocument;

  const fromPositions = findBase64ImageInTree(positionsPayload);
  if (fromPositions?.length) return fromPositions;

  const envelopeRec = asRecord(envelopePayload);
  const fromEnvelope = findBase64ImageInTree(envelopeRec?.images ?? envelopePayload);
  if (fromEnvelope?.length) return fromEnvelope;

  const imageNonces = new Set<string>();
  collectImageNonces(positionsPayload, imageNonces);
  collectImageNonces(envelopeRec?.images, imageNonces);
  collectImageNonces(signerPayload, imageNonces);

  const statusPayload = await fetchJson(
    `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId)}/status`,
    accessToken
  );
  const statusSigner =
    signersFromStatusPayload(asRecord(statusPayload) || {}).find(
      (s) => asString(s.signerNonce) === signerNonce
    ) || signersFromStatusPayload(asRecord(statusPayload) || {})[0];
  if (statusSigner) {
    const fromStatusSigner = findBase64ImageInTree(statusSigner);
    if (fromStatusSigner?.length) return fromStatusSigner;
    collectImageNonces(statusSigner, imageNonces);
  }

  for (const imageNonce of imageNonces) {
    const bytes = await fetchImageBytesByNonce(envelopeId, imageNonce, accessToken, baseUrl);
    if (bytes?.length) return bytes;
  }

  console.warn('[easysign] signature_image_not_found', {
    envelopeId,
    documentUuid,
    signerNonce: signerNonce || undefined,
    imageNonceCount: imageNonces.size,
  });
  return undefined;
}
