import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { WHITELABEL_LEAD_REQUIRED_KEYS } from '@/lib/whiteLabel/leadWhiteLabelQuestions';
import {
  isValidLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelInstagram,
  normalizeLeadWhiteLabelWhatsApp,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { buildInitialCrmFields, buildLeadScoreFields } from '@/lib/whiteLabel/leadCrmService';
import { legacyStatusFromCrmStage } from '@/lib/whiteLabel/leadCrmMapper';
import {
  recordLeadCreated,
  recordMeetingScheduled,
  WHITELABEL_LEAD_TIMELINE_COLLECTION,
} from '@/lib/whiteLabel/leadTimelineService';
import type { LeadWhiteLabelMeeting } from '@/types/leadWhiteLabel';
import { ensureAvailabilitySlot, SlotUnavailableError } from '@/lib/whiteLabel/availabilityService';
import { WHITELABEL_AVAILABILITY_COLLECTION } from '@/lib/whiteLabel/availabilityFirestore';
import { listAvailableSlotsFromEngine } from '@/lib/whiteLabel/availabilityEngine';

function asTrimmedString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export type SubmitWhiteLabelLeadInput = {
  form: Record<string, unknown>;
  availabilityId: string;
};

export type SubmitWhiteLabelLeadResult = {
  leadId: string;
  leadScore: number;
  leadTemperatura: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export async function submitWhiteLabelLeadWithMeeting(
  input: SubmitWhiteLabelLeadInput
): Promise<SubmitWhiteLabelLeadResult> {
  const availabilityId = asTrimmedString(input.availabilityId);
  if (!availabilityId) {
    throw new Error('Selecione um horário para a reunião.');
  }

  const raw: Record<string, string> = {};
  for (const key of WHITELABEL_LEAD_REQUIRED_KEYS) {
    raw[key] = asTrimmedString(input.form[key]);
  }

  const missing = WHITELABEL_LEAD_REQUIRED_KEYS.filter((key) => !raw[key]);
  if (missing.length > 0) {
    throw new Error('Preencha todos os campos obrigatórios.');
  }

  const email = normalizeLeadWhiteLabelEmail(raw.email);
  if (!isValidLeadWhiteLabelEmail(email)) {
    throw new Error('E-mail inválido.');
  }

  const whatsapp = normalizeLeadWhiteLabelWhatsApp(raw.whatsapp);
  if (!whatsapp || whatsapp.length < 12) {
    throw new Error('WhatsApp inválido.');
  }

  const instagram = normalizeLeadWhiteLabelInstagram(raw.instagram);
  const scoreFields = buildLeadScoreFields(raw);

  const engineSlots = await listAvailableSlotsFromEngine();
  const engineMatch = engineSlots.find((s) => s.id === availabilityId);

  let resolvedSlotId = availabilityId;
  let resolvedDate = '';
  let resolvedStart = '';
  let resolvedEnd = '';
  if (engineMatch) {
    const materialized = await ensureAvailabilitySlot({
      availabilityId,
      date: engineMatch.date,
      startTime: engineMatch.startTime,
      endTime: engineMatch.endTime,
      source: 'generated',
    });
    resolvedSlotId = materialized.id;
    resolvedDate = materialized.date;
    resolvedStart = materialized.startTime;
    resolvedEnd = materialized.endTime;
  }

  const db = getFirestoreAdmin();
  const leadRef = db.collection('leadsWhiteLabel').doc();
  const slotRef = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(resolvedSlotId);

  const slotInfo = await db.runTransaction(async (transaction) => {
    const slotSnap = await transaction.get(slotRef);

    if (!slotSnap.exists) {
      throw new SlotUnavailableError('Horário não encontrado.');
    }

    const slotData = slotSnap.data()!;
    if (slotData.status !== 'available') {
      throw new SlotUnavailableError();
    }

    transaction.set(leadRef, {
      nome: raw.nome,
      whatsapp,
      email,
      instagram,
      situacaoProfissional: raw.situacaoProfissional,
      objetivo3Anos: raw.objetivo3Anos,
      interesseReduzirPlantao: raw.interesseReduzirPlantao,
      interessePlataformaMarca: raw.interessePlataformaMarca,
      pacientesMes: raw.pacientesMes,
      realidadeAtual: raw.realidadeAtual,
      interesseExperienciaDigital: raw.interesseExperienciaDigital,
      familiaridadeTecnologia: raw.familiaridadeTecnologia,
      investimentoDisponivel: raw.investimentoDisponivel,
      prazoInicio: raw.prazoInicio,
      faturamentoEsperado: raw.faturamentoEsperado,
      origem: 'whitelabel',
      status: legacyStatusFromCrmStage('REUNIAO_AGENDADA'),
      ...scoreFields,
      crm: {
        stage: 'REUNIAO_AGENDADA',
        updatedAt: FieldValue.serverTimestamp(),
      },
      crmMetrics: {
        projectedRevenue: 0,
        realizedRevenue: 0,
      },
      meeting: {
        availabilityId: resolvedSlotId,
        date: slotData.date,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        status: 'scheduled',
        createdAt: FieldValue.serverTimestamp(),
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(slotRef, {
      status: 'reserved',
      leadId: leadRef.id,
      doctorName: raw.nome,
      doctorEmail: email,
      doctorPhone: whatsapp,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      date: slotData.date as string,
      startTime: slotData.startTime as string,
      endTime: slotData.endTime as string,
    };
  });

  const finalSlot = slotInfo.date ? slotInfo : { date: resolvedDate, startTime: resolvedStart, endTime: resolvedEnd };

  await recordLeadCreated(leadRef.id, raw.nome);
  await recordMeetingScheduled(leadRef.id, finalSlot.date, finalSlot.startTime);

  return {
    leadId: leadRef.id,
    leadScore: scoreFields.leadScore,
    leadTemperatura: scoreFields.leadTemperatura,
    availabilityId: resolvedSlotId,
    date: finalSlot.date,
    startTime: finalSlot.startTime,
    endTime: finalSlot.endTime,
  };
}

export async function updateLeadMeeting(
  leadId: string,
  meeting: Partial<LeadWhiteLabelMeeting> & { status: LeadWhiteLabelMeeting['status'] }
) {
  const db = getFirestoreAdmin();
  const ref = db.collection('leadsWhiteLabel').doc(leadId);
  const existing = await ref.get();
  if (!existing.exists) {
    throw new Error('Lead não encontrado.');
  }

  const currentMeeting = (existing.data()?.meeting || {}) as LeadWhiteLabelMeeting;
  const nextMeeting = {
    ...currentMeeting,
    ...meeting,
  };

  const update: Record<string, unknown> = {
    meeting: {
      ...nextMeeting,
      createdAt: currentMeeting.createdAt || FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (meeting.status === 'scheduled' && meeting.googleMeetLink) {
    update.status = legacyStatusFromCrmStage('REUNIAO_AGENDADA');
    update.crm = {
      stage: 'REUNIAO_AGENDADA',
      updatedAt: FieldValue.serverTimestamp(),
      owner: existing.data()?.crm?.owner || null,
    };
  }

  await ref.update(update);
}

export async function deleteWhiteLabelLead(leadId: string) {
  const db = getFirestoreAdmin();
  const leadRef = db.collection('leadsWhiteLabel').doc(leadId);
  const leadSnap = await leadRef.get();

  if (!leadSnap.exists) {
    throw new Error('Lead não encontrado.');
  }

  const lead = leadSnap.data()!;
  const availabilityId = lead.meeting?.availabilityId as string | undefined;

  if (availabilityId) {
    const slotRef = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(availabilityId);
    const slotSnap = await slotRef.get();
    if (slotSnap.exists && slotSnap.data()?.leadId === leadId) {
      await slotRef.update({
        status: 'available',
        leadId: FieldValue.delete(),
        doctorName: FieldValue.delete(),
        doctorEmail: FieldValue.delete(),
        doctorPhone: FieldValue.delete(),
        googleCalendarEventId: FieldValue.delete(),
        googleMeetLink: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  const timelineSnap = await db
    .collection(WHITELABEL_LEAD_TIMELINE_COLLECTION)
    .where('leadId', '==', leadId)
    .get();

  const batch = db.batch();
  for (const doc of timelineSnap.docs) {
    batch.delete(doc.ref);
  }
  batch.delete(leadRef);
  await batch.commit();
}
