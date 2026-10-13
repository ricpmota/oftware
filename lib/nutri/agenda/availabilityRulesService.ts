import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  NUTRI_AVAILABILITY_RULES_COLLECTION,
  nutriRuleDocId,
} from '@/lib/nutri/agenda/agendaDefaults';
import {
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/nutri/agenda/availabilityFirestore';
import type { NutriAvailabilityRule } from '@/types/nutriAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapRule(id: string, data: FirebaseFirestore.DocumentData): NutriAvailabilityRule {
  return {
    id,
    weekday: typeof data.weekday === 'number' ? data.weekday : Number(data.weekday),
    enabled: data.enabled !== false,
    periods: Array.isArray(data.periods) ? data.periods : [],
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listNutriAvailabilityRules(
  nutricionistaId: string
): Promise<NutriAvailabilityRule[]> {
  const id = nutricionistaId.trim();
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_RULES_COLLECTION)
    .where('nutricionistaId', '==', id)
    .get();
  return snap.docs
    .map((doc) => mapRule(doc.id, doc.data()))
    .sort((a, b) => a.weekday - b.weekday);
}

export async function upsertNutriAvailabilityRule(
  nutricionistaId: string,
  rule: Pick<NutriAvailabilityRule, 'weekday' | 'enabled' | 'periods'>
): Promise<NutriAvailabilityRule> {
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

  const ownerId = nutricionistaId.trim();
  const db = getFirestoreAdmin();
  const id = nutriRuleDocId(ownerId, rule.weekday);
  const ref = db.collection(NUTRI_AVAILABILITY_RULES_COLLECTION).doc(id);

  await ref.set(
    {
      nutricionistaId: ownerId,
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
