import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  PERSONAL_AVAILABILITY_RULES_COLLECTION,
  personalRuleDocId,
} from '@/lib/personal/agenda/agendaDefaults';
import {
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/personal/agenda/availabilityFirestore';
import type { PersonalAvailabilityRule } from '@/types/personalAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapRule(id: string, data: FirebaseFirestore.DocumentData): PersonalAvailabilityRule {
  return {
    id,
    weekday: typeof data.weekday === 'number' ? data.weekday : Number(data.weekday),
    enabled: data.enabled !== false,
    periods: Array.isArray(data.periods) ? data.periods : [],
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listPersonalAvailabilityRules(
  personalTrainerId: string
): Promise<PersonalAvailabilityRule[]> {
  const id = personalTrainerId.trim();
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(PERSONAL_AVAILABILITY_RULES_COLLECTION)
    .where('personalTrainerId', '==', id)
    .get();
  return snap.docs
    .map((doc) => mapRule(doc.id, doc.data()))
    .sort((a, b) => a.weekday - b.weekday);
}

export async function upsertPersonalAvailabilityRule(
  personalTrainerId: string,
  rule: Pick<PersonalAvailabilityRule, 'weekday' | 'enabled' | 'periods'>
): Promise<PersonalAvailabilityRule> {
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

  const ownerId = personalTrainerId.trim();
  const db = getFirestoreAdmin();
  const id = personalRuleDocId(ownerId, rule.weekday);
  const ref = db.collection(PERSONAL_AVAILABILITY_RULES_COLLECTION).doc(id);

  await ref.set(
    {
      personalTrainerId: ownerId,
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
