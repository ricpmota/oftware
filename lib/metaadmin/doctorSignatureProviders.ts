import { isSignatureProviderConnected } from '@/lib/metaadmin/isSignatureProviderConnected';
import { CLOUD_ONLY_SIGNATURE_ERROR } from '@/lib/signature/cloudOnlySignatureConstants';
import {
  BRY_COMPATIBLE_PSC_PROVIDER_IDS,
  BRY_PSC_GENERIC_CONNECT_ERROR,
  isBryCompatiblePscProvider,
  normalizeSignatureProviderId,
  SIGNATURE_CONNECT_SELECT_PSC_MESSAGE,
} from '@/lib/signature/providers/bryPscNameMap';
import type {
  DoctorSignatureProvider,
  DoctorSignatureProviderCategory,
  DoctorSignatureProviderFormState,
} from '@/types/doctorSignatureProvider';
import { BRY_CLOUD_PROVIDER_ID, SANDBOX_MOCK_PROVIDER_ID } from '@/types/doctorSignatureProvider';

export const BRY_CLOUD_PROVIDER_LABEL = 'BRy Cloud / Assinatura em nuvem';

export interface DoctorSignatureProviderOption {
  provider: string;
  providerLabel: string;
  providerCategory: DoctorSignatureProviderCategory;
}

export interface DoctorSignatureProviderGroup {
  groupLabel: string;
  options: DoctorSignatureProviderOption[];
}

/** Opções exibidas no select de Meu Perfil (integração ativa: BRy Cloud + PSC em nuvem). */
const BASE_DOCTOR_SIGNATURE_PROVIDER_GROUPS: DoctorSignatureProviderGroup[] = [
  {
    groupLabel: 'Nenhum',
    options: [
      {
        provider: 'none',
        providerLabel: 'Nenhum provedor configurado',
        providerCategory: 'none',
      },
    ],
  },
  {
    groupLabel: 'Certificado em nuvem (via BRy Cloud)',
    options: [
      {
        provider: 'vidaas',
        providerLabel: 'VIDaaS / Valid',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'birdid',
        providerLabel: 'BirdID',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'safeid',
        providerLabel: 'SafeID',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'remoteid',
        providerLabel: 'RemoteID / Certisign',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'neoid',
        providerLabel: 'NeoID / SerproID',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'syn',
        providerLabel: 'Syn',
        providerCategory: 'cloud_certificate',
      },
      {
        provider: 'dscloud',
        providerLabel: 'DS Cloud',
        providerCategory: 'cloud_certificate',
      },
    ],
  },
  {
    groupLabel: 'Plataforma',
    options: [
      {
        provider: BRY_CLOUD_PROVIDER_ID,
        providerLabel: BRY_CLOUD_PROVIDER_LABEL,
        providerCategory: 'signature_platform',
      },
    ],
  },
];

/**
 * Catálogo antigo — não aparece no select; usado para rótulos de perfis já salvos.
 */
export const LEGACY_SIGNATURE_PROVIDER_OPTIONS: DoctorSignatureProviderOption[] = [
  { provider: 'vidas_valid', providerLabel: 'VIDaaS / Valid', providerCategory: 'cloud_certificate' },
  { provider: 'bird_vaultid', providerLabel: 'Bird ID / VaultID', providerCategory: 'cloud_certificate' },
  { provider: 'remote_certisign', providerLabel: 'RemoteID / Certisign', providerCategory: 'cloud_certificate' },
  { provider: 'safeid_safeweb', providerLabel: 'SafeID / Safeweb', providerCategory: 'cloud_certificate' },
  { provider: 'neoid_serpro', providerLabel: 'NeoID / Serpro', providerCategory: 'cloud_certificate' },
  { provider: 'ds_cloud', providerLabel: 'DS Cloud', providerCategory: 'cloud_certificate' },
  { provider: 'syn', providerLabel: 'SYN', providerCategory: 'cloud_certificate' },
  { provider: 'valtid_vaultid', providerLabel: 'ValtID / VaultID', providerCategory: 'cloud_certificate' },
  {
    provider: 'cfm_prescricao',
    providerLabel: 'CFM / Prescrição Eletrônica',
    providerCategory: 'signature_platform',
  },
  {
    provider: 'lacuna_rest_pki',
    providerLabel: 'Lacuna Rest PKI',
    providerCategory: 'signature_platform',
  },
  { provider: 'bry', providerLabel: 'Bry', providerCategory: 'signature_platform' },
  { provider: 'clicksign', providerLabel: 'Clicksign', providerCategory: 'signature_platform' },
  { provider: 'd4sign', providerLabel: 'D4Sign', providerCategory: 'signature_platform' },
  { provider: 'certisign_plataforma', providerLabel: 'Certisign', providerCategory: 'signature_platform' },
  { provider: 'soluti', providerLabel: 'Soluti', providerCategory: 'signature_platform' },
  { provider: 'valid_plataforma', providerLabel: 'Valid', providerCategory: 'signature_platform' },
  { provider: 'other', providerLabel: 'Outro provedor', providerCategory: 'other' },
];

