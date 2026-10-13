import type { LeadCrmTagSnapshot } from '@/types/crmTag';

export type LeadProfissionalRole = 'nutri' | 'personal' | 'psiquiatra';

export type LeadNutriStatus =
  | 'nao_atendido'
  | 'consultas_agendadas'
  | 'cardapio_em_execucao'
  | 'concluido'
  | 'tratamento_concluido'
  | 'cardapio_nao_realizado';

export type LeadPersonalStatus =
  | 'nao_atendido'
  | 'consultas_agendadas'
  | 'treino_em_execucao'
  | 'concluido'
  | 'treino_nao_realizado';

export type LeadPsiquiatraStatus =
  | 'nao_atendido'
  | 'consultas_agendadas'
  | 'acompanhamento_em_curso'
  | 'concluido'
  | 'acompanhamento_nao_realizado';

export type LeadProfissionalStatus = LeadNutriStatus | LeadPersonalStatus | LeadPsiquiatraStatus;

export interface LeadProfissional {
  id: string;
  pacienteId: string;
  vinculoId: string;
  name: string;
  email: string;
  telefone?: string;
  /** DDI sem "+". Ausente = Brasil (legado). */
  telefoneDdi?: string;
  telefonePais?: string;
  cidade?: string;
  estado?: string;
  status: LeadProfissionalStatus;
  /** Etapa customizada; quando ausente, usa `status` */
  crmStageKey?: string;
  dataStatus: Date;
  observacoes?: string;
  atualizadoPor?: string;
  profissionalId: string;
  role: LeadProfissionalRole;
  medicoId: string;
  medicoNome: string;
  orcamento?: number;
  /** Etiquetas do CRM (snapshot por lead) */
  crmTags?: LeadCrmTagSnapshot[];
  /** Data do compartilhamento médico → profissional (idade do card). */
  dataCompartilhamento?: Date;
  /** Consulta escolhida pelo paciente no link de agendamento. */
  consulta?: {
    date: string;
    startTime: string;
    endTime: string;
    availabilityId?: string;
    observacoes?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
