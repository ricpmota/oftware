export type Paciente360RiskLevel = 'baixo' | 'medio' | 'alto' | 'indeterminado';

export type Paciente360StatusComposto =
  | 'pendente'
  | 'em_tratamento'
  | 'aguardando_marco_zero'
  | 'dose_atrasada'
  | 'pausado'
  | 'concluido'
  | 'abandono'
  | 'indeterminado';

export type Paciente360AlertSeverity = 'info' | 'warning' | 'danger';

export type Paciente360Alert = {
  tipo: string;
  severidade: Paciente360AlertSeverity;
  mensagem: string;
  fonte?: 'persistido' | 'derivado';
};

export type Paciente360UltimaInteracao = {
  tipo:
    | 'mensagem'
    | 'aplicacao'
    | 'peso'
    | 'foto'
    | 'bioimpedancia'
    | 'checkin'
    | 'login'
    | 'recomendacoes'
    | 'desconhecido';

  data?: Date | string | null;
  label?: string;
};

export type Paciente360ProximaAcao = {
  tipo:
    | 'revisar_exames'
    | 'cobrar_pagamento'
    | 'renovar_receita'
    | 'marcar_retorno'
    | 'avaliar_aplicacao'
    | 'solicitar_fotos'
    | 'acompanhar'
    | 'sem_acao';

  label: string;
  prioridade: number;
};

export type Paciente360Summary = {
  pacienteId: string;
  nome: string;

  statusTratamento?: string;
  statusComposto: Paciente360StatusComposto;

  plano?: {
    tratamentoIniciado: boolean;
    semanaAtual?: number;
    semanasTotal?: number;
    doseAtualMg?: number;
    titrationStatus?: string;
    proximaAplicacao?: {
      data?: string;
      semana?: number;
      atrasada?: boolean;
    };
  };

  resultado?: {
    pesoInicial?: number;
    pesoAtual?: number;
    deltaPesoKg?: number;
    cinturaInicial?: number;
    cinturaAtual?: number;
    deltaCinturaCm?: number;
  };

  adesao?: {
    aplicacoesRealizadas?: number;
    aplicacoesAtrasadas?: number;
    aplicacoesPerdidas?: number;
    percentualAdesao?: number;
  };

  financeiro?: {
    statusPagamento?: string;
    valorPendente?: number;
    proximoVencimento?: string;
  };

  contrato?: {
    status?: string;
  };

  alertas: Paciente360Alert[];

  risco: {
    nivel: Paciente360RiskLevel;
    motivos: string[];
  };

  ultimaInteracao?: Paciente360UltimaInteracao;

  proximaAcao?: Paciente360ProximaAcao;

  lembretes?: {
    pendentes: number;
    atrasados: number;
  };

  tagsAutomaticas: string[];

  updatedAt?: Date | string;
};

export type Paciente360TimelineEventType =
  | 'lead_created'
  | 'stage_changed'
  | 'treatment_started'
  | 'dose'
  | 'weight'
  | 'waist'
  | 'payment'
  | 'risk'
  | 'alert'
  | 'next_action'
  | 'reminder'
  | 'system';

export type Paciente360TimelineTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type Paciente360DateQuality = 'real' | 'estimated' | 'snapshot';

export type Paciente360TimelineEvent = {
  id: string;
  date?: Date | string | null;
  type: Paciente360TimelineEventType;
  title: string;
  description?: string;
  tone?: Paciente360TimelineTone;
  icon?: string;
  isSnapshot?: boolean;
  sourceDateQuality?: Paciente360DateQuality;
};

export type Paciente360TimelineBuildResult = {
  /** Bloco consolidado no topo quando há estado derivado sem data única. */
  currentState?: Paciente360TimelineEvent;
  events: Paciente360TimelineEvent[];
};

export type CrmUnifiedTimelineSource = 'crm' | 'paciente360' | 'sistema';

export type CrmUnifiedTimelineEvent = {
  id: string;
  date?: Date | string | null;
  source: CrmUnifiedTimelineSource;
  title: string;
  description?: string;
  tone?: Paciente360TimelineTone;
  createdBy?: string;
  isSnapshot?: boolean;
  sourceDateQuality?: Paciente360DateQuality;
};
