// Tipos para o sistema de Calendário de Aplicações

export interface AplicacaoAgendada {
  id: string; // ID único da aplicação
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail: string;
  dataAplicacao: Date;
  dosePrevista: number; // mg
  numeroAplicacao: number; // 1ª, 2ª, 3ª...
  statusEmailAntes: 'enviado' | 'nao_enviado' | 'pendente';
  statusEmailDia: 'enviado' | 'nao_enviado' | 'pendente';
  medicoResponsavelId?: string | null;
  observacoes?: string;
}

export interface FiltroAplicacao {
  dataInicio?: Date;
  dataFim?: Date;
  pacienteId?: string;
  dose?: number;
  statusEmail?: 'enviado' | 'nao_enviado' | 'todos';
}

export interface MetricasEvolucao {
  totalPacientes: number;
  totalAplicacoes: number;
  totalMgAplicadas: number;
  mediaMgPorPaciente: number;
  distribuicaoCiclos: {
    ciclo: number;
    quantidade: number;
  }[];
  progressoMensal: {
    mes: string; // "2024-01"
    totalMg: number;
    totalPacientes: number;
  }[];
}

export interface AplicacaoRealizada {
  pacienteId: string;
  data: Date;
  dose: number; // mg
  numeroAplicacao: number;
}

