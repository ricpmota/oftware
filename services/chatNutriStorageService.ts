/**
 * ChatNutri Storage - Upload de imagens para GCS (bucket oftware)
 * Reutiliza lib/gcp/storage.ts
 * Gera signed URL para exibição (bucket privado)
 */

import { randomUUID } from 'crypto';
import {
  uploadFromBuffer,
  getFile,
  gcsUri as buildGcsUri,
} from '@/lib/gcp/storage';

const SIGNED_URL_TTL_MS = 3600 * 1000; // 1 hora

function extFromContentType(contentType: string): string {
  const m = contentType.toLowerCase().match(/image\/(jpeg|jpg|png|webp)/);
  if (m) {
    if (m[1] === 'jpeg' || m[1] === 'jpg') return 'jpg';
    return m[1];
  }
  return 'jpg';
}

export interface UploadChatNutriImageResult {
  gcsPath: string;
  gsUri: string;
  signedUrl: string;
}

export async function uploadChatNutriImage({
  patientId,
  dateKey,
  fileBuffer,
  contentType,
}: {
  patientId: string;
  dateKey: string;
  fileBuffer: Buffer;
  contentType: string;
}): Promise<UploadChatNutriImageResult> {
  const ext = extFromContentType(contentType);
  const uuid = randomUUID();
  const gcsPath = `chatnutri/${patientId}/${dateKey}/${uuid}.${ext}`;

  await uploadFromBuffer(gcsPath, fileBuffer, contentType);

  const file = await getFile(gcsPath);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });

  return {
    gcsPath,
    gsUri: buildGcsUri(gcsPath),
    signedUrl,
  };
}

/** Upload sem paciente — análise só no chat (médico / preview). */
export async function uploadChatNutriAdhocImage({
  fileBuffer,
  contentType,
}: {
  fileBuffer: Buffer;
  contentType: string;
}): Promise<UploadChatNutriImageResult> {
  const ext = extFromContentType(contentType);
  const uuid = randomUUID();
  const gcsPath = `chatnutri/adhoc/${uuid}.${ext}`;

  await uploadFromBuffer(gcsPath, fileBuffer, contentType);

  const file = await getFile(gcsPath);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });

  return {
    gcsPath,
    gsUri: buildGcsUri(gcsPath),
    signedUrl,
  };
}

/**
 * Gera signed URL para um gcsPath existente (para exibir imagens já salvas).
 * Usado ao listar mensagens - URLs antigas expiram em ~10 min.
 */
export async function getSignedUrlForGcsPath(gcsPath: string): Promise<string> {
  const file = await getFile(gcsPath);
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
  });
  return signedUrl;
}
