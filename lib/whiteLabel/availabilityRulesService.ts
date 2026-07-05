import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { WHITELABEL_AVAILABILITY_RULES_COLLECTION } from '@/lib/whiteLabel/agendaDefaults';
import { isValidAvailabilityRange, isValidAvailabilityTime } from '@/lib/whiteLabel/availabilityFirestore';
import type { WhiteLabelAvailabilityRule } from '@/types/whiteLabelAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapRule(id: string, data: FirebaseFirestore.DocumentData): WhiteLabelAvailabilityRule {
  return {
    id,
    weekday: typeof data.weekday === 'number' ? data.weekday : Number(id),
    enabled: data.enabled !== false,
    periods: Array.isArray(data.periods) ? data.periods : [],
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listAvailabilityRules(): Promise<WhiteLabelAvailabilityRule[]> {
  const db = getFirestoreAdmin();
  const snap = await db.collection(WHITELABEL_AVAILABILITY_RULES_COLLECTION).get();
  const rules = snap.docs.map((doc) => mapRule(doc.id, doc.data()));
  return rules.sort((a, b) => a.weekday - b.weekday);
}

export async function upsertAvailabilityRule(
  rule: Pick<WhiteLabelAvailabilityRule, 'weekday' | 'enabled' | 'periods'>
): Promise<WhiteLabelAvailabilityRule> {
  if (rule.weekday < 0 || rule.weekday > 6) {
    throw new Error('Dia da semana inválido.');
  }

  for (const period of rule.periods) {
    if (!isValidAvailabilityTime(period.startTime) || !isValidAvailabilityTime(period.endTime)) {
      throw new Error('Horário inválido em um dos períodos.');
    }
    if (!isValidAvailabilityRange(period.startTime, period.endTime)) {
      throw new Error('Período inválido: término deve ser após o início.');
    }
  }

  const db = getFirestoreAdmin();
  const id = String(rule.weekday);
  const ref = db.collection(WHITELABEL_AVAILABILITY_RULES_COLLECTION).doc(id);

  await ref.set(
    {
      weekday: rule.weekday,
      enabled: rule.enabled,
      periods: rule.periods,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const saved = await ref.get();
  return mapRule(saved.id, saved.data()!);
}
