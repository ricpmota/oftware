import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { calculateWhiteLabelLeadScore } from '@/lib/whiteLabel/calculateWhiteLabelLeadScore';
import {
  categoryToTemperatura,
  legacyStatusFromCrmStage,
  parseCrmMetricsFromDoc,
} from '@/lib/whiteLabel/leadCrmMapper';
import { appendLeadTimelineEvent, recordStageChange } from '@/lib/whiteLabel/leadTimelineService';
import type { WhiteLabelCrmStage } from '@/types/leadWhiteLabelCrm';

export type CrmQuickAction =
  | 'meeting_completed'
  | 'proposal_sent'
  | 'negotiation_started'
  | 'closed'
  | 'lost'
  | 'qualified'
  | 'note';

const ACTION_TO_STAGE: Partial<Record<CrmQuickAction, WhiteLabelCrmStage>> = {
  qualified: 'QUALIFICADO',
  meeting_completed: 'REUNIAO_REALIZADA',
  proposal_sent: 'PROPOSTA_ENVIADA',
  negotiation_started: 'NEGOCIACAO',
  closed: 'FECHADO',
  lost: 'PERDIDO',
};

export function buildLeadScoreFields(form: Record<string, string>) {
  const result = calculateWhiteLabelLeadScore(form);
  return {
    leadScore: result.score,
    leadTemperatura: categoryToTemperatura(result.category),
    leadScoreDetail: {
      score: result.score,
      category: result.category,
      updatedAt: FieldValue.serverTimestamp(),
    },
  };
}

export function buildInitialCrmFields() {
  return {
    crm: {
      stage: 'NOVO_LEAD' as const,
      updatedAt: FieldValue.serverTimestamp(),
    },
    crmMetrics: {
      projectedRevenue: 0,
      realizedRevenue: 0,
    },
  };
}

export async function updateLeadCrmStage(
  leadId: string,
  stage: WhiteLabelCrmStage,
  createdBy?: string
) {
  const db = getFirestoreAdmin();
  const ref = db.collection('leadsWhiteLabel').doc(leadId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error('Lead não encontrado.');

  const crmMetrics = parseCrmMetricsFromDoc(existing.data()!);
  const nextMetrics = {
    projectedRevenue: crmMetrics.projectedRevenue ?? 0,
    realizedRevenue:
      stage === 'FECHADO'
        ? crmMetrics.realizedRevenue || crmMetrics.projectedRevenue || 0
        : crmMetrics.realizedRevenue ?? 0,
  };

  await ref.update({
    crm: {
      stage,
      updatedAt: FieldValue.serverTimestamp(),
      owner: existing.data()?.crm?.owner || null,
    },
    crmMetrics: nextMetrics,
    status: legacyStatusFromCrmStage(stage),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await recordStageChange(leadId, stage, createdBy);
}

export async function executeLeadCrmAction(input: {
  leadId: string;
  action: CrmQuickAction;
  note?: string;
  createdBy?: string;
}) {
  if (input.action === 'note') {
    if (!input.note?.trim()) throw new Error('Informe o texto da observação.');
    await appendLeadTimelineEvent({
      leadId: input.leadId,
      type: 'note',
      description: input.note.trim(),
      createdBy: input.createdBy,
    });

    const db = getFirestoreAdmin();
    const ref = db.collection('leadsWhiteLabel').doc(input.leadId);
    const snap = await ref.get();
    if (snap.exists && input.note) {
      const prev = (snap.data()?.observacoes as string) || '';
      const merged = prev ? `${prev}\n\n${input.note.trim()}` : input.note.trim();
      await ref.update({ observacoes: merged, updatedAt: FieldValue.serverTimestamp() });
    }
    return { ok: true };
  }

  const stage = ACTION_TO_STAGE[input.action];
  if (!stage) throw new Error('Ação inválida.');
  await updateLeadCrmStage(input.leadId, stage, input.createdBy);
  return { ok: true, stage };
}

export type WhiteLabelCrmKpis = {
  totalLeads: number;
  hotLeads: number;
  meetingsScheduled: number;
  meetingsCompleted: number;
  proposalsSent: number;
  closedDeals: number;
  projectedRevenue: number;
  realizedRevenue: number;
};

export function computeCrmKpis(leads: FirebaseFirestore.DocumentData[]): WhiteLabelCrmKpis {
  let hotLeads = 0;
  let meetingsScheduled = 0;
  let meetingsCompleted = 0;
  let proposalsSent = 0;
  let closedDeals = 0;
  let projectedRevenue = 0;
  let realizedRevenue = 0;

  for (const lead of leads) {
    const scoreDetail = lead.leadScoreDetail;
    const category = scoreDetail?.category || (lead.leadTemperatura === 'quente' ? 'hot' : lead.leadTemperatura === 'morno' ? 'warm' : 'cold');
    if (category === 'hot') hotLeads += 1;

    const stage = lead.crm?.stage as WhiteLabelCrmStage | undefined;
    if (stage === 'REUNIAO_AGENDADA' || lead.meeting?.availabilityId) meetingsScheduled += 1;
    if (stage === 'REUNIAO_REALIZADA') meetingsCompleted += 1;
    if (stage === 'PROPOSTA_ENVIADA' || stage === 'NEGOCIACAO') proposalsSent += 1;
    if (stage === 'FECHADO') closedDeals += 1;

    const metrics = lead.crmMetrics || {};
    if (stage !== 'FECHADO' && stage !== 'PERDIDO') {
      projectedRevenue += typeof metrics.projectedRevenue === 'number' ? metrics.projectedRevenue : 0;
    }
    if (stage === 'FECHADO') {
      realizedRevenue += typeof metrics.realizedRevenue === 'number' ? metrics.realizedRevenue : 0;
    }
  }

  return {
    totalLeads: leads.length,
    hotLeads,
    meetingsScheduled,
    meetingsCompleted,
    proposalsSent,
    closedDeals,
    projectedRevenue,
    realizedRevenue,
  };
}
