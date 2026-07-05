import type { BrySignatureSessionDisplay } from '@/lib/metaadmin/brySignatureSessionDisplay';
import type { DoctorSignatureProviderStatus } from '@/types/doctorSignatureProvider';
import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

export type ConnectionButtonVariant = 'connect' | 'reconnect' | 'retry';

export interface ConnectionButtonConfig {
  label: string;
  variant: ConnectionButtonVariant;
  disabled: boolean;
  helperText?: string;
}

const KNOWN_CONNECTION_STATUSES: DoctorSignatureProviderStatus[] = [
  'not_configured',
  'selected_pending_integration',
  'connected',
  'error',
];

function normalizeStoredConnectionStatus(
  status: DoctorSignatureProviderStatus | undefined
): DoctorSignatureProviderStatus {
  if (status && KNOWN_CONNECTION_STATUSES.includes(status)) return status;
  return 'selected_pending_integration';
}

/** Status exibido na área de conexão (considera troca de provedor no select). */
export function resolveDisplayedConnectionStatus(
  formProvider: string,
  stored?: DoctorSignatureProvider | null
): DoctorSignatureProviderStatus {
  if (!formProvider || formProvider === 'none') return 'not_configured';
  const storedKey = stored?.connection?.pscProvider?.trim() || stored?.provider;
  if (storedKey === formProvider) {
    return normalizeStoredConnectionStatus(stored.status);
  }
  return 'selected_pending_integration';
}

export function doctorSignatureProviderBadgeLabel(status: DoctorSignatureProviderStatus): string {
  switch (status) {
    case 'not_configured':
      return 'Não configurado';
    case 'selected_pending_integration':
      return 'Integração pendente';
    case 'connected':
      return 'Provedor conectado';
    case 'error':
      return 'Erro de autenticação';
    default:
      return status;
  }
}

export function doctorSignatureProviderBadgeClass(status: DoctorSignatureProviderStatus): string {
  switch (status) {
    case 'not_configured':
      return 'bg-gray-100 text-gray-700';
    case 'selected_pending_integration':
      return 'bg-yellow-100 text-yellow-800';
    case 'connected':
      return 'bg-green-100 text-green-800';
    case 'error':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getConnectionButtonConfig(
  status: DoctorSignatureProviderStatus,
  session?: BrySignatureSessionDisplay | null
): ConnectionButtonConfig {
  if (status === 'connected' && session) {
    return {
      label: 'Autorizar nova sessão',
      variant: 'reconnect',
      disabled: false,
      helperText: session.expired
        ? 'A sessão expirou ou atingiu o limite de documentos. Autorize novamente no app do certificado.'
        : 'Renove a sessão no app do certificado se precisar antes do prazo ou após esgotar os documentos.',
    };
  }

  switch (status) {
    case 'not_configured':
      return {
        label: 'Conectar provedor',
        variant: 'connect',
        disabled: true,
        helperText: 'Selecione um provedor para continuar.',
      };
    case 'selected_pending_integration':
      return { label: 'Conectar provedor', variant: 'connect', disabled: false };
    case 'connected':
      return { label: 'Reconectar', variant: 'reconnect', disabled: false };
    case 'error':
      return { label: 'Tentar novamente', variant: 'retry', disabled: false };
    default:
      return { label: 'Conectar provedor', variant: 'connect', disabled: true };
  }
}