/** Compatibilidade com perfis antigos — não exibido no select de Meu Perfil. */
export const LEGACY_PHYSICAL_SIGNATURE_PROVIDER_OPTIONS: DoctorSignatureProviderOption[] = [
  { provider: 'token_a3', providerLabel: 'Token físico A3', providerCategory: 'physical_certificate' },
  { provider: 'cartao_a3', providerLabel: 'Cartão A3', providerCategory: 'physical_certificate' },
];

const PHYSICAL_PROVIDER_IDS = new Set(
  LEGACY_PHYSICAL_SIGNATURE_PROVIDER_OPTIONS.map((o) => o.provider)
);

export function isPhysicalCertificateProvider(provider?: string | null): boolean {
  const id = provider?.trim();
  return id ? PHYSICAL_PROVIDER_IDS.has(id) : false;
}

export function isCloudSignatureProviderCategory(
  category: DoctorSignatureProviderCategory | string | undefined
): boolean {
  if (!category || category === 'none' || category === 'physical_certificate') return false;
  return (
    category === 'cloud_certificate' ||
    category === 'signature_platform' ||
    category === 'sandbox' ||
    category === 'other'
  );
}

export const SANDBOX_SIGNATURE_PROVIDER_OPTION: DoctorSignatureProviderOption = {
  provider: SANDBOX_MOCK_PROVIDER_ID,
  providerLabel: 'Sandbox / Teste interno',
  providerCategory: 'sandbox',
};

const SANDBOX_SIGNATURE_PROVIDER_GROUP: DoctorSignatureProviderGroup = {
  groupLabel: 'Desenvolvimento',
  options: [SANDBOX_SIGNATURE_PROVIDER_OPTION],
};

/** @deprecated Prefer `getDoctorSignatureProviderGroups()` (inclui sandbox quando env ativa). */
export const DOCTOR_SIGNATURE_PROVIDER_GROUPS = BASE_DOCTOR_SIGNATURE_PROVIDER_GROUPS;

export function isSignatureSandboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SIGNATURE_SANDBOX === 'true';
}

export function isSandboxMockProvider(provider?: string | null): boolean {
  return provider === SANDBOX_MOCK_PROVIDER_ID;
}

export function getDoctorSignatureProviderGroups(): DoctorSignatureProviderGroup[] {
  if (!isSignatureSandboxEnabled()) {
    return BASE_DOCTOR_SIGNATURE_PROVIDER_GROUPS;
  }
  return [...BASE_DOCTOR_SIGNATURE_PROVIDER_GROUPS, SANDBOX_SIGNATURE_PROVIDER_GROUP];
}

/** Provedores que o médico pode escolher no select (PSC em nuvem + BRy Cloud genérico + sandbox em dev). */
export function isProviderSelectableInProfile(provider?: string | null): boolean {
  const id = provider?.trim().toLowerCase();
  if (!id || id === 'none') return true;
  if ((BRY_COMPATIBLE_PSC_PROVIDER_IDS as readonly string[]).includes(id)) return true;
  if (id === BRY_CLOUD_PROVIDER_ID || id === 'bry') return true;
  if (isSandboxMockProvider(id) && isSignatureSandboxEnabled()) return true;
  return false;
}

