import { describe, expect, it } from 'vitest';
import {
  createBryOAuthStatePayload,
  signBryOAuthState,
  verifyBryOAuthState,
} from '@/lib/signature/providers/bryCloudOAuthState';

describe('bryCloudOAuthState', () => {
  it('assina e valida state', () => {
    const payload = createBryOAuthStatePayload('med-1', 'https://app/metaadmin');
    const state = signBryOAuthState(payload, 'test-secret');
    const verified = verifyBryOAuthState(state, 'test-secret');
    expect(verified?.medicoId).toBe('med-1');
    expect(verified?.returnUrl).toBe('https://app/metaadmin');
  });

  it('rejeita secret incorreto', () => {
    const state = signBryOAuthState(createBryOAuthStatePayload('med-1'), 'a');
    expect(verifyBryOAuthState(state, 'b')).toBeNull();
  });
});
