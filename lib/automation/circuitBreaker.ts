import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const COLLECTION = 'automation_engine_circuit';

export type CircuitBreakerState = {
  organizationId: string;
  open: boolean;
  consecutiveFailures: number;
  consecutiveSmtpFailures: number;
  openedAt?: string;
  reason?: string;
  lastFailureAt?: string;
};

export const CIRCUIT_BREAKER_MAX_SMTP_FAILURES = Number(
  process.env.AUTOMATION_CIRCUIT_SMTP_FAILURES ?? '5',
);

export const CIRCUIT_BREAKER_MAX_LATENCY_MS = Number(
  process.env.AUTOMATION_CIRCUIT_MAX_LATENCY_MS ?? '120000',
);

function docToState(orgId: string, data: Record<string, unknown> | undefined): CircuitBreakerState {
  return {
    organizationId: orgId,
    open: data?.open === true,
    consecutiveFailures: typeof data?.consecutiveFailures === 'number' ? data.consecutiveFailures : 0,
    consecutiveSmtpFailures:
      typeof data?.consecutiveSmtpFailures === 'number' ? data.consecutiveSmtpFailures : 0,
    openedAt: typeof data?.openedAt === 'string' ? data.openedAt : undefined,
    reason: typeof data?.reason === 'string' ? data.reason : undefined,
    lastFailureAt: typeof data?.lastFailureAt === 'string' ? data.lastFailureAt : undefined,
  };
}

export async function getOrganizationCircuitBreaker(
  organizationId: string,
): Promise<CircuitBreakerState> {
  const orgId = organizationId.trim();
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(orgId).get();
  return docToState(orgId, snap.data() as Record<string, unknown> | undefined);
}

export async function isOrganizationCircuitOpen(organizationId: string): Promise<boolean> {
  const state = await getOrganizationCircuitBreaker(organizationId);
  return state.open;
}

export async function recordOrganizationSuccess(organizationId: string): Promise<void> {
  const orgId = organizationId.trim();
  await getFirestoreAdmin()
    .collection(COLLECTION)
    .doc(orgId)
    .set(
      {
        organizationId: orgId,
        open: false,
        consecutiveFailures: 0,
        consecutiveSmtpFailures: 0,
        reason: null,
        openedAt: null,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
}

export async function recordOrganizationFailure(params: {
  organizationId: string;
  reason: string;
  isSmtpError?: boolean;
  latencyMs?: number;
}): Promise<CircuitBreakerState> {
  const orgId = params.organizationId.trim();
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(orgId);
  const snap = await ref.get();
  const prev = docToState(orgId, snap.data() as Record<string, unknown> | undefined);

  const consecutiveFailures = prev.consecutiveFailures + 1;
  const consecutiveSmtpFailures = params.isSmtpError
    ? prev.consecutiveSmtpFailures + 1
    : prev.consecutiveSmtpFailures;

  const latencyTrip =
    typeof params.latencyMs === 'number' && params.latencyMs >= CIRCUIT_BREAKER_MAX_LATENCY_MS;

  const smtpTrip = consecutiveSmtpFailures >= CIRCUIT_BREAKER_MAX_SMTP_FAILURES;
  const firestoreTrip = params.reason.toLowerCase().includes('firestore');

  const shouldOpen = smtpTrip || latencyTrip || firestoreTrip || consecutiveFailures >= 10;

  const nowIso = new Date().toISOString();
  const next: CircuitBreakerState = {
    organizationId: orgId,
    open: shouldOpen,
    consecutiveFailures,
    consecutiveSmtpFailures,
    lastFailureAt: nowIso,
    openedAt: shouldOpen ? nowIso : prev.openedAt,
    reason: shouldOpen ? params.reason : prev.reason,
  };

  await ref.set(
    {
      ...next,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );

  return next;
}

export async function listAllOrganizationCircuitBreakers(): Promise<CircuitBreakerState[]> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).get();
  return snap.docs.map((doc) =>
    docToState(doc.id, doc.data() as Record<string, unknown> | undefined),
  );
}