/** Alias legado “Bry” (plataforma) → integração BRy Cloud. */
export function normalizeConnectableProviderId(provider?: string | null): string | null {
  const id = provider?.trim();
  if (!id || id === 'none') return null;
  if (id === 'bry') return BRY_CLOUD_PROVIDER_ID;
  return id;
}

export const SIGNATURE_CONNECT_SELECT_BRY_CLOUD_MESSAGE = SIGNATURE_CONNECT_SELECT_PSC_MESSAGE;

export const SIGNATURE_CONNECT_LEGACY_PROVIDER_MESSAGE =
  'O provedor salvo não possui integração ativa no Oftware. Selecione um certificado em nuvem compatível (VIDaaS, BirdID, SafeID, etc.).';

export function resolveConnectableProviderId(
  provider?: string | null
): { ok: true; providerId: string } | { ok: false; reason: string } {
  const normalized = normalizeSignatureProviderId(provider) ?? normalizeConnectableProviderId(provider);
  if (!normalized) {
    return { ok: false, reason: SIGNATURE_CONNECT_SELECT_PSC_MESSAGE };
  }
  if (isSandboxMockProvider(normalized)) {
    return { ok: true, providerId: normalized };
  }
  if (isBryCompatiblePscProvider(normalized)) {
    return { ok: true, providerId: BRY_CLOUD_PROVIDER_ID };
  }
  if (normalized === BRY_CLOUD_PROVIDER_ID) {
    return { ok: true, providerId: BRY_CLOUD_PROVIDER_ID };
  }
  if (isProviderSelectableInProfile(normalized)) {
    return { ok: true, providerId: normalized };
  }
  return { ok: false, reason: SIGNATURE_CONNECT_LEGACY_PROVIDER_MESSAGE };
}

function getAllProviderOptions(): DoctorSignatureProviderOption[] {
  const fromGroups = getDoctorSignatureProviderGroups().flatMap((g) => g.options);
  const legacy = [...LEGACY_SIGNATURE_PROVIDER_OPTIONS, ...LEGACY_PHYSICAL_SIGNATURE_PROVIDER_OPTIONS].filter(
    (legacy) => !fromGroups.some((o) => o.provider === legacy.provider)
  );
  const merged = [...fromGroups, ...legacy];
  const hasSandbox = merged.some((o) => o.provider === SANDBOX_MOCK_PROVIDER_ID);
  if (hasSandbox) return merged;
  return [...merged, SANDBOX_SIGNATURE_PROVIDER_OPTION];
}

export function findDoctorSignatureProviderOption(
  provider: string
): DoctorSignatureProviderOption | undefined {
  return getAllProviderOptions().find((o) => o.provider === provider);
}

export function doctorSignatureProviderFormFromStored(
  stored?: DoctorSignatureProvider | null
): DoctorSignatureProviderFormState {
  if (!stored?.provider) {
    return { provider: 'none', customProviderName: '', customProviderUrl: '', customProviderNotes: '' };
  }
  const topLevel =
    stored.provider === 'bry' ? BRY_CLOUD_PROVIDER_ID : stored.provider;
  const pscFromConnection = stored.connection?.pscProvider?.trim();
  const provider =
    pscFromConnection ||
    (isBryCompatiblePscProvider(topLevel) ? topLevel : topLevel);
  return {
    provider,
    customProviderName: stored.customProviderName ?? '',
    customProviderUrl: stored.customProviderUrl ?? '',
    customProviderNotes: stored.customProviderNotes ?? '',
  };
}

export type BuildDoctorSignatureProviderOptions = {
  /** Mantém `connected` / `connectedAt` se o provedor do formulário não mudou. */
  preserveConnectionFrom?: DoctorSignatureProvider | null;
};

