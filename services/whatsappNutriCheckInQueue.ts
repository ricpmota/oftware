import { ensureNutriCheckInPublicLink, nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import {
  deserializeNutriWeeklyCheckInSchedule,
  getScheduledDateForNutritionWeek,
  NUTRI_CHECKIN_SCHEDULES_COLLECTION,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import { loadCheckInSemanalNutriAdmin } from '@/lib/nutri/checkInSemanalNutriPersist.server';
import { getNutritionTreatmentWindow } from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import {
  NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
  pickNutriCheckInEnvioBadge as pickNutriCheckInEnvioBadgeFromLib,
  type NutriCheckInEnvioBadge as NutriCheckInEnvioBadgeFromLib,
} from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import { planNutriCheckInWhatsAppQueueItems } from '@/lib/nutri/planNutriCheckInWhatsAppQueue';
import { shouldSendNutriCheckInWhatsApp } from '@/lib/nutri/shouldSendNutriCheckInWhatsApp';
import { CHECKIN_SEMANAL_NUTRI_COLLECTION } from '@/lib/nutri/checkInSemanalNutriTypes';
import { getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { addDaysToYmd } from '@/lib/nutri/checkInSemanalNutriYmd';
import { resolveDefaultTemplateIdForAutomation } from '@/lib/metaadmingeral/automationOrganizationSettings';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { brasiliaWallTimeToInstant, getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { getAutomationDoctorSetting } from '@/services/automationDoctorSettingsService';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  enqueueWhatsappAutomationItem,
  listQueueItemsByPatient,
  markQueueItemSkipped,
} from '@/services/whatsappAutomationQueueService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { WhatsappAutomationQueueItem } from '@/types/whatsappAutomationQueue';

export type NutriCheckInQueueEnqueueResult = {
  enqueued: number;
  updated: number;
  skippedNoPhone: number;
};

type NutriCheckInSettingSlice = {
  organizationId: string;
  automationId: string;
};

async function listExistingNutriCheckInWeekKeys(patientId: string): Promise<Set<string>> {
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(patientId)
    .collection('nutricao')
    .doc('dados')
    .collection(CHECKIN_SEMANAL_NUTRI_COLLECTION)
    .get();
  return new Set(snap.docs.map((doc) => doc.id));
}

async function loadSchedulesForNutritionist(nutritionistId: string) {
  const snap = await getFirestoreAdmin()
    .collection(NUTRI_CHECKIN_SCHEDULES_COLLECTION)
    .where('nutritionistId', '==', nutritionistId)
    .get();
  return snap.docs
    .map((doc) =>
      deserializeNutriWeeklyCheckInSchedule((doc.data() || {}) as Record<string, unknown>, {
        nutritionistId,
        patientId: String(doc.data()?.patientId ?? ''),
      })
    )
    .filter((schedule): schedule is NonNullable<typeof schedule> => Boolean(schedule));
}

async function resolveTemplateId(organizationId: string, automationId: string): Promise<string | null> {
  const orgSettings = await listSettingsByOrganizationId(organizationId);
  const orgSetting = orgSettings.find((item) => item.automationId === automationId);
  if (!orgSetting?.enabled) return null;
  return orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(automationId) ?? null;
}

export async function skipPendingNutriCheckInWhatsAppItems(
  patientId: string,
  weekKey: string,
  reason: string
): Promise<number> {
  const items = await listQueueItemsByPatient(patientId);
  let skipped = 0;
  for (const item of items) {
    if (item.status !== 'pending') continue;
    if (item.automationId !== NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID) continue;
    if (item.dateKey !== weekKey) continue;
    await markQueueItemSkipped(item.id, reason);
    skipped += 1;
  }
  return skipped;
}

export async function enqueueNutriCheckInWhatsAppQueue(params: {
  nutritionistId: string;
  setting: NutriCheckInSettingSlice;
  patients: Array<{ paciente: PacienteCompleto; telefone: string | null }>;
  todayKey: string;
  horizonKey: string;
}): Promise<NutriCheckInQueueEnqueueResult> {
  const orgId = params.setting.organizationId?.trim();
  if (!orgId) return { enqueued: 0, updated: 0, skippedNoPhone: 0 };

  const templateId = await resolveTemplateId(orgId, NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID);
  if (!templateId) return { enqueued: 0, updated: 0, skippedNoPhone: 0 };

  const schedules = await loadSchedulesForNutritionist(params.nutritionistId);
  const patientsById = new Map(params.patients.map((row) => [row.paciente.id, row]));
  let enqueued = 0;
  let updated = 0;
  let skippedNoPhone = 0;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;
    const row = patientsById.get(schedule.patientId);
    if (!row) continue;
    const window = getNutritionTreatmentWindow(row.paciente);
    const existingWeekKeys = await listExistingNutriCheckInWeekKeys(schedule.patientId);
    const horizonWeekKeys = [...existingWeekKeys].filter(
      (weekKey) => weekKey >= addDaysToYmd(params.todayKey, -7) && weekKey <= params.horizonKey
    );
    for (const weekKey of horizonWeekKeys) {
      await skipPendingNutriCheckInWhatsAppItems(
        schedule.patientId,
        weekKey,
        'Check-in Semanal já respondido.'
      );
    }

    const planned = planNutriCheckInWhatsAppQueueItems({
      schedule,
      statusTratamento: row.paciente.statusTratamento,
      window,
      existingWeekKeys,
      todayKey: params.todayKey,
      horizonKey: params.horizonKey,
    });

    if (planned.length === 0) continue;
    if (!row.telefone) {
      skippedNoPhone += 1;
      continue;
    }

    for (const item of planned) {
      const result = await enqueueWhatsappAutomationItem({
        automationId: NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
        organizationId: orgId,
        doctorId: params.nutritionistId,
        patientId: schedule.patientId,
        patientName: row.paciente.nome ?? row.paciente.dadosIdentificacao?.nomeCompleto ?? 'Paciente',
        phone: row.telefone,
        dateKey: item.weekKey,
        scheduledFor: brasiliaWallTimeToInstant(item.scheduledDateKey, item.scheduledTime),
        scheduledDateKey: item.scheduledDateKey,
        scheduledTime: item.scheduledTime,
        milestone: item.milestone,
        templateId,
        semana: 0,
        dose: 0,
      });
      if (result.created) enqueued += 1;
      else if (result.updated) updated += 1;
    }
  }

  return { enqueued, updated, skippedNoPhone };
}

export async function rebuildNutriCheckInWhatsAppQueueForPatient(params: {
  nutritionistId: string;
  patientId: string;
}): Promise<{ enqueued: number; updated: number; reason?: string }> {
  const nutritionistId = params.nutritionistId.trim();
  const patientId = params.patientId.trim();
  if (!nutritionistId || !patientId) {
    return { enqueued: 0, updated: 0, reason: 'Ids vazios.' };
  }

  const setting = await getAutomationDoctorSetting(nutritionistId, NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID);
  if (!setting?.enabled) {
    return { enqueued: 0, updated: 0, reason: 'Automação Check-in Semanal desativada.' };
  }

  const db = getFirestoreAdmin();
  const snap = await db.collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) {
    return { enqueued: 0, updated: 0, reason: 'Paciente não encontrado.' };
  }
  const raw = snap.data() as Record<string, unknown>;
  const paciente = normalizePacienteDocument(patientId, raw) as unknown as PacienteCompleto;

  let telefone: string | null = tryResolvePhoneFromPacienteDoc(raw);

  const todayKey = getBrasilDateTimeParts().dateKey;
  const horizonKey = addDaysToYmd(todayKey, 45);

  const result = await enqueueNutriCheckInWhatsAppQueue({
    nutritionistId,
    setting: { organizationId: setting.organizationId, automationId: setting.automationId },
    patients: [{ paciente, telefone }],
    todayKey,
    horizonKey,
  });

  return { enqueued: result.enqueued, updated: result.updated };
}

export type NutriCheckInQueueRevalidation = {
  send: boolean;
  skipReason?: string;
  reads: number;
  linkUrl?: string;
};

export async function revalidateNutriCheckInWhatsAppQueueItem(
  item: WhatsappAutomationQueueItem
): Promise<NutriCheckInQueueRevalidation> {
  const db = getFirestoreAdmin();
  let reads = 0;

  const doctorSetting = await getAutomationDoctorSetting(item.doctorId, NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID);
  reads += 1;

  const scheduleSnap = await db
    .collection(NUTRI_CHECKIN_SCHEDULES_COLLECTION)
    .doc(`${item.doctorId}_${item.patientId}`)
    .get();
  reads += 1;
  const schedule = scheduleSnap.exists
    ? deserializeNutriWeeklyCheckInSchedule((scheduleSnap.data() || {}) as Record<string, unknown>, {
        nutritionistId: item.doctorId,
        patientId: item.patientId,
      })
    : null;

  const hasActiveVinculo = await nutritionistHasActivePatientLink(db, item.doctorId, item.patientId);
  reads += 1;

  const patientSnap = await db.collection('pacientes_completos').doc(item.patientId).get();
  reads += 1;
  if (!patientSnap.exists) {
    return { send: false, skipReason: 'Paciente não encontrado.', reads };
  }
  const paciente = normalizePacienteDocument(
    item.patientId,
    patientSnap.data() as Record<string, unknown>
  ) as unknown as PacienteCompleto;

  const clinical = await loadCheckInSemanalNutriAdmin(db, item.patientId, item.dateKey);
  reads += 1;

  let scheduledDate = item.scheduledDateKey;
  try {
    const week = getNutritionWeek(item.dateKey);
    if (schedule) {
      scheduledDate = getScheduledDateForNutritionWeek(week, schedule.weekday);
    }
  } catch {
    scheduledDate = item.scheduledDateKey;
  }

  const decision = shouldSendNutriCheckInWhatsApp({
    globalAutomationEnabled: doctorSetting?.enabled === true,
    scheduleEnabled: schedule?.enabled === true,
    hasActiveVinculo,
    statusTratamento: paciente.statusTratamento,
    window: getNutritionTreatmentWindow(paciente),
    scheduledDate,
    hasClinicalRecord: Boolean(clinical),
    hasPhone: Boolean(item.phone?.trim()),
  });

  if (!decision.send) {
    return { send: false, skipReason: decision.skipReason, reads };
  }

  const { url } = await ensureNutriCheckInPublicLink(db, {
    nutritionistId: item.doctorId,
    patientId: item.patientId,
    weekKey: item.dateKey,
    createdBy: item.doctorId,
  });
  reads += 1;

  return { send: true, reads, linkUrl: url };
}

export type NutriCheckInEnvioBadge = NutriCheckInEnvioBadgeFromLib;

export function pickNutriCheckInEnvioBadge(
  items: Array<Pick<WhatsappAutomationQueueItem, 'status' | 'dateKey' | 'patientId' | 'automationId' | 'sentAt'>>
): Record<string, NutriCheckInEnvioBadge> {
  return pickNutriCheckInEnvioBadgeFromLib(items);
}
