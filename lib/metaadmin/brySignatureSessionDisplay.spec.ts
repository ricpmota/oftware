import { describe, expect, it } from 'vitest';
import { resolveBrySignatureSessionDisplay } from '@/lib/metaadmin/brySignatureSessionDisplay';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

describe('resolveBrySignatureSessionDisplay', () => {
  it('retorna sessão ativa com contadores', () => {
    const conn: DoctorSignatureProviderConnection = {
      provider: 'bry_cloud',
      status: 'connected',
      signatureSessionScope: 'signature_session',
      signatureSessionMaxDocuments: 50,
      signatureSessionUsedDocuments: 3,
      signatureSessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const d = resolveBrySignatureSessionDisplay(conn);
    expect(d?.active).toBe(true);
    expect(d?.usedDocuments).toBe(3);
    expect(d?.maxDocuments).toBe(50);
  });

  it('marca expirada por cota', () => {
    const conn: DoctorSignatureProviderConnection = {
      provider: 'bry_cloud',
      status: 'connected',
      signatureSessionScope: 'signature_session',
      signatureSessionMaxDocuments: 50,
      signatureSessionUsedDocuments: 50,
      signatureSessionExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    expect(resolveBrySignatureSessionDisplay(conn)?.expired).toBe(true);
  });
});
