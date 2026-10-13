import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deserializeCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriPersist';
import {
  DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME,
  DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
  deserializeNutriWeeklyCheckInSchedule,
  NUTRI_CHECKIN_SCHEDULES_COLLECTION,
  nutriCheckInScheduleDocId,
  type NutriWeeklyCheckInSchedule,
  type NutriWeekdaySunday0,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import { CHECKIN_SEMANAL_NUTRI_COLLECTION } from '@/lib/nutri/checkInSemanalNutriTypes';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import { BRASIL_TIMEZONE, parseHorarioBrasil } from '@/lib/time/brasilTimezone';

export { deserializeNutriWeeklyCheckInSchedule };

async function assertActiveNutritionistPatientLink(nutritionistId: string, patientId: string): Promise<void> {
  const vinculos = await PacienteNutricionistaService.listActiveVinculosByNutri(nutritionistId);
  if (!vinculos.some((v) => v.pacienteId === patientId)) {
    throw new Error('Este paciente não está vinculado a este nutricionista.');
  }
}

export async function loadNutriWeeklyCheckInSchedule(
  nutritionistId: string,
  patientId: string
): Promise<NutriWeeklyCheckInSchedule | null> {
  if (!nutritionistId || !patientId) return null;
  const ref = doc(db, NUTRI_CHECKIN_SCHEDULES_COLLECTION, nutriCheckInScheduleDocId(nutritionistId, patientId));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return deserializeNutriWeeklyCheckInSchedule(snap.data() as Record<string, unknown>, {
    nutritionistId,
    patientId,
  });
}

export async function loadNutriWeeklyCheckInScheduleForPatient(
  patientId: string,
  nutritionistId?: string | null
): Promise<NutriWeeklyCheckInSchedule | null> {
  if (!patientId) return null;
  if (nutritionistId) {
    const exact = await loadNutriWeeklyCheckInSchedule(nutritionistId, patientId);
    if (exact) return exact;
  }
  const list = await listNutriWeeklyCheckInSchedulesByPatientIds([patientId]);
  if (list.length === 0) return null;
  const enabled = list.filter((item) => item.enabled);
  const pool = enabled.length > 0 ? enabled : list;
  return [...pool].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
}

export async function listNutriWeeklyCheckInSchedulesByNutritionist(
  nutritionistId: string
): Promise<NutriWeeklyCheckInSchedule[]> {
  if (!nutritionistId) return [];
  const q = query(
    collection(db, NUTRI_CHECKIN_SCHEDULES_COLLECTION),
    where('nutritionistId', '==', nutritionistId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) =>
      deserializeNutriWeeklyCheckInSchedule(d.data() as Record<string, unknown>, {
        nutritionistId,
        patientId: String(d.data().patientId ?? ''),
      })
    )
    .filter((s): s is NutriWeeklyCheckInSchedule => Boolean(s));
}

export async function listNutriWeeklyCheckInSchedulesByPatientIds(
  patientIds: string[]
): Promise<NutriWeeklyCheckInSchedule[]> {
  const uniqueIds = [...new Set(patientIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  const items: NutriWeeklyCheckInSchedule[] = [];
  const chunkSize = 10;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const q = query(
      collection(db, NUTRI_CHECKIN_SCHEDULES_COLLECTION),
      where('patientId', 'in', chunk)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data() as Record<string, unknown>;
      const parsed = deserializeNutriWeeklyCheckInSchedule(data, {
        nutritionistId: String(data.nutritionistId ?? ''),
        patientId: String(data.patientId ?? ''),
      });
      if (parsed) items.push(parsed);
    }
  }
  return items;
}

export async function saveNutriWeeklyCheckInSchedule(input: {
  nutritionistId: string;
  patientId: string;
  enabled: boolean;
  weekday: NutriWeekdaySunday0;
  time: string;
  createdBy: string;
}): Promise<NutriWeeklyCheckInSchedule> {
  const time = parseHorarioBrasil(input.time);
  if (!time) throw new Error('Horário inválido.');
  await assertActiveNutritionistPatientLink(input.nutritionistId, input.patientId);

  const ref = doc(
    db,
    NUTRI_CHECKIN_SCHEDULES_COLLECTION,
    nutriCheckInScheduleDocId(input.nutritionistId, input.patientId)
  );
  const existingSnap = await getDoc(ref);
  const now = Timestamp.now();
  const createdAt = existingSnap.exists()
    ? (existingSnap.data()?.createdAt as Timestamp | undefined) ?? now
    : now;

  const payload = {
    patientId: input.patientId,
    nutritionistId: input.nutritionistId,
    enabled: input.enabled,
    weekday: DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
    time,
    timezone: BRASIL_TIMEZONE,
    createdAt,
    updatedAt: now,
    createdBy: existingSnap.exists()
      ? String(existingSnap.data()?.createdBy ?? input.createdBy)
      : input.createdBy,
  };
  await setDoc(ref, payload, { merge: true });
  return deserializeNutriWeeklyCheckInSchedule(payload, input)!;
}

export async function loadWeeklyNutritionCheckInsForPatientsInWeekRange(
  patientIds: string[],
  minWeekKey: string,
  maxWeekKey: string
): Promise<CheckInSemanalNutri[]> {
  const uniqueIds = [...new Set(patientIds.filter(Boolean))];
  const items: CheckInSemanalNutri[] = [];
  const chunkSize = 15;
  for (let i = 0; i < uniqueIds.length; i += chunkSize) {
    const chunk = uniqueIds.slice(i, i + chunkSize);
    const pages = await Promise.all(
      chunk.map(async (pacienteId) => {
        const col = collection(
          db,
          'pacientes_completos',
          pacienteId,
          'nutricao',
          'dados',
          CHECKIN_SEMANAL_NUTRI_COLLECTION
        );
        const q = query(col, where('weekKey', '>=', minWeekKey), where('weekKey', '<=', maxWeekKey));
        const snap = await getDocs(q);
        return snap.docs.map((d) =>
          deserializeCheckInSemanalNutri(d.data() as Record<string, unknown>, d.id)
        );
      })
    );
    for (const page of pages) items.push(...page);
  }
  return items;
}

export function emptyScheduleDraft(nutritionistId: string, patientId: string): Omit<
  NutriWeeklyCheckInSchedule,
  'createdAt' | 'updatedAt' | 'createdBy'
> {
  return {
    patientId,
    nutritionistId,
    enabled: false,
    weekday: DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
    time: DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME,
    timezone: BRASIL_TIMEZONE,
  };
}
