import { afterEach, describe, expect, it, vi } from 'vitest';
import { connectDoctorSignatureProvider } from '@/lib/metaadmin/connectDoctorSignatureProvider';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import { NON_SANDBOX_PROVIDER_SIGNATURE_ERROR } from '@/lib/signature/sandboxSignatureConstants';
import { LACUNA_REST_PKI_PROVIDER_ID } from '@/types/signatureProviderAdapter';
import { SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';
import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';

const form = {
  provider: SANDBOX_MOCK_PROVIDER_ID,
  customProviderName: '',
  customProviderUrl: '',
  customProviderNotes: '',
};

describe('connectDoctorSignatureProvider', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sandbox conecta com status connected', async () => {
    const updateMedico = vi.fn().mockResolvedValue(undefined);
    const adapter: SignatureProviderAdapter = {
      providerId: SANDBOX_MOCK_PROVIDER_ID,
      startAuthorization: vi.fn().mockResolvedValue({
        ok: true,
        data: { connection: { provider: SANDBOX_MOCK_PROVIDER_ID, status: 'connected' } },
      }),
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };

    const r = await connectDoctorSignatureProvider(
      {
        providerId: SANDBOX_MOCK_PROVIDER_ID,
        form,
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
      },
      { getAdapter: () => adapter, updateMedico }
    );

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe('immediate');
      expect(r.config.status).toBe('connected');
      expect(r.config.provider).toBe('sandbox_mock');
    }
    expect(updateMedico).toHaveBeenCalledOnce();
  });

  it('token físico retorna erro cloud-only sem chamar adapter', async () => {
    const getAdapter = vi.fn();
    const r = await connectDoctorSignatureProvider(
      {
        providerId: 'token_a3',
        form: { ...form, provider: 'token_a3' },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
      },
      { getAdapter }
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(CLOUD_ONLY_SIGNATURE_ERROR);
    expect(getAdapter).not.toHaveBeenCalled();
  });

  it('lacuna não está disponível para conexão no Meu Perfil', async () => {
    const { getSignatureProviderAdapterClient } = await import(
      '@/lib/signature/providers/signatureProviderRegistry.client'
    );

    const r = await connectDoctorSignatureProvider(
      {
        providerId: LACUNA_REST_PKI_PROVIDER_ID,
        form: { ...form, provider: LACUNA_REST_PKI_PROVIDER_ID },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
      },
      { getAdapter: getSignatureProviderAdapterClient }
    );

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('certificado em nuvem');
    }
  });

  it('PSC legado vidas_valid mapeia para adapter bry_cloud com pscProvider vidaas', async () => {
    const startAuthorization = vi.fn().mockResolvedValue({
      ok: true,
      data: { authorizationUrl: 'https://psc.example/link' },
    });
    const adapter: SignatureProviderAdapter = {
      providerId: BRY_CLOUD_PROVIDER_ID,
      startAuthorization,
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };

    const r = await connectDoctorSignatureProvider(
      {
        providerId: 'vidas_valid',
        form: { ...form, provider: 'vidas_valid' },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
        authToken: 'token',
      },
      { getAdapter: () => adapter }
    );

    expect(r.ok).toBe(true);
    expect(startAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ pscProvider: 'vidaas' })
    );
  });

  it('safeid conecta via adapter bry_cloud com pscProvider', async () => {
    const startAuthorization = vi.fn().mockResolvedValue({
      ok: true,
      data: { authorizationUrl: 'https://psc.example/link' },
    });
    const adapter: SignatureProviderAdapter = {
      providerId: BRY_CLOUD_PROVIDER_ID,
      startAuthorization,
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };

    await connectDoctorSignatureProvider(
      {
        providerId: 'safeid',
        form: { ...form, provider: 'safeid' },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
        authToken: 'token',
      },
      { getAdapter: () => adapter }
    );

    expect(startAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ pscProvider: 'safeid' })
    );
  });

  it('alias bry (bry_cloud genérico) não conecta sem PSC', async () => {
    const getAdapter = vi.fn();
    const r = await connectDoctorSignatureProvider(
      {
        providerId: 'bry',
        form: { ...form, provider: 'bry' },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
        authToken: 'token',
      },
      { getAdapter }
    );

    expect(r.ok).toBe(false);
    expect(getAdapter).not.toHaveBeenCalled();
  });

  it('bry_cloud genérico não conecta sem PSC específico', async () => {
    const getAdapter = vi.fn();
    const r = await connectDoctorSignatureProvider(
      {
        providerId: BRY_CLOUD_PROVIDER_ID,
        form: { ...form, provider: BRY_CLOUD_PROVIDER_ID },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
        authToken: 'firebase-token',
      },
      { getAdapter }
    );
    expect(r.ok).toBe(false);
    expect(getAdapter).not.toHaveBeenCalled();
  });

  it('vidaas redireciona quando authorizationUrl é retornada', async () => {
    const startAuthorization = vi.fn().mockResolvedValue({
      ok: true,
      data: { authorizationUrl: 'https://psc.example/auth?state=abc' },
    });
    const adapter: SignatureProviderAdapter = {
      providerId: BRY_CLOUD_PROVIDER_ID,
      startAuthorization,
      submitPdfForSignature: vi.fn(),
      getSignatureStatus: vi.fn(),
      downloadSignedPdf: vi.fn(),
    };

    const r = await connectDoctorSignatureProvider(
      {
        providerId: 'vidaas',
        form: { ...form, provider: 'vidaas' },
        medicoId: 'med-1',
        timestamps: { updatedAt: new Date(), connectedAt: new Date() },
        authToken: 'firebase-token',
      },
      { getAdapter: () => adapter }
    );

    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.mode).toBe('redirect');
      expect(r.authorizationUrl).toContain('psc');
    }
    expect(startAuthorization).toHaveBeenCalledWith(
      expect.objectContaining({ pscProvider: 'vidaas' })
    );
  });

});
