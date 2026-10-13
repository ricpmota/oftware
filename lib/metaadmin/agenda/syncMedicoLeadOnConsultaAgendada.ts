import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
import {
  formatConsultaAgendadaTimelineText,
  shouldAdvanceMedicoLeadToConsultasAgendadas,
} from '@/lib/metaadmin/agenda/consultaLeadSync';

export const LEADS_MEDICO_COLLECTION = 'leads_medico';
export const LEAD_MEDICO_TIMELINE_COLLECTION = 'leadMedicoTimeline';

async function appendTimeline(input: {
  leadId: string;
  medicoId: string;
  description: string;
  type: 'note' | 'stage_changed' | 'lead_created';
}): Promise<void> {
  await getFirestoreAdmin().collection(LEAD_MEDICO_TIMELINE_COLLECTION).add({
    leadId: input.leadId,
    medicoId: input.medicoId,
    type: input.type,
    description: input.description,
    createdBy: 'paciente',
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function findMedicoLead(input: {
  medicoId: string;
  pacienteId: string;
  pacienteEmail: string;
}): Promise<DocumentSnapshot | null> {
  const db = getFirestoreAdmin();
  const byId = await db.collection(LEADS_MEDICO_COLLECTION).doc(input.pacienteId).get();
  if (byId.exists && String(byId.data()?.medicoId || '') === input.medicoId) {
    return byId;
  }

  const listed = await db
    .collection(LEADS_MEDICO_COLLECTION)
    .where('medicoId', '==', input.medicoId)
    .get();
  const emailKey = input.pacienteEmail.trim().toLowerCase();
  const match = listed.docs.find((doc) => {
    const data = doc.data();
    const uid = String(data.uid || '');
    const email = String(data.email || '').toLowerCase();
    return uid === input.pacienteId || (emailKey && email === emailKey);
  });
  return match ?? null;
}

/**
 * Move o lead de Não Qualificado → Consultas Agendadas e registra dia/horário na timeline.
 */
export async function syncMedicoLeadOnConsultaAgendada(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
}): Promise<{ leadId: string | null; moved: boolean }> {
  const medicoId = input.medicoId.trim();
  const pacienteId = input.pacienteId.trim();
  if (!medicoId || !pacienteId) return { leadId: null, moved: false };

  const db = getFirestoreAdmin();
  const pacienteEmail = (input.pacienteEmail || '').trim();
  const snap = await findMedicoLead({
    medicoId,
    pacienteId,
    pacienteEmail,
  });

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
    const leadId = pacienteId;
    await db
      .collection(LEADS_MEDICO_COLLECTION)
      .doc(leadId)
      .set({
        uid: pacienteId,
        email: pacienteEmail,
        name: input.pacienteNome,
        telefone: input.pacientePhone || '',
        status: 'enviado_contato',
        medicoId,
        consulta,
        dataStatus: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...shadowOrganizationFields(),
      });
    await appendTimeline({
      leadId,
      medicoId,
      type: 'lead_created',
      description: `Lead captado — ${input.pacienteNome}`,
    });
    await appendTimeline({
      leadId,
      medicoId,
      type: 'note',
      description,
    });
    return { leadId, moved: true };
  }

  const data = snap.data() || {};
  const status = typeof data.status === 'string' ? data.status : 'nao_qualificado';
  const crmStageKey = typeof data.crmStageKey === 'string' ? data.crmStageKey : undefined;
  const moved = shouldAdvanceMedicoLeadToConsultasAgendadas(status, crmStageKey);
  const update: Record<string, unknown> = {
    consulta,
    updatedAt: FieldValue.serverTimestamp(),
    dataStatus: FieldValue.serverTimestamp(),
  };
  if (moved) {
    update.status = 'enviado_contato';
    update.crmStageKey = FieldValue.delete();
  }

  await snap.ref.set(update, { merge: true });
  await appendTimeline({
    leadId: snap.id,
    medicoId,
    type: 'note',
    description,
  });
  if (moved) {
    await appendTimeline({
      leadId: snap.id,
      medicoId,
      type: 'stage_changed',
      description: 'Estágio alterado: Não Qualificado → Consultas Agendadas',
    });
  }
  return { leadId: snap.id, moved };
}
