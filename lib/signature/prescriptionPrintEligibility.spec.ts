import { describe, expect, it } from 'vitest';
import {
  getPrescriptionSignedPrintEligibility,
  isPrescriptionSignedPrintButtonEnabled,
  PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE,
} from '@/lib/signature/prescriptionPrintEligibility';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('getPrescriptionSignedPrintEligibility', () => {
  it('sem provedor conectado → bloqueado', () => {
    const r = getPrescriptionSignedPrintEligibility(null);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.message).toBe(PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE);
    }
  });

  it('safeid connected via BRy → botão habilitado e permitido', () => {
    const config = {
      provider: 'safeid',
      providerLabel: 'SafeID',
      providerCategory: 'cloud_certificate' as const,
      status: 'connected' as const,
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected' as const,
        pscProvider: 'safeid',
        pscName: 'SafeID',
        accessTokenEncrypted: 'v1:iv:tag:cipher',
      },
    };
    expect(isPrescriptionSignedPrintButtonEnabled(config)).toBe(true);
    const r = getPrescriptionSignedPrintEligibility(config);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.mode).toBe('bry_cloud');
  });

  it('bry_cloud connected com PSC e token → botão habilitado e permitido', () => {
    const config = {
      provider: BRY_CLOUD_PROVIDER_ID,
      providerLabel: 'BRy Cloud',
      providerCategory: 'signature_platform' as const,
      status: 'connected' as const,
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected' as const,
        pscProvider: 'birdid',
        pscName: 'BirdID',
        accessTokenEncrypted: 'v1:iv:tag:cipher',
      },
    };
    expect(isPrescriptionSignedPrintButtonEnabled(config)).toBe(true);
    const r = getPrescriptionSignedPrintEligibility(config);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.mode).toBe('bry_cloud');
  });

  it('selected_pending_integration → botão assinado desabilitado', () => {
    const config = {
      provider: BRY_CLOUD_PROVIDER_ID,
      providerLabel: 'BRy Cloud',
      providerCategory: 'signature_platform' as const,
      status: 'selected_pending_integration' as const,
    };
    expect(isPrescriptionSignedPrintButtonEnabled(config)).toBe(false);
    const r = getPrescriptionSignedPrintEligibility(config);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.message).toBe(PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE);
  });

  it('not_configured → botão assinado desabilitado', () => {
    expect(isPrescriptionSignedPrintButtonEnabled(null)).toBe(false);
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'none',
      providerLabel: 'Nenhum',
      providerCategory: 'none',
      status: 'not_configured',
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.message).toBe(PRESCRIPTION_PRINT_PROFILE_SETUP_MESSAGE);
  });

  it('bry_cloud genérico sem PSC → bloqueado', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: BRY_CLOUD_PROVIDER_ID,
      providerLabel: 'BRy Cloud',
      providerCategory: 'signature_platform',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        accessTokenEncrypted: 'v1:iv:tag:cipher',
      },
    });
    expect(r.allowed).toBe(false);
  });

  it('bry_cloud conectado sem tokens no cliente → permitido (validação no servidor)', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'remoteid',
      providerLabel: 'RemoteID',
      providerCategory: 'cloud_certificate',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'remoteid',
        pscName: 'RemoteID',
      },
    });
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.mode).toBe('bry_cloud');
  });

  it('bry_cloud com sessão expirada → permitido + reconnect recomendado', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'remoteid',
      providerLabel: 'RemoteID',
      providerCategory: 'cloud_certificate',
      status: 'connected',
      connection: {
        provider: BRY_CLOUD_PROVIDER_ID,
        status: 'connected',
        pscProvider: 'remoteid',
        signatureSessionScope: 'signature_session',
        signatureSessionMaxDocuments: 50,
        signatureSessionUsedDocuments: 50,
        signatureSessionExpiresAt: new Date(0).toISOString(),
      },
    });
    expect(r.allowed).toBe(true);
    if (r.allowed && r.mode === 'bry_cloud') {
      expect(r.sessionReconnectRecommended).toBe(true);
    }
  });

  it('provider real connected → integração indisponível', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'connected',
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.message).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
    }
  });

  it('sandbox_mock connected → botão habilitado e permitido', () => {
    const config = {
      provider: 'sandbox_mock',
      providerLabel: 'Sandbox',
      providerCategory: 'sandbox' as const,
      status: 'connected' as const,
    };
    expect(isPrescriptionSignedPrintButtonEnabled(config)).toBe(true);
    const r = getPrescriptionSignedPrintEligibility(config);
    expect(r.allowed).toBe(true);
    if (r.allowed) expect(r.mode).toBe('sandbox');
  });

  it('provider real connected → botão habilitado, clique indisponível', () => {
    const config = {
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform' as const,
      status: 'connected' as const,
    };
    expect(isPrescriptionSignedPrintButtonEnabled(config)).toBe(true);
    const r = getPrescriptionSignedPrintEligibility(config);
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.message).toBe(NON_SANDBOX_PROVIDER_SIGNATURE_ERROR);
  });

  it('token físico A3 → bloqueado (apenas nuvem)', () => {
    const r = getPrescriptionSignedPrintEligibility({
      provider: 'token_a3',
      providerLabel: 'Token físico A3',
      providerCategory: 'physical_certificate',
      status: 'connected',
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.message).toBe(CLOUD_ONLY_SIGNATURE_ERROR);
    }
  });

  it('recibo → assinatura desabilitada', () => {
    const r = getPrescriptionSignedPrintEligibility(
      {
        provider: 'sandbox_mock',
        providerLabel: 'Sandbox',
        providerCategory: 'sandbox',
        status: 'connected',
      },
      { isRecibo: true }
    );
    expect(r.allowed).toBe(false);
  });
});
