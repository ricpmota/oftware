import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { WhiteLabelCrmStage, WhiteLabelTimelineEventType } from '@/types/leadWhiteLabelCrm';
import { WHITELABEL_CRM_STAGES } from '@/types/leadWhiteLabelCrm';

export const WHITELABEL_LEAD_TIMELINE_COLLECTION = 'whiteLabelLeadTimeline';

const STAGE_TIMELINE_TYPE: Partial<Record<WhiteLabelCrmStage, WhiteLabelTimelineEventType>> = {
  QUALIFICADO: 'qualified',
  REUNIAO_AGENDADA: 'meeting_scheduled',
  REUNIAO_REALIZADA: 'meeting_completed',
  PROPOSTA_ENVIADA: 'proposal_sent',
  NEGOCIACAO: 'negotiation_started',
  FECHADO: 'closed',
  PERDIDO: 'lost',
};

function stageLabel(stage: WhiteLabelCrmStage): string {
  return WHITELABEL_CRM_STAGES.find((s) => s.value === stage)?.label || stage;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
}

export async function appendLeadTimelineEvent(input: {
  leadId: string;
  type: WhiteLabelTimelineEventType;
  description: string;
  createdBy?: string;
}) {
  const db = getFirestoreAdmin();
  const docRef = await db.collection(WHITELABEL_LEAD_TIMELINE_COLLECTION).add({
    leadId: input.leadId,
    type: input.type,
    description: input.description,
    createdBy: input.createdBy || null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return docRef.id;
}

export async function listLeadTimeline(leadId: string) {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(WHITELABEL_LEAD_TIMELINE_COLLECTION)
    .where('leadId', '==', leadId)
    .get();

  const events = snap.docs
    .map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        leadId: d.leadId,
        type: d.type as WhiteLabelTimelineEventType,
        description: d.description || '',
        createdBy: d.createdBy || undefined,
        createdAt: toIso(d.createdAt),
      };
    })
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return events;
}

export async function recordLeadCreated(leadId: string, nome: string) {
  await appendLeadTimelineEvent({
    leadId,
    type: 'lead_created',
    description: `Lead criado — ${nome}`,
  });
}

export async function recordClientTrackingEvents(
  leadId: string,
  events: { type: string; createdAt: string; description?: string }[]
) {
  for (const event of events) {
    await appendLeadTimelineEvent({
      leadId,
      type: 'note',
      description: event.description || event.type,
    });
  }
}

export async function recordMeetingScheduled(leadId: string, date: string, startTime: string) {
  await appendLeadTimelineEvent({
    leadId,
    type: 'meeting_scheduled',
    description: `Reunião agendada para ${date} às ${startTime}`,
  });
}

export async function recordStageChange(
  leadId: string,
  stage: WhiteLabelCrmStage,
  createdBy?: string,
  customDescription?: string
) {
  const type = STAGE_TIMELINE_TYPE[stage] || 'stage_changed';
  const description = customDescription || `Estágio atualizado para ${stageLabel(stage)}`;
  await appendLeadTimelineEvent({ leadId, type, description, createdBy });
}
