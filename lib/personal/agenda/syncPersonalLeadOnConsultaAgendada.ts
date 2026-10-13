import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PACIENTE_PERSONAL_TRAINER } from '@/features/metaPersonal/metaPersonal.constants';
import {
  formatConsultaAgendadaTimelineText,
  formatConsultaAlteradaTimelineText,
  shouldAdvancePersonalLeadToConsultasAgendadas,
} from '@/lib/personal/agenda/consultaLeadSync';

export const LEADS_PERSONAL_COLLECTION = 'leads_personal';
export const LEAD_PROFISSIONAL_TIMELINE_COLLECTION = 'leadProfissionalTimeline';

function personalLeadDocId(pacienteId: string, personalTrainerId: string): string {
  return `${pacienteId}_${personalTrainerId}`;
}

async function appendTimeline(input: {
  leadId: string;
  profissionalId: string;
  description: string;
  type: 'consulta_agendada' | 'stage_changed' | 'lead_created';
}): Promise<void> {
  await getFirestoreAdmin().collection(LEAD_PROFISSIONAL_TIMELINE_COLLECTION).add({
    leadId: input.leadId,
    role: 'personal',
    profissionalId: input.profissionalId,
    type: input.type,
    description: input.description,
    createdBy: 'paciente',
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Move o lead de Não atendido → Consultas Agendadas e registra dia/horário na timeline.
 */
export async function syncPersonalLeadOnConsultaAgendada(input: {
  personalTrainerId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
}): Promise<{ leadId: string | null; moved: boolean }> {
  const personalTrainerId = input.personalTrainerId.trim();
  const pacienteId = input.pacienteId.trim();
  if (!personalTrainerId || !pacienteId) return { leadId: null, moved: false };

  const db = getFirestoreAdmin();
  const preferredId = personalLeadDocId(pacienteId, personalTrainerId);
  let snap: DocumentSnapshot | null = await db.collection(LEADS_PERSONAL_COLLECTION).doc(preferredId).get();

  if (!snap.exists) {
    const listed = await db
      .collection(LEADS_PERSONAL_COLLECTION)
      .where('profissionalId', '==', personalTrainerId)
      .get();
    const match = listed.docs.find((doc) => String(doc.data().pacienteId || '') === pacienteId);
    snap = match ?? null;
  }

  const consulta = {
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    availabilityId: input.availabilityId,
  };
  const description = formatConsultaAgendadaTimelineText({
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
  });

  if (!snap || !snap.exists) {
    const vinculoSnap = await db.collection(COL_PACIENTE_PERSONAL_TRAINER).doc(preferredId).get();
    const vinculo = (vinculoSnap.data() || {}) as { medicoId?: string; medicoNome?: string };
    await db.collection(LEADS_PERSONAL_COLLECTION).doc(preferredId).set({
      pacienteId,
      vinculoId: preferredId,
      name: input.pacienteNome,
      email: input.pacienteEmail || '',
      telefone: input.pacientePhone || '',
      status: 'consultas_agendadas',
      profissionalId: personalTrainerId,
      role: 'personal',
      medicoId: typeof vinculo.medicoId === 'string' ? vinculo.medicoId : '',
      medicoNome: typeof vinculo.medicoNome === 'string' ? vinculo.medicoNome : 'Médico',
      consulta,
      dataStatus: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await appendTimeline({
      leadId: preferredId,
      profissionalId: personalTrainerId,
      type: 'consulta_agendada',
      description,
    });
    return { leadId: preferredId, moved: true };
  }

  const data = snap.data() || {};
  const status = typeof data.status === 'string' ? data.status : 'nao_atendido';
  const crmStageKey = typeof data.crmStageKey === 'string' ? data.crmStageKey : undefined;
  const moved = shouldAdvancePersonalLeadToConsultasAgendadas(status, crmStageKey);
  const update: Record<string, unknown> = {
    consulta,
    updatedAt: FieldValue.serverTimestamp(),
    dataStatus: FieldValue.serverTimestamp(),
  };
  if (moved) {
    update.status = 'consultas_agendadas';
    update.crmStageKey = FieldValue.delete();
  }

  await snap.ref.set(update, { merge: true });
  await appendTimeline({
    leadId: snap.id,
    profissionalId: personalTrainerId,
    type: 'consulta_agendada',
    description,
  });
  if (moved) {
    await appendTimeline({
      leadId: snap.id,
      profissionalId: personalTrainerId,
      type: 'stage_changed',
      description: 'Estágio alterado: Não atendido → Consultas Agendadas',
    });
  }
  return { leadId: snap.id, moved };
}

export async function syncPersonalLeadOnConsultaAlterada(input: {
  personalTrainerId: string;
  pacienteId: string;
  date: string;
  startTime: string;
  endTime: string;
  observacoes?: string;
  timeChanged?: boolean;
}): Promise<void> {
  const personalTrainerId = input.personalTrainerId.trim();
  const pacienteId = input.pacienteId.trim();
  if (!personalTrainerId || !pacienteId) return;

  const db = getFirestoreAdmin();
  const preferredId = personalLeadDocId(pacienteId, personalTrainerId);
  let snap = await db.collection(LEADS_PERSONAL_COLLECTION).doc(preferredId).get();
  if (!snap.exists) {
    const listed = await db
      .collection(LEADS_PERSONAL_COLLECTION)
      .where('profissionalId', '==', personalTrainerId)
      .get();
    const match = listed.docs.find((doc) => String(doc.data().pacienteId || '') === pacienteId);
    if (!match) return;
    snap = match;
  }

  await snap.ref.set(
    {
      consulta: {
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        observacoes: input.observacoes || '',
      },
      updatedAt: FieldValue.serverTimestamp(),
      dataStatus: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  const noteOnly = input.timeChanged === false;
  const description = noteOnly
    ? input.observacoes?.trim()
      ? `Observação da consulta: ${input.observacoes.trim()}`
      : ''
    : formatConsultaAlteradaTimelineText({
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        observacoes: input.observacoes,
      });
  if (!description) return;
  await appendTimeline({
    leadId: snap.id,
    profissionalId: personalTrainerId,
    type: 'consulta_agendada',
    description,
  });
}
