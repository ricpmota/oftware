import { describe, expect, it } from 'vitest';
import {
  canConnectSignatureProvider,
  doctorSignatureProviderFormFromStored,
  getDoctorSignatureProviderGroups,
  isPhysicalCertificateProvider,
  isProviderSelectableInProfile,
  isSandboxMockProvider,
  findDoctorSignatureProviderOption,
  LEGACY_PHYSICAL_SIGNATURE_PROVIDER_OPTIONS,
  SIGNATURE_CONNECT_LEGACY_PROVIDER_MESSAGE,
} from '@/lib/metaadmin/doctorSignatureProviders';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';

describe('isSandboxMockProvider', () => {
  it('identifica sandbox_mock', () => {
    expect(isSandboxMockProvider('sandbox_mock')).toBe(true);
    expect(isSandboxMockProvider('vidaas')).toBe(false);
    expect(isSandboxMockProvider('vidas_valid')).toBe(false);
    expect(isSandboxMockProvider(null)).toBe(false);
    expect(isSandboxMockProvider(undefined)).toBe(false);
    expect(isSandboxMockProvider('')).toBe(false);
  });
});

describe('cloud-only provider list', () => {
  it('exibe PSCs em nuvem e BRy Cloud no select', () => {
    const groups = getDoctorSignatureProviderGroups();
    const providers = groups.flatMap((g) => g.options.map((o) => o.provider));
    expect(providers).toContain('none');
    expect(providers).toContain('bry_cloud');
    expect(providers).toContain('vidaas');
    expect(providers).toContain('safeid');
    expect(providers).not.toContain('vidas_valid');
    expect(providers).not.toContain('clicksign');
    expect(providers).not.toContain('other');
    expect(groups.map((g) => g.groupLabel)).toContain('Certificado em nuvem (via BRy Cloud)');
  });

  it('não exibe grupo Certificado físico no select', () => {
    const groups = getDoctorSignatureProviderGroups();
    const labels = groups.map((g) => g.groupLabel);
    expect(labels).not.toContain('Certificado físico');
    const providers = groups.flatMap((g) => g.options.map((o) => o.provider));
    expect(providers).not.toContain('token_a3');
    expect(providers).not.toContain('cartao_a3');
  });

  it('resolve rótulo de PSC legado via catálogo interno', () => {
    expect(findDoctorSignatureProviderOption('vidas_valid')?.providerLabel).toBe('VIDaaS / Valid');
  });

  it('isProviderSelectableInProfile — PSC em nuvem e bry_cloud', () => {
    expect(isProviderSelectableInProfile('none')).toBe(true);
    expect(isProviderSelectableInProfile('bry_cloud')).toBe(true);
    expect(isProviderSelectableInProfile('vidaas')).toBe(true);
    expect(isProviderSelectableInProfile('safeid')).toBe(true);
    expect(isProviderSelectableInProfile('vidas_valid')).toBe(false);
    expect(isProviderSelectableInProfile('sandbox_mock')).toBe(false);
  });

  it('doctorSignatureProviderFormFromStored migra bry → bry_cloud', () => {
    const form = doctorSignatureProviderFormFromStored({
      provider: 'bry',
      providerLabel: 'Bry',
      providerCategory: 'signature_platform',
      status: 'selected_pending_integration',
    });
    expect(form.provider).toBe('bry_cloud');
  });

  it('canConnect bloqueia bry_cloud genérico sem PSC', () => {
    const r = canConnectSignatureProvider({
      provider: 'bry_cloud',
      customProviderName: '',
      customProviderUrl: '',
      customProviderNotes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('certificado em nuvem compatível');
  });

  it('canConnect permite PSC vidaas', () => {
    const r = canConnectSignatureProvider({
      provider: 'vidaas',
      customProviderName: '',
      customProviderUrl: '',
      customProviderNotes: '',
    });
    expect(r.ok).toBe(true);
  });

  it('doctorSignatureProviderFormFromStored usa connection.pscProvider', () => {
    const form = doctorSignatureProviderFormFromStored({
      provider: 'bry_cloud',
      providerLabel: 'BRy',
      providerCategory: 'signature_platform',
      status: 'connected',
      connection: {
        provider: 'bry_cloud',
        status: 'connected',
        pscProvider: 'safeid',
        pscName: 'SafeID',
      },
    });
    expect(form.provider).toBe('safeid');
  });

  it('mantém opções físicas apenas para compatibilidade (find)', () => {
    expect(findDoctorSignatureProviderOption('token_a3')).toEqual(
      LEGACY_PHYSICAL_SIGNATURE_PROVIDER_OPTIONS[0]
    );
    expect(isPhysicalCertificateProvider('cartao_a3')).toBe(true);
  });

  it('canConnect bloqueia token físico', () => {
    const r = canConnectSignatureProvider({
      provider: 'token_a3',
      customProviderName: '',
      customProviderUrl: '',
      customProviderNotes: '',
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(CLOUD_ONLY_SIGNATURE_ERROR);
  });
});
