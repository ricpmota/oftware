export type EventoTimelineTipo =
  | 'consulta'
  | 'aplicacao'
  | 'marco_zero'
  | 'conclusao_tratamento'
  | 'peso'
  | 'cintura'
  | 'exame_solicitado'
  | 'exame_resultado'
  | 'prescricao'
  | 'pagamento'
  | 'aniversario'
  | 'bioimpedancia'
  | 'observacao'
  | 'ia'
  | 'nutricao'
  | 'atividade_fisica'
  | 'imagem'
  | 'sistema_importante'
  | 'lembrete';

export type EventoTimelineOrigem = 'medico' | 'paciente' | 'sistema' | 'nutri' | 'personal' | 'admin';

import type { MarcoZero } from '@/types/obesidade';

export type MarcoZeroTimeline = {
  pesoInicial: number;
  circunferenciaInicial?: number;
  motivacaoPrincipal: string;
  satisfacaoAtual: string;
  objetivoPaciente: string;
  confiancaNoObjetivo: string;
  possuiFotosIniciais: boolean;
};

export type CheckInSemanalTimeline = {
  fomeSemana?: string;
  periodoMaisFome?: string;
  saciedadeAoComer?: string;
  consumoAgua?: string;
  consumoProteinas?: string;
  satisfacaoEvolucao?: string;
  comentarioSemana?: string;
};

export type CheckInSemanalScoreTimeline = {
  score: number;
  categoria: string;
  medalha: string;
  titulo: string;
  mensagemPaciente?: string;
  fatoresPositivos?: string[];
  pontosDeAtencao?: string[];
  semana?: number;
};

export type ConclusaoTratamentoTimeline = {
  pesoFinalKg?: number;
  pesoPerdidoAcumulado?: number | null;
  circunferenciaFinalCm?: number;
  reducaoAbdominalCm?: number | null;
  percepcaoResultadoFinal?: string;
  principalConquista?: string;
  depoimento?: string;
  estrelasMedico?: number;
};

export type EventoTimelineDados = {
  peso?: string;
  cintura?: string;
  dose?: string;
  medicamento?: string;
  valor?: string;
  status?: string;
  exame?: string;
  pressao?: string;
  proximaDose?: string;
  meta?: string;
  semana?: number;
  localAplicacao?: string;
  checkInSemanal?: CheckInSemanalTimeline;
  checkInSemanalScore?: CheckInSemanalScoreTimeline;
  marcoZero?: MarcoZeroTimeline;
  conclusaoTratamento?: ConclusaoTratamentoTimeline;
  variacaoPeso?: string;
  variacaoCircunferencia?: string;
};

export type EventoTimelineMock = {
  id: string;
  tipo: EventoTimelineTipo;
  titulo: string;
  descricao: string;
  data: string;
  hora?: string;
  origem?: EventoTimelineOrigem;
  destaque?: string;
  dados?: EventoTimelineDados;
};

/** Labels padrão para badges/filtros da timeline (compatível com novos tipos automáticos). */
export const EVENTO_TIMELINE_LABELS: Record<EventoTimelineTipo, string> = {
  consulta: 'Consulta',
  aplicacao: 'Aplicação',
  marco_zero: 'Marco Zero',
  conclusao_tratamento: 'Conclusão',
  peso: 'Peso',
  cintura: 'Cintura',
  exame_solicitado: 'Exame solicitado',
  exame_resultado: 'Resultado',
  prescricao: 'Prescrição',
  pagamento: 'Pagamento',
  aniversario: 'Aniversário',
  bioimpedancia: 'Bioimpedância',
  observacao: 'Observação',
  ia: 'IA',
  nutricao: 'Nutrição',
  atividade_fisica: 'Atividade física',
  imagem: 'Imagem',
  sistema_importante: 'Alerta do sistema',
  lembrete: 'Lembrete',
};

export type ProntuarioFormValues = {
  tipoRegistro: string;
  dataRegistro: string;
  evolucao: string;
  sintomas: string;
  conduta: string;
  peso: string;
  cintura: string;
  pressao: string;
  doseAtual: string;
  proximaDose: string;
  meta: string;
};

export type ProntuarioNutriFormValues = {
  tipoRegistro: string;
  dataRegistro: string;
  evolucao: string;
  conduta: string;
  adesao: string;
  meta: string;
};
