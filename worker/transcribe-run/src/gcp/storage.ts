import { Storage } from '@google-cloud/storage';
import { getGcpCredentials } from './auth';
import fs from 'fs';

let _storage: Storage | null = null;

function getStorage(): Storage {
  if (_storage) return _storage;
  const { projectId, credentials } = getGcpCredentials();
  if (credentials != null) {
    _storage = new Storage({
      projectId,
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
    });
  } else {
    _storage = new Storage({ projectId });
  }
  return _storage;
}

/**
 * Download autenticado do GCS para arquivo local.
 */
export async function downloadToFile(
  bucket: string,
  objectName: string,
  localPath: string
): Promise<void> {
  console.log(`[storage] Downloading gs://${bucket}/${objectName} -> ${localPath}`);
  const storage = getStorage();
  await storage.bucket(bucket).file(objectName).download({ destination: localPath });
  console.log(`[storage] Downloaded ok: ${localPath}`);
}

/**
 * Upload de arquivo local para GCS (autenticado, não público).
 */
export async function uploadFromFile(
  bucket: string,
  objectName: string,
  localPath: string
): Promise<void> {
  console.log(`[storage] Uploading ${localPath} -> gs://${bucket}/${objectName}`);
  const storage = getStorage();
  await storage
    .bucket(bucket)
    .file(objectName)
    .save(fs.createReadStream(localPath), {
      contentType: 'audio/wav',
    });
  console.log(`[storage] Uploaded ok: gs://${bucket}/${objectName}`);
}

/**
 * Salva Buffer ou string no GCS (UTF-8).
 */
export async function uploadFromBuffer(
  bucket: string,
  objectName: string,
  data: Buffer | string,
  contentType?: string
): Promise<void> {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const ct = contentType ?? (objectName.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
  console.log(`[storage] Saving gs://${bucket}/${objectName} (${buf.length} bytes)`);
  const storage = getStorage();
  await storage.bucket(bucket).file(objectName).save(buf, { contentType: ct });
  console.log(`[storage] Saved ok: gs://${bucket}/${objectName}`);
}

/** Extrai bucket e objectName de gs://bucket/path */
export function parseGcsUri(uri: string): { bucket: string; objectName: string } {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`URI GCS inválida: ${uri}`);
  return { bucket: match[1], objectName: match[2] };
}

/**
 * Verifica se o arquivo WAV de destino já existe no GCS.
 */
export async function checkIfAlreadyProcessed(
  bucket: string,
  objectName: string
): Promise<boolean> {
  const storage = getStorage();
  const file = storage.bucket(bucket).file(objectName);
  const [exists] = await file.exists();
  return exists;
}