export function buildDoctorSignatureProviderPayload(
  form: DoctorSignatureProviderFormState,
  updatedAt: unknown,
  options?: BuildDoctorSignatureProviderOptions
): DoctorSignatureProvider {
  const provider = form.provider || 'none';
  const option = findDoctorSignatureProviderOption(provider);
  const providerCategory = option?.providerCategory ?? (provider === 'none' ? 'none' : 'other');
  const providerLabel =
    provider === 'other'
      ? form.customProviderName.trim() || option?.providerLabel || 'Outro provedor'
      : option?.providerLabel ?? provider;

  const previous = options?.preserveConnectionFrom;
  const storedEffectiveProvider =
    previous?.connection?.pscProvider?.trim() || previous?.provider;
  const sameProvider = storedEffectiveProvider === provider;
  const keepConnected = sameProvider && isSignatureProviderConnected(previous);

  let status: DoctorSignatureProvider['status'];
  if (provider === 'none') {
    status = 'not_configured';
  } else if (keepConnected) {
    status = 'connected';
  } else {
    status = 'selected_pending_integration';
  }

  const payload: DoctorSignatureProvider = {
    provider,
    providerLabel,
    providerCategory,
    status,
    updatedAt: updatedAt as DoctorSignatureProvider['updatedAt'],
  };

  if (keepConnected && previous?.connectedAt != null) {
    payload.connectedAt = previous.connectedAt;
  }

  if (provider === 'other') {
    const name = form.customProviderName.trim();
    const url = form.customProviderUrl.trim();
    const notes = form.customProviderNotes.trim();
    if (name) payload.customProviderName = name;
    if (url) payload.customProviderUrl = url;
    if (notes) payload.customProviderNotes = notes;
  }

  return payload;
}

/** Payload ao conectar sandbox (sem credenciais). */
export function buildSandboxConnectedProvider(
  form: DoctorSignatureProviderFormState,
  timestamps: { updatedAt: unknown; connectedAt: unknown }
): DoctorSignatureProvider {
  const base = buildDoctorSignatureProviderPayload(form, timestamps.updatedAt);
  return {
    ...base,
    provider: SANDBOX_MOCK_PROVIDER_ID,
    providerLabel: SANDBOX_SIGNATURE_PROVIDER_OPTION.providerLabel,
    providerCategory: 'sandbox',
    status: 'connected',
    connectedAt: timestamps.connectedAt as DoctorSignatureProvider['connectedAt'],
    updatedAt: timestamps.updatedAt as DoctorSignatureProvider['updatedAt'],
  };
}

export function doctorSignatureProviderCategoryLabel(
  category: DoctorSignatureProviderCategory
): string {
  switch (category) {
    case 'cloud_certificate':
      return 'Certificado em nuvem / PSC';
    case 'physical_certificate':
      return 'Certificado físico';
    case 'signature_platform':
      return 'Plataforma assinadora';
    case 'sandbox':
      return 'Sandbox / teste interno';
    case 'other':
      return 'Outro';
    default:
      return '';
  }
}

export function doctorSignatureProviderStatusLabel(status: DoctorSignatureProvider['status']): string {
  switch (status) {
    case 'not_configured':
      return 'Não configurado';
    case 'selected_pending_integration':
      return 'Selecionado — integração pendente';
    case 'connected':
      return 'Conectado';
    case 'error':
      return 'Erro';
    default:
      return status;
  }
}

export function canConnectSignatureProvider(form: DoctorSignatureProviderFormState): {
  ok: boolean;
  reason?: string;
} {
  if (!form.provider || form.provider === 'none') {
    return { ok: false, reason: SIGNATURE_CONNECT_SELECT_PSC_MESSAGE };
  }
  const connectKey =
    normalizeConnectableProviderId(form.provider) ?? normalizeSignatureProviderId(form.provider);
  if (connectKey === BRY_CLOUD_PROVIDER_ID) {
    return { ok: false, reason: BRY_PSC_GENERIC_CONNECT_ERROR };
  }
  if (form.provider === 'other' && !form.customProviderName.trim()) {
    return { ok: false, reason: 'Informe o nome do provedor em "Outro".' };
  }
  if (isPhysicalCertificateProvider(form.provider)) {
    return { ok: false, reason: CLOUD_ONLY_SIGNATURE_ERROR };
  }
  const resolved = resolveConnectableProviderId(form.provider);
  if (!resolved.ok) {
    return { ok: false, reason: resolved.reason };
  }
  return { ok: true };
}
