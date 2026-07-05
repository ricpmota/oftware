import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

export type BrySignatureSessionDisplay = {
  active: boolean;
  expired: boolean;
  usedDocuments: number;
  maxDocuments: number;
  expiresAt: Date | null;
  expiresAtLabel: string;
  scope?: string;
};

function parseExpiresAt(
  value: DoctorSignatureProviderConnection['signatureSessionExpiresAt']
): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  return null;
}

function formatExpiresAtLabel(date: Date | null): string {
  if (!date) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString('pt-BR');
  }
}

function hasTrackedSession(connection: DoctorSignatureProviderConnection): boolean {
  return (
    connection.signatureSessionScope != null ||
    connection.signatureSessionExpiresAt != null ||
    connection.signatureSessionMaxDocuments != null
  );
}

/** Estado da sessão PSC para exibição na UI (sem tokens). */
export function resolveBrySignatureSessionDisplay(
  connection: DoctorSignatureProviderConnection | null | undefined
): BrySignatureSessionDisplay | null {
  if (!connection || !hasTrackedSession(connection)) {
    return null;
  }

  const maxDocuments = connection.signatureSessionMaxDocuments ?? 50;
  const usedDocuments = connection.signatureSessionUsedDocuments ?? 0;
  const expiresAt = parseExpiresAt(connection.signatureSessionExpiresAt);
  const timeExpired = expiresAt != null && Date.now() >= expiresAt.getTime();
  const quotaExceeded = maxDocuments > 0 && usedDocuments >= maxDocuments;
  const expired = timeExpired || quotaExceeded;

  return {
    active: !expired,
    expired,
    usedDocuments,
    maxDocuments,
    expiresAt,
    expiresAtLabel: formatExpiresAtLabel(expiresAt),
    scope: connection.signatureSessionScope,
  };
}
