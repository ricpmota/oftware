export type WhiteLabelCrmStage =
  | 'NOVO_LEAD'
  | 'QUALIFICADO'
  | 'REUNIAO_AGENDADA'
  | 'REUNIAO_REALIZADA'
  | 'PROPOSTA_ENVIADA'
  | 'NEGOCIACAO'
  | 'FECHADO'
  | 'PERDIDO';

export type WhiteLabelLeadScoreCategory = 'cold' | 'warm' | 'hot';

export type WhiteLabelLeadCrm = {
  stage: WhiteLabelCrmStage;
  updatedAt: Date | null;
  owner?: string;
};

export type WhiteLabelLeadScoreDetail = {
  score: number;
  category: WhiteLabelLeadScoreCategory;
  updatedAt: Date | null;
};

export type WhiteLabelLeadCrmMetrics = {
  projectedRevenue?: number;
  realizedRevenue?: number;
};

export type WhiteLabelTimelineEventType =
  | 'lead_created'
  | 'qualified'
  | 'meeting_scheduled'
  | 'meeting_completed'
  | 'proposal_sent'
  | 'negotiation_started'
  | 'closed'
  | 'lost'
  | 'note'
  | 'stage_changed';

export type WhiteLabelLeadTimelineEvent = {
  id: string;
  leadId: string;
  type: WhiteLabelTimelineEventType;
  description: string;
  createdAt: Date | null;
  createdBy?: string;
};

export const WHITELABEL_CRM_STAGES: {
  value: WhiteLabelCrmStage;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'NOVO_LEAD', label: 'Novo Lead', shortLabel: 'Novo' },
  { value: 'QUALIFICADO', label: 'Qualificado', shortLabel: 'Qualif.' },
  { value: 'REUNIAO_AGENDADA', label: 'Reunião Agendada', shortLabel: 'Agendada' },
  { value: 'REUNIAO_REALIZADA', label: 'Reunião Realizada', shortLabel: 'Realizada' },
  { value: 'PROPOSTA_ENVIADA', label: 'Proposta Enviada', shortLabel: 'Proposta' },
  { value: 'NEGOCIACAO', label: 'Negociação', shortLabel: 'Negociação' },
  { value: 'FECHADO', label: 'Fechado', shortLabel: 'Fechado' },
  { value: 'PERDIDO', label: 'Perdido', shortLabel: 'Perdido' },
];

/** Referência opcional (ex.: R$ 1.000/mês × 12). Não é aplicada automaticamente aos leads. */
export const WHITELABEL_MONTHLY_FEE = 1000;
export const WHITELABEL_MIN_CONTRACT_MONTHS = 12;
export const WHITELABEL_PROJECTED_DEAL_VALUE =
  WHITELABEL_MONTHLY_FEE * WHITELABEL_MIN_CONTRACT_MONTHS;
