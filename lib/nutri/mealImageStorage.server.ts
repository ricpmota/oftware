/**
 * Upload GCS das fotos de prato — prefixo cardapio/, bucket oftware.
 * Signed URL só a partir de gcsPath já lido no Firestore (nunca path arbitrário do client).
 * Objetos privados (sem ACL pública). Cleanup de versões antigas/órfãos NÃO é feito nesta etapa.
 */

import { downloadToBuffer, getFile } from '@/lib/gcp/storage';

/** Mesmo TTL do ChatNutri (~1h). Objeto permanece privado. */
export const MEAL_IMAGE_SIGNED_URL_TTL_MS = 60 * 60 * 1000;

function extFromMime(mimeType: string): string {
  const m = mimeType.toLowerCase().split(';')[0].trim();
  if (m === 'image/jpeg' || m === 'image/jpg') return 'jpg';
  if (m === 'image/webp') return 'webp';
  if (m === 'image/png') return 'png';
  return 'png';
}

function safePathPart(value: string): string {
  const trimmed = value.trim();
  if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) {
    throw new Error('Identificador inválido para path GCS.');
  }
  return trimmed;
}

/** Path-safe, curto, sem PII. Novas gerações usam este id no objeto GCS. */
export function createMealImageGenerationId(now: Date = new Date()): string {
  const compact = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const rand = globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  return `${compact}-${rand}`;
}

/**
 * Path legado (ETAPAS 03–06): cardapio/{patient}/{refeicao}/{slot}/{sourceHash}.{ext}
 * Continua válido para leitura. Novos uploads não usam mais este formato.
 */
export function buildLegacyMealImageGcsPath(params: {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  mimeType: string;
}): string {
  const patientId = safePathPart(params.patientId);
  const refeicaoKey = safePathPart(params.refeicaoKey);
  const slotId = safePathPart(params.slotId);
  const sourceHash = safePathPart(params.sourceHash);
  const ext = extFromMime(params.mimeType);
  return `cardapio/${patientId}/${refeicaoKey}/${slotId}/${sourceHash}.${ext}`;
}

/** Novas imagens: cardapio/{patient}/{refeicao}/{slot}/{sourceHash}/{generationId}.{ext} */
export function buildMealImageGcsPath(params: {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  mimeType: string;
  generationId: string;
}): string {
  const patientId = safePathPart(params.patientId);
  const refeicaoKey = safePathPart(params.refeicaoKey);
  const slotId = safePathPart(params.slotId);
  const sourceHash = safePathPart(params.sourceHash);
  const generationId = safePathPart(params.generationId);
  const ext = extFromMime(params.mimeType);
  return `cardapio/${patientId}/${refeicaoKey}/${slotId}/${sourceHash}/${generationId}.${ext}`;
}

export async function uploadMealImageToGcs(params: {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  sourceHash: string;
  buffer: Buffer;
  mimeType: string;
  generationId?: string;
}): Promise<{ gcsPath: string; contentType: string }> {
  const contentType = params.mimeType.split(';')[0].trim().toLowerCase() || 'image/png';
  const generationId = params.generationId?.trim() || createMealImageGenerationId();
  const gcsPath = buildMealImageGcsPath({
    patientId: params.patientId,
    refeicaoKey: params.refeicaoKey,
    slotId: params.slotId,
    sourceHash: params.sourceHash,
    mimeType: contentType,
    generationId,
  });
  const file = await getFile(gcsPath);
  await file.save(params.buffer, {
    resumable: false,
    contentType,
    metadata: {
      contentType,
      cacheControl: 'private, max-age=31536000, immutable',
    },
  });
  return { gcsPath, contentType };
}

export function isMealImageGcsPathForPatient(gcsPath: string, patientId: string): boolean {
  const id = patientId.trim();
  const path = gcsPath.trim();
  if (!id || !path) return false;
  if (path.includes('..') || path.startsWith('/')) return false;
  return path.startsWith(`cardapio/${id}/`);
}

export async function signMealImageGcsPath(gcsPath: string, patientId: string): Promise<string> {
  if (!isMealImageGcsPathForPatient(gcsPath, patientId)) {
    throw new Error('Path GCS inválido para o cardápio deste paciente.');
  }
  const file = await getFile(gcsPath);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + MEAL_IMAGE_SIGNED_URL_TTL_MS,
  });
  return signedUrl;
}

function contentTypeFromMealImagePath(gcsPath: string): string {
  const lower = gcsPath.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/png';
}

/** Bytes do objeto GCS do prato — só path já validado para o paciente. */
export async function downloadMealImageBytes(
  gcsPath: string,
  patientId: string
): Promise<{ buffer: Buffer; contentType: string }> {
  if (!isMealImageGcsPathForPatient(gcsPath, patientId)) {
    throw new Error('Path GCS inválido para o cardápio deste paciente.');
  }
  const buffer = await downloadToBuffer(gcsPath);
  return { buffer, contentType: contentTypeFromMealImagePath(gcsPath) };
}
