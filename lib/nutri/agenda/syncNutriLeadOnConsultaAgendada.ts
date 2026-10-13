import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PACIENTE_NUTRICIONISTA } from '@/features/metaNutri/metaNutri.constants';
import {
  formatConsultaAgendadaTimelineText,
  formatConsultaAlteradaTimelineText,
  shouldAdvanceNutriLeadToConsultasAgendadas,
} from '@/lib/nutri/agenda/consultaLeadSync';

export const LEADS_NUTRI_COLLECTION = 'leads_nutri';
export const LEAD_PROFISSIONAL_TIMELINE_COLLECTION = 'leadProfissionalTimeline';

function nutriLeadDocId(pacienteId: string, nutricionistaId: string): string {
  return `${pacienteId}_${nutricionistaId}`;
}

async function appendTimeline(input: {
  leadId: string;
  profissionalId: string;
  description: string;
  type: 'consulta_agendada' | 'stage_changed' | 'lead_created';
}): Promise<void> {
  await getFirestoreAdmin().collection(LEAD_PROFISSIONAL_TIMELINE_COLLECTION).add({
    leadId: input.leadId,
    role: 'nutri',
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
export async function syncNutriLeadOnConsultaAgendada(input: {
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
}): Promise<{ leadId: string | null; moved: boolean }> {
  const nutricionistaId = input.nutricionistaId.trim();
  const pacienteId = input.pacienteId.trim();
  if (!nutricionistaId || !pacienteId) return { leadId: null, moved: false };

  const db = getFirestoreAdmin();
  const preferredId = nutriLeadDocId(pacienteId, nutricionistaId);
  let snap: DocumentSnapshot | null = await db.collection(LEADS_NUTRI_COLLECTION).doc(preferredId).get();

  if (!snap.exists) {
    const listed = await db
      .collection(LEADS_NUTRI_COLLECTION)
      .where('profissionalId', '==', nutricionistaId)
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
    const vinculoSnap = await db.collection(COL_PACIENTE_NUTRICIONISTA).doc(preferredId).get();
    const vinculo = (vinculoSnap.data() || {}) as { medicoId?: string; medicoNome?: string };
    await db.collection(LEADS_NUTRI_COLLECTION).doc(preferredId).set({
      pacienteId,
      vinculoId: preferredId,
      name: input.pacienteNome,
      email: input.pacienteEmail || '',
      telefone: input.pacientePhone || '',
      status: 'consultas_agendadas',
      profissionalId: nutricionistaId,
      role: 'nutri',
      medicoId: typeof vinculo.medicoId === 'string' ? vinculo.medicoId : '',
      medicoNome: typeof vinculo.medicoNome === 'string' ? vinculo.medicoNome : 'Médico',
      consulta,
      dataStatus: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await appendTimeline({
      leadId: preferredId,
      profissionalId: nutricionistaId,
      type: 'consulta_agendada',
      description,
    });
    return { leadId: preferredId, moved: true };
  }

  const data = snap.data() || {};
  const status = typeof data.status === 'string' ? data.status : 'nao_atendido';
  const crmStageKey = typeof data.crmStageKey === 'string' ? data.crmStageKey : undefined;
  const moved = shouldAdvanceNutriLeadToConsultasAgendadas(status, crmStageKey);
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
    profissionalId: nutricionistaId,
    type: 'consulta_agendada',
    description,
  });
  if (moved) {
    await appendTimeline({
      leadId: snap.id,
      profissionalId: nutricionistaId,
      type: 'stage_changed',
      description: 'Estágio alterado: Não atendido → Consultas Agendadas',
    });
  }
  return { leadId: snap.id, moved };
}

export async function syncNutriLeadOnConsultaAlterada(input: {
  nutricionistaId: string;
  pacienteId: string;
  date: string;
  startTime: string;
  endTime: string;
  observacoes?: string;
  timeChanged?: boolean;
}): Promise<void> {
  const nutricionistaId = input.nutricionistaId.trim();
  const pacienteId = input.pacienteId.trim();
  if (!nutricionistaId || !pacienteId) return;

  const db = getFirestoreAdmin();
  const preferredId = nutriLeadDocId(pacienteId, nutricionistaId);
  let snap = await db.collection(LEADS_NUTRI_COLLECTION).doc(preferredId).get();
  if (!snap.exists) {
    const listed = await db
      .collection(LEADS_NUTRI_COLLECTION)
      .where('profissionalId', '==', nutricionistaId)
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
    profissionalId: nutricionistaId,
    type: 'consulta_agendada',
    description,
  });
}
