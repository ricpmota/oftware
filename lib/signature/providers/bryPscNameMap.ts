import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

/** IDs de provedor no perfil do médico (doctorSignatureProvider.provider). */
export const BRY_COMPATIBLE_PSC_PROVIDER_IDS = [
  'vidaas',
  'birdid',
  'safeid',
  'remoteid',
  'neoid',
  'syn',
  'dscloud',
] as const;

export type BryCompatiblePscProviderId = (typeof BRY_COMPATIBLE_PSC_PROVIDER_IDS)[number];

const LEGACY_PROVIDER_TO_PSC_ID: Record<string, BryCompatiblePscProviderId> = {
  vidas_valid: 'vidaas',
  bird_vaultid: 'birdid',
  safeid_safeweb: 'safeid',
  remote_certisign: 'remoteid',
  neoid_serpro: 'neoid',
  ds_cloud: 'dscloud',
};

export const BRY_PSC_GENERIC_CONNECT_ERROR =
  'Selecione um provedor de certificado em nuvem compatível antes de conectar.';

export const SIGNATURE_CONNECT_SELECT_PSC_MESSAGE =
  'Selecione seu provedor de certificado em nuvem (VIDaaS, BirdID, SafeID, etc.) para conectar via BRy Cloud.';

export function normalizeSignatureProviderId(provider?: string | null): string | null {
  return normalizeProviderKey(provider);
}

function normalizeProviderKey(provider?: string | null): string | null {
  const raw = provider?.trim().toLowerCase();
  if (!raw || raw === 'none') return null;
  if (raw in LEGACY_PROVIDER_TO_PSC_ID) {
    return LEGACY_PROVIDER_TO_PSC_ID[raw];
  }
  return raw;
}

export function isBryCompatiblePscProvider(provider?: string | null): boolean {
  const key = normalizeProviderKey(provider);
  if (!key) return false;
  return (BRY_COMPATIBLE_PSC_PROVIDER_IDS as readonly string[]).includes(key);
}

export function isBryCloudConnectProvider(provider?: string | null): boolean {
  const key = normalizeProviderKey(provider);
  if (!key) return false;
  if (isBryCompatiblePscProvider(key)) return true;
  return key === BRY_CLOUD_PROVIDER_ID || key === 'bry';
}

/** Adapter de conexão/assinatura BRy Integra. */
export function resolveBryConnectAdapterProviderId(provider?: string | null): string | null {
  if (isBryCompatiblePscProvider(provider)) return BRY_CLOUD_PROVIDER_ID;
  if (normalizeProviderKey(provider) === BRY_CLOUD_PROVIDER_ID) return BRY_CLOUD_PROVIDER_ID;
  if (normalizeProviderKey(provider) === 'bry') return BRY_CLOUD_PROVIDER_ID;
  return null;
}

export function resolveBryPscNameFromProvider(provider?: string | null): string | null {
  const key = normalizeProviderKey(provider);
  if (!key) return null;

  switch (key) {
    case 'vidaas':
      return 'Vidaas';
    case 'birdid':
      return 'BirdID';
    case 'safeid':
      return 'SafeID';
    case 'remoteid':
      return 'RemoteID';
    case 'neoid':
      return 'SerproID';
    case 'syn':
      return 'Syn';
    case 'dscloud':
      return 'DS Cloud';
    default:
      return null;
  }
}

function readDevEnvPscFallback(): string | null {
  if (process.env.NODE_ENV === 'production') return null;
  if (process.env.SIGNATURE_BRY_PSC_ENV_FALLBACK !== 'true') return null;
  const envName = process.env.SIGNATURE_BRY_PSC_NAME?.trim();
  return envName || null;
}

/**
 * PSC para POST /psc/link — prioriza a escolha do médico; env global só com fallback de dev explícito.
 */
export function resolveBryPscNameForConnect(provider?: string | null): string {
  const pscName = resolveBryPscNameFromProvider(provider);
  if (pscName) return pscName;

  const key = normalizeProviderKey(provider);
  if (key === BRY_CLOUD_PROVIDER_ID || key === 'bry') {
    throw new Error(BRY_PSC_GENERIC_CONNECT_ERROR);
  }

  const devFallback = readDevEnvPscFallback();
  if (devFallback) return devFallback;

  throw new Error(BRY_PSC_GENERIC_CONNECT_ERROR);
}

export function usesBryCloudSigning(providerConfig: {
  provider?: string;
  providerCategory?: string;
  connection?: { pscProvider?: string; pscName?: string } | null;
} | null | undefined): boolean {
  if (!providerConfig) return false;
  if (isBryCompatiblePscProvider(providerConfig.provider)) return true;
  if (providerConfig.providerCategory === 'cloud_certificate' && providerConfig.connection?.pscName) {
    return true;
  }
  if (providerConfig.provider === BRY_CLOUD_PROVIDER_ID) {
    return !!(providerConfig.connection?.pscName || providerConfig.connection?.pscProvider);
  }
  return false;
}
