import type { DoctorSignatureProvider } from '@/types/doctorSignatureProvider';

/** `true` quando o provedor está conectado (status ou conexão OAuth). */
export function isSignatureProviderConnected(
  providerConfig: DoctorSignatureProvider | null | undefined
): boolean {
  if (!providerConfig) return false;
  if (providerConfig.status === 'connected') return true;
  return providerConfig.connection?.status === 'connected';
}
