import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import {
  evaluateHydrationAdherence,
  hydrationLookbackDates,
  type HydrationAdherenceEvaluation,
} from '@/lib/nutri/hidratacao/hydrationAdherence';
import { deserializeHydrationRecord } from '@/lib/nutri/hidratacao/hydrationCodec';
import { hydrationYmdInTimeZone } from '@/lib/nutri/hidratacao/hydrationMath';
import { hydrationDocSegments } from '@/lib/nutri/hidratacao/hydrationTypes';
import { syncHydrationAdherenceAlerts } from '@/lib/nutri/hidratacao/hydrationAdherenceAlerts.server';
import type { HydrationDayView, HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

export async function loadHydrationAdherenceDays(
  db: Firestore,
  patientId: string,
  todayYmd: string
): Promise<HydrationDayView[]> {
  const dates = hydrationLookbackDates(todayYmd);
  const oldest = dates[dates.length - 1]!;
  const [root, id, col1, doc1, col2] = hydrationDocSegments(patientId, oldest);
  const snap = await db
    .collection(root)
    .doc(id)
    .collection(col1)
    .doc(doc1)
    .collection(col2)
    .orderBy(FieldPath.documentId())
    .startAt(oldest)
    .endAt(todayYmd)
    .get();

  const records = new Map<string, HydrationRecord>();
  for (const docSnap of snap.docs) {
    const parsed = deserializeHydrationRecord((docSnap.data() || {}) as Record<string, unknown>, docSnap.id);
    if (parsed) records.set(docSnap.id, parsed);
  }
  return dates.map((date) => ({ date, record: records.get(date) ?? null }));
}

export async function evaluateHydrationAdherenceForPatient(
  db: Firestore,
  patientId: string,
  now: Date = new Date()
): Promise<HydrationAdherenceEvaluation> {
  const todayYmd = hydrationYmdInTimeZone(now);
  const days = await loadHydrationAdherenceDays(db, patientId, todayYmd);
  return evaluateHydrationAdherence({ days, todayYmd, now });
}

export async function reevaluateHydrationAdherenceForPatient(
  db: Firestore,
  patientId: string,
  now: Date = new Date()
) {
  const evaluation = await evaluateHydrationAdherenceForPatient(db, patientId, now);
  const sync = await syncHydrationAdherenceAlerts(db, patientId, evaluation);
  return { evaluation, sync };
}
