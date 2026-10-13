import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  MEDICO_AVAILABILITY_RULES_COLLECTION,
  medicoRuleDocId,
} from '@/lib/metaadmin/agenda/agendaDefaults';
import {
  isValidAvailabilityRange,
  isValidAvailabilityTime,
} from '@/lib/metaadmin/agenda/availabilityFirestore';
import type { MedicoAvailabilityRule } from '@/types/medicoAgenda';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

function mapRule(id: string, data: FirebaseFirestore.DocumentData): MedicoAvailabilityRule {
  return {
    id,
    weekday: typeof data.weekday === 'number' ? data.weekday : Number(data.weekday),
    enabled: data.enabled !== false,
    periods: Array.isArray(data.periods) ? data.periods : [],
    updatedAt: toIso(data.updatedAt),
  };
}

export async function listMedicoAvailabilityRules(medicoId: string): Promise<MedicoAvailabilityRule[]> {
  const id = medicoId.trim();
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(MEDICO_AVAILABILITY_RULES_COLLECTION)
    .where('medicoId', '==', id)
    .get();
  return snap.docs
    .map((doc) => mapRule(doc.id, doc.data()))
    .sort((a, b) => a.weekday - b.weekday);
}

export async function upsertMedicoAvailabilityRule(
  medicoId: string,
  rule: Pick<MedicoAvailabilityRule, 'weekday' | 'enabled' | 'periods'>
): Promise<MedicoAvailabilityRule> {
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

  const ownerId = medicoId.trim();
  const db = getFirestoreAdmin();
  const id = medicoRuleDocId(ownerId, rule.weekday);
  const ref = db.collection(MEDICO_AVAILABILITY_RULES_COLLECTION).doc(id);

  await ref.set(
    {
      medicoId: ownerId,
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
