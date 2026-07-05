import type { LeadMedicoStatus } from '@/types/leadMedico';

export type LeadMedicoCrmStageConfig = {
  value: LeadMedicoStatus;
  label: string;
  shortLabel: string;
  headerColor: string;
};

export const LEAD_MEDICO_CRM_STAGES: LeadMedicoCrmStageConfig[] = [
  {
    value: 'nao_qualificado',
    label: 'Não Qualificado',
    shortLabel: 'Não qualif.',
    headerColor: 'text-gray-700 bg-gray-100 dark:text-gray-200 dark:bg-gray-700/60',
  },
  {
    value: 'enviado_contato',
    label: 'Consultas Agendadas',
    shortLabel: 'Cons. agend.',
    headerColor: 'text-yellow-800 bg-yellow-100 dark:text-yellow-200 dark:bg-yellow-900/40',
  },
  {
    value: 'contato_feito',
    label: 'Consultas Realizadas',
    shortLabel: 'Cons. realiz.',
    headerColor: 'text-orange-800 bg-orange-100 dark:text-orange-200 dark:bg-orange-900/40',
  },
  {
    value: 'tratamento_enviado',
    label: 'Tratamento Enviado',
    shortLabel: 'Trat. enviado',
    headerColor: 'text-violet-800 bg-violet-100 dark:text-violet-200 dark:bg-violet-900/40',
  },
  {
    value: 'em_tratamento',
    label: 'Tratamento',
    shortLabel: 'Tratamento',
    headerColor: 'text-green-800 bg-green-100 dark:text-green-200 dark:bg-green-900/40',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    shortLabel: 'Concluído',
    headerColor: 'text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/40',
  },
  {
    value: 'excluido',
    label: 'Excluídos',
    shortLabel: 'Excluídos',
    headerColor: 'text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/40',
  },
];

export const LEAD_MEDICO_STATUS_ORDER: LeadMedicoStatus[] = LEAD_MEDICO_CRM_STAGES.map((s) => s.value);

export type LeadMedicoStatusUiConfig = {
  label: string;
  color: string;
  bgColor: string;
};

export const LEAD_MEDICO_STATUS_CONFIG_LIGHT: Record<LeadMedicoStatus, LeadMedicoStatusUiConfig> = {
  nao_qualificado: { label: 'Não Qualificado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  enviado_contato: { label: 'Consultas Agendadas', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  contato_feito: { label: 'Consultas Realizadas', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  tratamento_enviado: { label: 'Tratamento Enviado', color: 'text-violet-700', bgColor: 'bg-violet-100' },
  em_tratamento: { label: 'Tratamento', color: 'text-green-700', bgColor: 'bg-green-100' },
  concluido: { label: 'Concluído', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  excluido: { label: 'Excluídos', color: 'text-red-700', bgColor: 'bg-red-100' },
};

export const LEAD_MEDICO_STATUS_CONFIG_DARK: Record<LeadMedicoStatus, LeadMedicoStatusUiConfig> = {
  nao_qualificado: { label: 'Não Qualificado', color: 'text-[#E8EDED]/90', bgColor: 'bg-white/10' },
  enviado_contato: { label: 'Consultas Agendadas', color: 'text-[#E8EDED]', bgColor: 'bg-[#2F8FA3]/20' },
  contato_feito: { label: 'Consultas Realizadas', color: 'text-[#E8EDED]', bgColor: 'bg-[#4CCB7A]/20' },
  tratamento_enviado: { label: 'Tratamento Enviado', color: 'text-[#E8EDED]', bgColor: 'bg-[#C4B5FD]/20' },
  em_tratamento: { label: 'Tratamento', color: 'text-[#E8EDED]', bgColor: 'bg-[#4CCB7A]/30' },
  concluido: { label: 'Concluído', color: 'text-[#E8EDED]', bgColor: 'bg-[#2F8FA3]/30' },
  excluido: { label: 'Excluídos', color: 'text-[#E8EDED]', bgColor: 'bg-white/5' },
};

export type LeadMedicoCrmKpis = {
  totalLeads: number;
  consultasAgendadas: number;
  consultasRealizadas: number;
  tratamentoEnviado: number;
  tratamento: number;
  concluido: number;
  excluido: number;
  projectedRevenue: number;
};

/** KPIs por etapa resolvida do pipeline (labels personalizados do médico). */
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
