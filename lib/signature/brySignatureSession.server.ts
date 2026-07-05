/**
 * Ciclo de vida da sessão PSC BRy (signature_session) — server-only.
 */
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { BryCloudEnvConfig } from '@/lib/signature/providers/bryCloudEnv';
import {
  BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
} from '@/lib/signature/brySignatureConstants';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

export { BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE };

export function parseConnectionTimestamp(
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

export function hasStoredIntegraSigningToken(
  connection: DoctorSignatureProviderConnection | null | undefined
): boolean {
  return !!(
    connection?.integraBrySigningTokenEncrypted?.trim() ||
    connection?.pscSigningKmsTokenEncrypted?.trim()
  );
}

export function isSignatureSessionTimeExpired(
  connection: DoctorSignatureProviderConnection
): boolean {
  const expiresAt = parseConnectionTimestamp(connection.signatureSessionExpiresAt);
  if (!expiresAt) return false;
  return Date.now() >= expiresAt.getTime();
}

export function isSignatureSessionQuotaExceeded(
  connection: DoctorSignatureProviderConnection
): boolean {
  const max = connection.signatureSessionMaxDocuments;
  if (max == null || max <= 0) return false;
  const used = connection.signatureSessionUsedDocuments ?? 0;
  return used >= max;
}

export function usesTrackedSignatureSession(
  connection: DoctorSignatureProviderConnection
): boolean {
  return (
    connection.signatureSessionScope != null ||
    connection.signatureSessionExpiresAt != null ||
    connection.signatureSessionMaxDocuments != null
  );
}

export function validateSignatureSessionForSigning(
  connection: DoctorSignatureProviderConnection | null | undefined
): { ok: true } | { ok: false; message: string } {
  if (!connection) {
    return { ok: false, message: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE };
  }

  if (!hasStoredIntegraSigningToken(connection)) {
    return { ok: false, message: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE };
  }

  if (!usesTrackedSignatureSession(connection)) {
    return { ok: true };
  }

  if (isSignatureSessionTimeExpired(connection) || isSignatureSessionQuotaExceeded(connection)) {
    return { ok: false, message: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE };
  }

  return { ok: true };
}

/** Inicializa metadados da sessão após `POST /psc/link` + callback PSC. */
export function applyNewSignatureSessionToConnection(
  connection: DoctorSignatureProviderConnection,
  config: Pick<BryCloudEnvConfig, 'pscAuthLifetimeSec' | 'pscNumberOfDocuments' | 'pscScope'>
): DoctorSignatureProviderConnection {
  const lifetimeSec = config.pscAuthLifetimeSec > 0 ? config.pscAuthLifetimeSec : 604800;
  const maxDocuments = config.pscNumberOfDocuments > 0 ? config.pscNumberOfDocuments : 50;

  connection.signatureSessionScope = config.pscScope;
  connection.signatureSessionMaxDocuments = maxDocuments;
  connection.signatureSessionUsedDocuments = 0;
  connection.signatureSessionExpiresAt = new Date(Date.now() + lifetimeSec * 1000).toISOString();

  return connection;
}

/** Remove token de assinatura e marca sessão como esgotada/expirada. */
export function clearSignatureSessionSigningCredentials(
  connection: DoctorSignatureProviderConnection
): DoctorSignatureProviderConnection {
  delete connection.integraBrySigningTokenEncrypted;
  delete connection.pscSigningKmsTokenEncrypted;

  const max = connection.signatureSessionMaxDocuments;
  if (max != null && max > 0) {
    connection.signatureSessionUsedDocuments = max;
  }
  connection.signatureSessionExpiresAt = new Date(0).toISOString();

  return connection;
}

export function isBryOperationExpiredOrCompletedError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return /operation for id not found|expired or completed|expirad|conclu[ií]d|completed|not found/i.test(
    msg
  );
}

export async function incrementSignatureSessionUsedDocuments(doctorId: string): Promise<void> {
  const id = doctorId.trim();
  if (!id) return;

  const ref = getFirestoreAdmin().collection('medicos').doc(id);
  await getFirestoreAdmin().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;

    const provider = snap.data()?.doctorSignatureProvider as
      | { connection?: DoctorSignatureProviderConnection }
      | undefined;
    const conn = provider?.connection;
    if (!conn || !usesTrackedSignatureSession(conn)) return;

    const used = (conn.signatureSessionUsedDocuments ?? 0) + 1;
    tx.update(ref, {
      'doctorSignatureProvider.connection.signatureSessionUsedDocuments': used,
      'doctorSignatureProvider.updatedAt': FieldValue.serverTimestamp(),
    });
  });
}

export async function expireDoctorBrySignatureSession(doctorId: string): Promise<void> {
  const id = doctorId.trim();
  if (!id) return;

  const ref = getFirestoreAdmin().collection('medicos').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return;

  const raw = snap.data()?.doctorSignatureProvider as
    | { connection?: DoctorSignatureProviderConnection }
    | undefined;
  const conn = raw?.connection;
  if (!conn) return;

  const cleared = clearSignatureSessionSigningCredentials({ ...conn });
  await ref.update({
    'doctorSignatureProvider.connection': cleared,
    'doctorSignatureProvider.updatedAt': FieldValue.serverTimestamp(),
  });
}
