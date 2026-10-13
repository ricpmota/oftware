import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  HYDRATION_ADHERENCE_ALERTS_COLLECTION,
  alertTypesFromEvaluation,
  hydrationAdherenceAlertDocId,
  type HydrationAdherenceAlert,
  type HydrationAdherenceAlertType,
  type HydrationAdherenceEvaluation,
  type HydrationAdherenceReason,
} from '@/lib/nutri/hidratacao/hydrationAdherence';

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function deserializeHydrationAdherenceAlert(
  id: string,
  data: Record<string, unknown>
): HydrationAdherenceAlert | null {
  const patientId = String(data.patientId ?? '').trim();
  const type = data.type === 'low_recorded_adherence' ? 'low_recorded_adherence' : 'missing_registration';
  if (!patientId) return null;
  const metrics = (data.metrics || {}) as Record<string, unknown>;
  return {
    id,
    patientId,
    type,
    severity: 'alert',
    status: data.status === 'resolved' ? 'resolved' : 'active',
    reasons: Array.isArray(data.reasons) ? (data.reasons as HydrationAdherenceReason[]) : [],
    createdAt: toDate(data.createdAt) ?? new Date(0),
    updatedAt: toDate(data.updatedAt) ?? new Date(0),
    resolvedAt: toDate(data.resolvedAt),
    metrics: {
      registeredDays: Number(metrics.registeredDays) || 0,
      missingDays: Number(metrics.missingDays) || 0,
      averagePercentage:
        typeof metrics.averagePercentage === 'number' ? metrics.averagePercentage : null,
      consecutiveMissingDays: Number(metrics.consecutiveMissingDays) || 0,
      recentLowAdherenceCount: Number(metrics.recentLowAdherenceCount) || 0,
    },
  };
}

function metricsFromEvaluation(evaluation: HydrationAdherenceEvaluation) {
  return {
    registeredDays: evaluation.registeredDays,
    missingDays: evaluation.missingDays,
    averagePercentage: evaluation.averagePercentage,
    consecutiveMissingDays: evaluation.consecutiveMissingDays,
    recentLowAdherenceCount: evaluation.recentLowAdherenceCount,
  };
}

export async function syncHydrationAdherenceAlerts(
  db: Firestore,
  patientId: string,
  evaluation: HydrationAdherenceEvaluation
): Promise<{ activated: string[]; resolved: string[]; kept: string[] }> {
  const wanted = new Set(alertTypesFromEvaluation(evaluation));
  const types: HydrationAdherenceAlertType[] = ['missing_registration', 'low_recorded_adherence'];
  const activated: string[] = [];
  const resolved: string[] = [];
  const kept: string[] = [];

  for (const type of types) {
    const id = hydrationAdherenceAlertDocId(patientId, type);
    const ref = db.collection(HYDRATION_ADHERENCE_ALERTS_COLLECTION).doc(id);
    const snap = await ref.get();
    const existing = snap.exists
      ? deserializeHydrationAdherenceAlert(id, (snap.data() || {}) as Record<string, unknown>)
      : null;

    if (wanted.has(type)) {
      const reasons = evaluation.reasons.filter((reason) =>
        type === 'missing_registration'
          ? reason === 'no_registration_3_days'
          : reason === 'below_60_three_of_five'
      );
      const payload: Record<string, unknown> = {
        patientId,
        type,
        severity: 'alert',
        status: 'active',
        reasons,
        updatedAt: FieldValue.serverTimestamp(),
        resolvedAt: FieldValue.delete(),
        metrics: metricsFromEvaluation(evaluation),
      };
      if (!existing) {
        payload.createdAt = FieldValue.serverTimestamp();
        await ref.set(payload);
        activated.push(type);
      } else if (existing.status === 'resolved') {
        payload.createdAt = existing.createdAt;
        payload.reactivatedAt = FieldValue.serverTimestamp();
        await ref.set(payload, { merge: true });
        activated.push(type);
      } else {
        await ref.set(payload, { merge: true });
        kept.push(type);
      }
    } else if (existing?.status === 'active') {
      await ref.set(
        {
          status: 'resolved',
          resolvedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          metrics: metricsFromEvaluation(evaluation),
        },
        { merge: true }
      );
      resolved.push(type);
    }
  }

  return { activated, resolved, kept };
}

export async function listActiveHydrationAdherenceAlerts(
  db: Firestore,
  patientIds?: string[]
): Promise<HydrationAdherenceAlert[]> {
  if (patientIds && patientIds.length === 0) return [];
  const col = db.collection(HYDRATION_ADHERENCE_ALERTS_COLLECTION);
  if (!patientIds) {
    const snap = await col.where('status', '==', 'active').get();
    return snap.docs
      .map((d) => deserializeHydrationAdherenceAlert(d.id, (d.data() || {}) as Record<string, unknown>))
      .filter((a): a is HydrationAdherenceAlert => Boolean(a));
  }

  const items: HydrationAdherenceAlert[] = [];
  const chunkSize = 10;
  for (let i = 0; i < patientIds.length; i += chunkSize) {
    const chunk = patientIds.slice(i, i + chunkSize);
    const snap = await col.where('status', '==', 'active').where('patientId', 'in', chunk).get();
    for (const d of snap.docs) {
      const parsed = deserializeHydrationAdherenceAlert(d.id, (d.data() || {}) as Record<string, unknown>);
      if (parsed) items.push(parsed);
    }
  }
  return items;
}
