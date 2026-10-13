import type { Firestore } from 'firebase-admin/firestore';
import { allocateUniquePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { COL_NUTRICIONISTAS, COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import {
  deserializeNutriWeeklyCheckInSchedule,
  getScheduledDateForNutritionWeek,
  NUTRI_CHECKIN_SCHEDULES_COLLECTION,
  nutriCheckInScheduleDocId,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import {
  deserializeNutriCheckInPublicLink,
  NUTRI_CHECKIN_LINKS_COLLECTION,
  nutriCheckInPublicLinkKey,
  nutriCheckInPublicPath,
  type NutriCheckInPublicLink,
} from '@/lib/nutri/checkInSemanalNutriPublicLink';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';

export async function nutritionistHasActivePatientLink(
  db: Firestore,
  nutritionistId: string,
  patientId: string
): Promise<boolean> {
  const snap = await db
    .collection(COL_PACIENTE_NUTRICIONISTA)
    .where('nutricionistaId', '==', nutritionistId)
    .where('pacienteId', '==', patientId)
    .where('status', '==', 'ativo')
    .limit(1)
    .get();
  return !snap.empty;
}

export async function doctorOwnsPatient(
  db: Firestore,
  authUid: string,
  patientId: string
): Promise<boolean> {
  const uid = authUid.trim();
  const id = patientId.trim();
  if (!uid || !id) return false;
  const patientSnap = await db.collection('pacientes_completos').doc(id).get();
  if (!patientSnap.exists) return false;
  const medicoId = String(patientSnap.data()?.medicoResponsavelId || '').trim();
  if (!medicoId) return false;
  if (medicoId === uid) return true;
  const medicoSnap = await db.collection('medicos').doc(medicoId).get();
  if (medicoSnap.exists && String(medicoSnap.data()?.userId || '').trim() === uid) return true;
  const byUser = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  return !byUser.empty && byUser.docs[0].id === medicoId;
}

export async function activeNutritionistIdForPatient(
  db: Firestore,
  patientId: string
): Promise<string | null> {
  const snap = await db
    .collection(COL_PACIENTE_NUTRICIONISTA)
    .where('pacienteId', '==', patientId)
    .where('status', '==', 'ativo')
    .limit(1)
    .get();
  if (snap.empty) return null;
  const id = String(snap.docs[0]?.data()?.nutricionistaId || '').trim();
  return id || null;
}

export async function loadNutriWeeklyCheckInScheduleAdmin(
  db: Firestore,
  nutritionistId: string,
  patientId: string
) {
  const snap = await db
    .collection(NUTRI_CHECKIN_SCHEDULES_COLLECTION)
    .doc(nutriCheckInScheduleDocId(nutritionistId, patientId))
    .get();
  if (!snap.exists) return null;
  return deserializeNutriWeeklyCheckInSchedule((snap.data() || {}) as Record<string, unknown>, {
    nutritionistId,
    patientId,
  });
}

export async function loadNutritionistDisplayNameAdmin(
  db: Firestore,
  nutritionistId: string
): Promise<string> {
  const snap = await db.collection(COL_NUTRICIONISTAS).doc(nutritionistId).get();
  const nome = String(snap.data()?.nome || '').trim();
  return nome;
}

/**
 * Garante documento em nutri_checkin_links e devolve token + URL.
 * Idempotente por nutritionistId + patientId + weekKey.
 * Não cria checkinsSemanais/{weekKey}.
 */
export async function ensureNutriCheckInPublicLink(
  db: Firestore,
  params: {
    nutritionistId: string;
    patientId: string;
    weekKey: string;
    createdBy?: string;
  },
  baseUrl?: string
): Promise<{ token: string; url: string; link: NutriCheckInPublicLink; created: boolean }> {
  const nutritionistId = params.nutritionistId.trim();
  const patientId = params.patientId.trim();
  const week = getNutritionWeek(params.weekKey.trim());
  const key = nutriCheckInPublicLinkKey(nutritionistId, patientId, week.weekKey);

  const schedule = await loadNutriWeeklyCheckInScheduleAdmin(db, nutritionistId, patientId);
  const scheduledDate =
    schedule?.enabled === true ? getScheduledDateForNutritionWeek(week, schedule.weekday) : undefined;
  const scheduledTime = schedule?.enabled === true ? schedule.time : undefined;

  const existingSnap = await db
    .collection(NUTRI_CHECKIN_LINKS_COLLECTION)
    .where('key', '==', key)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    const docSnap = existingSnap.docs[0]!;
    const link = deserializeNutriCheckInPublicLink(docSnap.id, (docSnap.data() || {}) as Record<string, unknown>);
    if (!link) {
      throw new Error('Link público inconsistente.');
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (scheduledDate && scheduledDate !== link.scheduledDate) patch.scheduledDate = scheduledDate;
    if (scheduledTime && scheduledTime !== link.scheduledTime) patch.scheduledTime = scheduledTime;
    if (week.weekStart !== link.weekStart) patch.weekStart = week.weekStart;
    if (week.weekEnd !== link.weekEnd) patch.weekEnd = week.weekEnd;
    if (Object.keys(patch).length > 1) {
      await docSnap.ref.update(patch);
    }

    const token = docSnap.id;
    return {
      token,
      url: buildOrganizacaoPublicUrl(nutriCheckInPublicPath(token), baseUrl),
      created: false,
      link: {
        ...link,
        scheduledDate: (patch.scheduledDate as string | undefined) ?? link.scheduledDate,
        scheduledTime: (patch.scheduledTime as string | undefined) ?? link.scheduledTime,
        weekStart: (patch.weekStart as string | undefined) ?? link.weekStart,
        weekEnd: (patch.weekEnd as string | undefined) ?? link.weekEnd,
      },
    };
  }

  const payload: Record<string, unknown> = {
    patientId,
    nutritionistId,
    weekKey: week.weekKey,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    key,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: params.createdBy || nutritionistId,
    ...shadowOrganizationFields(),
  };
  if (scheduledDate) payload.scheduledDate = scheduledDate;
  if (scheduledTime) payload.scheduledTime = scheduledTime;

  const token = await allocateUniquePublicLinkToken(db, NUTRI_CHECKIN_LINKS_COLLECTION, payload);
  const link = deserializeNutriCheckInPublicLink(token, payload);
  if (!link) throw new Error('Falha ao materializar o link público.');

  return {
    token,
    url: buildOrganizacaoPublicUrl(nutriCheckInPublicPath(token), baseUrl),
    created: true,
    link,
  };
}
