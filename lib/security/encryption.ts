import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/** Server-only — não importar em componentes client. */
const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

export class EncryptionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionConfigError';
  }
}

export class SecretDecryptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecretDecryptError';
  }
}

function parseEncryptionKey(raw: string): Buffer {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new EncryptionConfigError('SIGNATURE_TOKEN_ENCRYPTION_KEY não configurada.');
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed)) {
    const key = Buffer.from(trimmed, 'hex');
    if (key.length !== KEY_BYTES) {
      throw new EncryptionConfigError(
        'SIGNATURE_TOKEN_ENCRYPTION_KEY (hex) deve representar exatamente 32 bytes.'
      );
    }
    return key;
  }

  const key = Buffer.from(trimmed, 'base64');
  if (key.length !== KEY_BYTES) {
    throw new EncryptionConfigError(
      'SIGNATURE_TOKEN_ENCRYPTION_KEY (base64) deve representar exatamente 32 bytes.'
    );
  }
  return key;
}

function getEncryptionKey(): Buffer {
  return parseEncryptionKey(process.env.SIGNATURE_TOKEN_ENCRYPTION_KEY || '');
}

export function isTokenEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/** Criptografa com AES-256-GCM. Formato: `v1:iv:authTag:ciphertext` (base64url). */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new SecretDecryptError('Valor vazio não pode ser criptografado.');
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

/** Descriptografa payload gerado por {@link encryptSecret}. */
export function decryptSecret(payload: string): string {
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new SecretDecryptError('Formato de secret inválido.');
  }

  const [, ivPart, authTagPart, ciphertextPart] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivPart, 'base64url');
  const authTag = Buffer.from(authTagPart, 'base64url');
  const ciphertext = Buffer.from(ciphertextPart, 'base64url');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  try {
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString('utf8');
  } catch {
    throw new SecretDecryptError('Falha ao descriptografar secret.');
  }
}
