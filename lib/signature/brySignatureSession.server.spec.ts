import { describe, expect, it } from 'vitest';
import {
  applyNewSignatureSessionToConnection,
  BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
  clearSignatureSessionSigningCredentials,
  isBryOperationExpiredOrCompletedError,
  isSignatureSessionQuotaExceeded,
  isSignatureSessionTimeExpired,
  validateSignatureSessionForSigning,
} from '@/lib/signature/brySignatureSession.server';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

describe('brySignatureSession.server', () => {
  it('applyNewSignatureSessionToConnection define escopo e cotas', () => {
    const conn: DoctorSignatureProviderConnection = {
      provider: 'bry_cloud',
      status: 'connected',
    };
    applyNewSignatureSessionToConnection(conn, {
      pscScope: 'signature_session',
      pscAuthLifetimeSec: 604800,
      pscNumberOfDocuments: 50,
    });
    expect(conn.signatureSessionScope).toBe('signature_session');
    expect(conn.signatureSessionMaxDocuments).toBe(50);
    expect(conn.signatureSessionUsedDocuments).toBe(0);
    expect(conn.signatureSessionExpiresAt).toBeTruthy();
  });

  it('validateSignatureSessionForSigning bloqueia sessão expirada ou esgotada', () => {
    const expired: DoctorSignatureProviderConnection = {
      provider: 'bry_cloud',
      status: 'connected',
      integraBrySigningTokenEncrypted: 'enc',
      signatureSessionScope: 'signature_session',
      signatureSessionMaxDocuments: 50,
      signatureSessionUsedDocuments: 50,
      signatureSessionExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    };
    expect(isSignatureSessionQuotaExceeded(expired)).toBe(true);
    expect(validateSignatureSessionForSigning(expired)).toEqual({
      ok: false,
      message: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
    });

    const past: DoctorSignatureProviderConnection = {
      ...expired,
      signatureSessionUsedDocuments: 0,
      signatureSessionExpiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    expect(isSignatureSessionTimeExpired(past)).toBe(true);
    expect(validateSignatureSessionForSigning(past).ok).toBe(false);
  });

  it('clearSignatureSessionSigningCredentials remove token e marca esgotado', () => {
    const conn: DoctorSignatureProviderConnection = {
      provider: 'bry_cloud',
      status: 'connected',
      integraBrySigningTokenEncrypted: 'enc',
      signatureSessionMaxDocuments: 50,
      signatureSessionUsedDocuments: 2,
    };
    clearSignatureSessionSigningCredentials(conn);
    expect(conn.integraBrySigningTokenEncrypted).toBeUndefined();
    expect(conn.signatureSessionUsedDocuments).toBe(50);
  });

  it('isBryOperationExpiredOrCompletedError detecta mensagem BRy', () => {
    expect(
      isBryOperationExpiredOrCompletedError(
        new Error('operation for id not found, it is expired or completed')
      )
    ).toBe(true);
  });
});
