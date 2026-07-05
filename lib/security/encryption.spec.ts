import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  decryptSecret,
  encryptSecret,
  EncryptionConfigError,
  isTokenEncryptionConfigured,
} from '@/lib/security/encryption';

const TEST_KEY_B64 = Buffer.alloc(32, 7).toString('base64');
const TEST_KEY_HEX = Buffer.alloc(32, 9).toString('hex');

describe('encryption', () => {
  beforeEach(() => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', TEST_KEY_B64);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('encrypt/decrypt round-trip (base64 key)', () => {
    const plain = 'eyJhbGciOiJSUzI1NiJ9.test-token';
    const enc = encryptSecret(plain);
    expect(enc.startsWith('v1:')).toBe(true);
    expect(enc.split(':')).toHaveLength(4);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it('aceita chave hex de 32 bytes', () => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', TEST_KEY_HEX);
    const enc = encryptSecret('refresh-xyz');
    expect(decryptSecret(enc)).toBe('refresh-xyz');
  });

  it('falha sem env', () => {
    vi.stubEnv('SIGNATURE_TOKEN_ENCRYPTION_KEY', '');
    expect(isTokenEncryptionConfigured()).toBe(false);
    expect(() => encryptSecret('x')).toThrow(EncryptionConfigError);
  });

  it('rejeita payload inválido', () => {
    expect(() => decryptSecret('v2:a:b:c')).toThrow();
  });
});
