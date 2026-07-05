import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

export type DoctorSignatureProviderCategory =

  | 'none'

  | 'cloud_certificate'

  /** Legado — não exibido na UI; perfis antigos podem ainda referenciar. */
  | 'physical_certificate'

  | 'signature_platform'

  | 'sandbox'

  | 'other';



export type DoctorSignatureProviderStatus =

  | 'not_configured'

  | 'selected_pending_integration'

  | 'connected'

  | 'error';



/** IDs conhecidos de provedor (lista extensível via `other`). */

export type DoctorSignatureProviderId =

  | 'none'

  | 'sandbox_mock'

  | 'lacuna_rest_pki'

  | 'bry_cloud'

  | 'vidas_valid'

  | 'bird_vaultid'

  | 'remote_certisign'

  | 'safeid_safeweb'

  | 'neoid_serpro'

  | 'ds_cloud'

  | 'syn'

  | 'valtid_vaultid'

  | 'token_a3'

  | 'cartao_a3'

  | 'cfm_prescricao'

  | 'bry'

  | 'clicksign'

  | 'd4sign'

  | 'certisign_plataforma'

  | 'soluti'

  | 'valid_plataforma'

  | 'other'

  | (string & {});



export const SANDBOX_MOCK_PROVIDER_ID = 'sandbox_mock' as const satisfies DoctorSignatureProviderId;

export const LACUNA_REST_PKI_PROVIDER_ID = 'lacuna_rest_pki' as const satisfies DoctorSignatureProviderId;

export const BRY_CLOUD_PROVIDER_ID = 'bry_cloud' as const satisfies DoctorSignatureProviderId;

/** Alias usado na UI de impressão de prescrição. */
export type DoctorSignatureProviderConfig = DoctorSignatureProvider;

export type { DoctorSignatureProviderConnectionStatus } from '@/types/signatureProviderAdapter';

export interface DoctorSignatureProvider {
  provider: DoctorSignatureProviderId | string;
  providerLabel: string;
  providerCategory: DoctorSignatureProviderCategory;
  customProviderName?: string;
  customProviderUrl?: string;
  customProviderNotes?: string;
  status: DoctorSignatureProviderStatus;
  connectedAt?: Date | { toDate?: () => Date } | null;
  updatedAt?: Date | { toDate?: () => Date };
  /** Conta autorizada no provedor (sem credenciais sensíveis). */
  connection?: DoctorSignatureProviderConnection;
}



export interface DoctorSignatureProviderFormState {

  provider: string;

  customProviderName: string;

  customProviderUrl: string;

  customProviderNotes: string;

}



export const DEFAULT_DOCTOR_SIGNATURE_PROVIDER_FORM: DoctorSignatureProviderFormState = {

  provider: 'none',

  customProviderName: '',

  customProviderUrl: '',

  customProviderNotes: '',

};

