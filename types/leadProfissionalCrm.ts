import type {
  LeadNutriStatus,
  LeadPersonalStatus,
  LeadPsiquiatraStatus,
  LeadProfissionalRole,
  LeadProfissionalStatus,
} from '@/types/leadProfissional';

export type LeadProfissionalCrmStageConfig = {
  value: LeadProfissionalStatus;
  label: string;
  shortLabel: string;
};

export const LEAD_NUTRI_CRM_STAGES: LeadProfissionalCrmStageConfig[] = [
  {
    value: 'nao_atendido',
    label: 'Não atendido',
    shortLabel: 'Não atend.',
  },
  {
    value: 'consultas_agendadas',
    label: 'Consultas Agendadas',
    shortLabel: 'Cons. agend.',
  },
  {
    value: 'cardapio_em_execucao',
    label: 'Cardápio em Execução',
    shortLabel: 'Em execução',
  },
  {
    value: 'concluido',
    label: 'Cardápio Concluído',
    shortLabel: 'Card. concl.',
  },
  {
    value: 'tratamento_concluido',
    label: 'Tratamento Concluído',
    shortLabel: 'Trat. concl.',
  },
  {
    value: 'cardapio_nao_realizado',
    label: 'Cardápio não Realizado',
    shortLabel: 'Não realiz.',
  },
];

export const LEAD_PERSONAL_CRM_STAGES: LeadProfissionalCrmStageConfig[] = [
  {
    value: 'nao_atendido',
    label: 'Não atendido',
    shortLabel: 'Não atend.',
  },
  {
    value: 'consultas_agendadas',
    label: 'Consultas Agendadas',
    shortLabel: 'Cons. agend.',
  },
  {
    value: 'treino_em_execucao',
    label: 'Treino em Execução',
    shortLabel: 'Treino',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    shortLabel: 'Concluído',
  },
  {
    value: 'treino_nao_realizado',
    label: 'Treino não Realizado',
    shortLabel: 'Não realiz.',
  },
];

export const LEAD_NUTRI_STATUS_ORDER: LeadNutriStatus[] = LEAD_NUTRI_CRM_STAGES.map(
  (s) => s.value as LeadNutriStatus
);

export const LEAD_PERSONAL_STATUS_ORDER: LeadPersonalStatus[] = LEAD_PERSONAL_CRM_STAGES.map(
  (s) => s.value as LeadPersonalStatus
);

export const LEAD_PSIQUIATRA_CRM_STAGES: LeadProfissionalCrmStageConfig[] = [
  {
    value: 'nao_atendido',
    label: 'Não atendido',
    shortLabel: 'Não atend.',
  },
  {
    value: 'consultas_agendadas',
    label: 'Consultas Agendadas',
    shortLabel: 'Cons. agend.',
  },
  {
    value: 'acompanhamento_em_curso',
    label: 'Acompanhamento em curso',
    shortLabel: 'Em curso',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    shortLabel: 'Concluído',
  },
  {
    value: 'acompanhamento_nao_realizado',
    label: 'Acompanhamento não realizado',
    shortLabel: 'Não realiz.',
  },
];

export const LEAD_PSIQUIATRA_STATUS_ORDER: LeadPsiquiatraStatus[] = LEAD_PSIQUIATRA_CRM_STAGES.map(
  (s) => s.value as LeadPsiquiatraStatus
);

export function getLeadProfissionalCrmStages(role: LeadProfissionalRole): LeadProfissionalCrmStageConfig[] {
  if (role === 'nutri') return LEAD_NUTRI_CRM_STAGES;
  if (role === 'psiquiatra') return LEAD_PSIQUIATRA_CRM_STAGES;
  return LEAD_PERSONAL_CRM_STAGES;
}

export function getLeadProfissionalStatusOrder(role: LeadProfissionalRole): LeadProfissionalStatus[] {
  if (role === 'nutri') return LEAD_NUTRI_STATUS_ORDER;
  if (role === 'psiquiatra') return LEAD_PSIQUIATRA_STATUS_ORDER;
  return LEAD_PERSONAL_STATUS_ORDER;
}

export function getDefaultLeadProfissionalStatus(role: LeadProfissionalRole): LeadProfissionalStatus {
  return 'nao_atendido';
}

export type CrmPipelineStageKpiItem = {
  stageKey: string;
  label: string;
  count: number;
};

export type CrmPipelineKpisView = {
  totalLeads: number;
  stages: CrmPipelineStageKpiItem[];
  projectedRevenue: number;
};
