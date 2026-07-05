import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BRY_PSC_GENERIC_CONNECT_ERROR,
  resolveBryConnectAdapterProviderId,
  resolveBryPscNameForConnect,
  resolveBryPscNameFromProvider,
} from '@/lib/signature/providers/bryPscNameMap';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

describe('resolveBryPscNameFromProvider', () => {
  it('provider safeid → SafeID', () => {
    expect(resolveBryPscNameFromProvider('safeid')).toBe('SafeID');
  });

  it('provider vidaas → Vidaas', () => {
    expect(resolveBryPscNameFromProvider('vidaas')).toBe('Vidaas');
  });

  it('provider birdid → BirdID', () => {
    expect(resolveBryPscNameFromProvider('birdid')).toBe('BirdID');
  });

  it('provider remoteid → RemoteID', () => {
    expect(resolveBryPscNameFromProvider('remoteid')).toBe('RemoteID');
  });

  it('provider neoid → SerproID', () => {
    expect(resolveBryPscNameFromProvider('neoid')).toBe('SerproID');
  });

  it('provider bry_cloud genérico → null', () => {
    expect(resolveBryPscNameFromProvider('bry_cloud')).toBeNull();
  });
});

describe('resolveBryPscNameForConnect — todos os PSCs', () => {
  it('provider syn → Syn', () => {
    expect(resolveBryPscNameFromProvider('syn')).toBe('Syn');
  });

  it('provider dscloud → DS Cloud', () => {
    expect(resolveBryPscNameFromProvider('dscloud')).toBe('DS Cloud');
  });
});

describe('resolveBryPscNameForConnect', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('provider bry_cloud genérico → erro pedindo PSC específico', () => {
    expect(() => resolveBryPscNameForConnect('bry_cloud')).toThrow(BRY_PSC_GENERIC_CONNECT_ERROR);
  });

  it('SIGNATURE_BRY_PSC_NAME não sobrescreve provider do médico', () => {
    vi.stubEnv('SIGNATURE_BRY_PSC_NAME', 'BirdID');
    vi.stubEnv('SIGNATURE_BRY_PSC_ENV_FALLBACK', 'true');
    expect(resolveBryPscNameForConnect('safeid')).toBe('SafeID');
  });

  it('resolveBryConnectAdapterProviderId mapeia PSC para bry_cloud', () => {
    expect(resolveBryConnectAdapterProviderId('vidaas')).toBe(BRY_CLOUD_PROVIDER_ID);
  });
});
