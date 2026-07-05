import { Timestamp } from 'firebase-admin/firestore';
import type { LeadWhiteLabelStatus, LeadWhiteLabelTemperatura } from '@/types/leadWhiteLabel';
import type {
  WhiteLabelCrmStage,
  WhiteLabelLeadCrm,
  WhiteLabelLeadCrmMetrics,
  WhiteLabelLeadScoreCategory,
  WhiteLabelLeadScoreDetail,
} from '@/types/leadWhiteLabelCrm';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export function legacyStatusFromCrmStage(stage: WhiteLabelCrmStage): LeadWhiteLabelStatus {
  switch (stage) {
    case 'QUALIFICADO':
      return 'qualificado';
    case 'REUNIAO_AGENDADA':
      return 'reuniao_agendada';
    case 'FECHADO':
      return 'fechado';
    case 'PERDIDO':
      return 'perdido';
    case 'REUNIAO_REALIZADA':
    case 'PROPOSTA_ENVIADA':
    case 'NEGOCIACAO':
      return 'em_contato';
    default:
      return 'novo';
  }
}

export function inferCrmStageFromLegacy(
  status: LeadWhiteLabelStatus,
  meetingScheduled?: boolean
): WhiteLabelCrmStage {
  if (meetingScheduled) return 'REUNIAO_AGENDADA';
  switch (status) {
    case 'qualificado':
      return 'QUALIFICADO';
    case 'reuniao_agendada':
      return 'REUNIAO_AGENDADA';
    case 'fechado':
      return 'FECHADO';
    case 'perdido':
      return 'PERDIDO';
    case 'em_contato':
      return 'QUALIFICADO';
    default:
      return 'NOVO_LEAD';
  }
}

export function categoryToTemperatura(category: WhiteLabelLeadScoreCategory): LeadWhiteLabelTemperatura {
  if (category === 'hot') return 'quente';
  if (category === 'warm') return 'morno';
  return 'frio';
}

export function parseLeadCrmFromDoc(data: FirebaseFirestore.DocumentData): WhiteLabelLeadCrm {
  const meetingScheduled = !!data.meeting?.availabilityId;
  const stage =
    (data.crm?.stage as WhiteLabelCrmStage | undefined) ||
    inferCrmStageFromLegacy(data.status || 'novo', meetingScheduled);

  return {
    stage,
    updatedAt: toDate(data.crm?.updatedAt),
    owner: data.crm?.owner || undefined,
  };
}

export function parseLeadScoreFromDoc(data: FirebaseFirestore.DocumentData): WhiteLabelLeadScoreDetail {
  const fromNested = data.leadScoreDetail;
  if (fromNested && typeof fromNested.score === 'number') {
    return {
      score: fromNested.score,
      category: fromNested.category || 'cold',
      updatedAt: toDate(fromNested.updatedAt),
    };
  }

  return {
    score: typeof data.leadScore === 'number' ? data.leadScore : 0,
    category:
      data.leadTemperatura === 'quente'
        ? 'hot'
        : data.leadTemperatura === 'morno'
          ? 'warm'
          : 'cold',
    updatedAt: toDate(data.updatedAt),
  };
}

export function parseCrmMetricsFromDoc(
  data: FirebaseFirestore.DocumentData
): WhiteLabelLeadCrmMetrics {
  const metrics = data.crmMetrics || {};
  const projectedRevenue =
    typeof metrics.projectedRevenue === 'number' ? metrics.projectedRevenue : 0;

  const realizedRevenue =
    typeof metrics.realizedRevenue === 'number' ? metrics.realizedRevenue : 0;

  return { projectedRevenue, realizedRevenue };
}

export function inferEspecialidade(data: FirebaseFirestore.DocumentData): string {
  if (typeof data.especialidade === 'string' && data.especialidade.trim()) {
    return data.especialidade.trim();
  }
  const situacao = data.situacaoProfissional || '';
  if (situacao.includes('clínica') || situacao.includes('clinica')) return 'Empreendedor em saúde';
  if (situacao.includes('particular')) return 'Medicina particular';
  if (situacao.includes('plantão') || situacao.includes('plantao')) return 'Plantão / Convênio';
  return 'Médico';
}
