/**
 * Localização de PDFs Oftreview no GCS — uso server-side (rotas novas).
 * Não altera list-apostilas nem apostila-signed-url.
 */

import path from 'path';
import fs from 'fs';
import { Storage, type File } from '@google-cloud/storage';

interface GCPCredentials {
  project_id?: string;
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
}

export const OFTREVIEW_APOSTILAS_GCS_PREFIX = 'OFTREVIEW 2023/APOSTILAS/';

function normalizePrivateKey(creds: GCPCredentials): GCPCredentials {
  if (typeof creds.private_key === 'string') {
    return { ...creds, private_key: creds.private_key.replace(/\\n/g, '\n') };
  }
  return creds;
}

export function getGcsCredentials(): GCPCredentials | null {
  const envJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (envJson) {
    try {
      return normalizePrivateKey(JSON.parse(envJson) as GCPCredentials);
    } catch (e) {
      console.error('[gcsOftreviewApostila] credentials JSON parse error:', e);
      return null;
    }
  }
  const relPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'oftpay', 'gen-lang-client-0723351594-1970dd124eb0.json');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
  try {
    return normalizePrivateKey(JSON.parse(fs.readFileSync(absPath, 'utf8')) as GCPCredentials);
  } catch {
    return null;
  }
}

export function normalizeApostilaTitleForMatch(name: string): string {
  return name
    .replace(/\.(pdf|cdr)$/i, '')
    .trim()
    .toLowerCase();
}

export async function findOftreviewApostilaPdfFile(
  apostilaTitulo: string
): Promise<{ file: File; storagePath: string; bucketName: string } | null> {
  const bucketName = process.env.OFTPAY_GCS_BUCKET;
  if (!bucketName) return null;

  const credentials = getGcsCredentials();
  if (!credentials) return null;

  const storage = new Storage({ credentials });
  const bucket = storage.bucket(bucketName);
  const [allFiles] = await bucket.getFiles({ prefix: OFTREVIEW_APOSTILAS_GCS_PREFIX, autoPaginate: true });
  const pdfFiles = allFiles.filter((f) => path.extname(f.name).toLowerCase() === '.pdf');
  const normalizedTitle = normalizeApostilaTitleForMatch(apostilaTitulo);

  for (const file of pdfFiles) {
    const fileName = path.basename(file.name);
    const baseName = fileName.replace(/\.pdf$/i, '');
    const normalizedBase = normalizeApostilaTitleForMatch(baseName);
    if (
      normalizedBase === normalizedTitle ||
      normalizedBase.includes(normalizedTitle) ||
      normalizedTitle.includes(normalizedBase)
    ) {
      return { file, storagePath: file.name, bucketName };
    }
  }

  return null;
}

export async function downloadGcsFile(file: File): Promise<Buffer> {
  const [buffer] = await file.download();
  return buffer;
}
