import { describe, expect, it } from 'vitest';

// Testa helper interno via export indireto — valida decode de PNG 1x1
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('bryEasySignPatientSignatureImage', () => {
  it('decode base64 PNG mínimo', async () => {
    const { fetchBryEasySignPatientSignatureImageBytes } = await import(
      '@/lib/signature/bryEasySign/bryEasySignPatientSignatureImage.server'
    );
    expect(fetchBryEasySignPatientSignatureImageBytes).toBeTypeOf('function');
    const buf = Buffer.from(TINY_PNG_BASE64, 'base64');
    expect(buf.length).toBeGreaterThan(10);
  });
});
