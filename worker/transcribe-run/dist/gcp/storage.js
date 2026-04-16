"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadToFile = downloadToFile;
exports.uploadFromFile = uploadFromFile;
exports.uploadFromBuffer = uploadFromBuffer;
exports.parseGcsUri = parseGcsUri;
exports.checkIfAlreadyProcessed = checkIfAlreadyProcessed;
const storage_1 = require("@google-cloud/storage");
const auth_1 = require("./auth");
const fs_1 = __importDefault(require("fs"));
let _storage = null;
function getStorage() {
    if (_storage)
        return _storage;
    const { projectId, credentials } = (0, auth_1.getGcpCredentials)();
    if (credentials != null) {
        _storage = new storage_1.Storage({
            projectId,
            credentials: {
                client_email: credentials.client_email,
                private_key: credentials.private_key,
            },
        });
    }
    else {
        _storage = new storage_1.Storage({ projectId });
    }
    return _storage;
}
/**
 * Download autenticado do GCS para arquivo local.
 */
async function downloadToFile(bucket, objectName, localPath) {
    console.log(`[storage] Downloading gs://${bucket}/${objectName} -> ${localPath}`);
    const storage = getStorage();
    await storage.bucket(bucket).file(objectName).download({ destination: localPath });
    console.log(`[storage] Downloaded ok: ${localPath}`);
}
/**
 * Upload de arquivo local para GCS (autenticado, não público).
 */
async function uploadFromFile(bucket, objectName, localPath) {
    console.log(`[storage] Uploading ${localPath} -> gs://${bucket}/${objectName}`);
    const storage = getStorage();
    await storage
        .bucket(bucket)
        .file(objectName)
        .save(fs_1.default.createReadStream(localPath), {
        contentType: 'audio/wav',
    });
    console.log(`[storage] Uploaded ok: gs://${bucket}/${objectName}`);
}
/**
 * Salva Buffer ou string no GCS (UTF-8).
 */
async function uploadFromBuffer(bucket, objectName, data, contentType) {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
    const ct = contentType ?? (objectName.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
    console.log(`[storage] Saving gs://${bucket}/${objectName} (${buf.length} bytes)`);
    const storage = getStorage();
    await storage.bucket(bucket).file(objectName).save(buf, { contentType: ct });
    console.log(`[storage] Saved ok: gs://${bucket}/${objectName}`);
}
/** Extrai bucket e objectName de gs://bucket/path */
function parseGcsUri(uri) {
    const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
    if (!match)
        throw new Error(`URI GCS inválida: ${uri}`);
    return { bucket: match[1], objectName: match[2] };
}
/**
 * Verifica se o arquivo WAV de destino já existe no GCS.
 */
async function checkIfAlreadyProcessed(bucket, objectName) {
    const storage = getStorage();
    const file = storage.bucket(bucket).file(objectName);
    const [exists] = await file.exists();
    return exists;
}
