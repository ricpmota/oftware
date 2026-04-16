import { Storage, Bucket, File } from '@google-cloud/storage';
import { getGcpCredentials } from './auth';
import fs from 'fs';

const BUCKET_NAME = process.env.GCS_BUCKET || 'oftware';

let _storageClient: Storage | null = null;

/**
 * Singleton: nunca cria Storage sem credenciais explícitas.
 * NUNCA usa publicUrl, storage.googleapis.com, fetch, axios.
 */
function getStorageClient(): Storage {
  if (_storageClient) return _storageClient;
  const { projectId, credentials } = getGcpCredentials();
  _storageClient = new Storage({
    projectId,
    credentials: {
      type: 'service_account',
      project_id: projectId,
      ...credentials,
    },
  });
  return _storageClient;
}

/** Reseta o singleton (útil para testes). */
export function _resetStorageClientForTesting(): void {
  _storageClient = null;
}

export async function listObjects(prefix: string): Promise<string[]> {
  const storage = getStorageClient();
  const bucket = storage.bucket(BUCKET_NAME);
  const [files] = await bucket.getFiles({ prefix, autoPaginate: true });
  return files.map((f) => f.name);
}

export async function getFile(name: string): Promise<File> {
  const storage = getStorageClient();
  return storage.bucket(BUCKET_NAME).file(name);
}

export async function exists(name: string): Promise<boolean> {
  const file = await getFile(name);
  const [ex] = await file.exists();
  return ex;
}

export async function downloadToBuffer(name: string): Promise<Buffer> {
  const storage = getStorageClient();
  const [buf] = await storage.bucket(BUCKET_NAME).file(name).download();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

/**
 * Download autenticado via @google-cloud/storage.
 * NUNCA usa URL pública ou fetch.
 */
export async function downloadToFile(objectName: string, localPath: string): Promise<void> {
  const storage = getStorageClient();
  await storage.bucket(BUCKET_NAME).file(objectName).download({ destination: localPath });
}

export async function uploadFromBuffer(
  name: string,
  data: Buffer | string,
  contentType?: string
): Promise<void> {
  const file = await getFile(name);
  await file.save(data, {
    contentType: contentType || (name.endsWith('.json') ? 'application/json' : 'text/plain'),
  });
}

export async function uploadFromFile(localPath: string, gcsName: string): Promise<void> {
  const file = await getFile(gcsName);
  await file.save(fs.createReadStream(localPath), {
    contentType: gcsName.endsWith('.wav') ? 'audio/wav' : undefined,
  });
}

export async function readJson<T>(name: string): Promise<T> {
  const buf = await downloadToBuffer(name);
  return JSON.parse(buf.toString('utf8')) as T;
}

export async function writeJson(name: string, data: unknown): Promise<void> {
  await uploadFromBuffer(name, JSON.stringify(data, null, 2));
}

export function getBucket(): string {
  return BUCKET_NAME;
}

export function gcsUri(name: string): string {
  return `gs://${BUCKET_NAME}/${name}`;
}

/**
 * Valida que o objeto pode ser lido com as credenciais atuais.
 * Se falhar, rethrow com mensagem clara.
 */
export async function assertCanReadObject(bucket: string, objectName: string): Promise<void> {
  const storage = getStorageClient();
  const file = storage.bucket(bucket).file(objectName);
  try {
    await file.getMetadata();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const raw = String(err);
    throw new Error(`assertCanReadObject failed: bucket=${bucket} objectName=${objectName} error=${msg} raw=${raw}`);
  }
}
