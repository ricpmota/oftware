export type LeadWhiteLabelStatus =
  | 'novo'
  | 'em_contato'
  | 'qualificado'
  | 'reuniao_agendada'
  | 'fechado'
  | 'perdido';

import type {
  WhiteLabelLeadCrm,
  WhiteLabelLeadCrmMetrics,
  WhiteLabelLeadScoreDetail,
} from '@/types/leadWhiteLabelCrm';

export type LeadWhiteLabelTemperatura = 'frio' | 'morno' | 'quente';

export type LeadWhiteLabelMeetingStatus = 'scheduled' | 'error';

export type LeadWhiteLabelMeeting = {
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
  status: LeadWhiteLabelMeetingStatus;
  createdAt: Date | null;
};

export type LeadWhiteLabel = {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  instagram: string;
  situacaoProfissional: string;
  objetivo3Anos: string;
  interesseReduzirPlantao: string;
  interessePlataformaMarca: string;
  pacientesMes: string;
  realidadeAtual: string;
  interesseExperienciaDigital: string;
  familiaridadeTecnologia: string;
  investimentoDisponivel: string;
  prazoInicio: string;
  faturamentoEsperado: string;
  origem: 'whitelabel';
  status: LeadWhiteLabelStatus;
  leadScore: number;
  leadTemperatura: LeadWhiteLabelTemperatura;
  observacoes?: string;
  meeting?: LeadWhiteLabelMeeting;
  crm?: WhiteLabelLeadCrm;
  leadScoreDetail?: WhiteLabelLeadScoreDetail;
  crmMetrics?: WhiteLabelLeadCrmMetrics;
  crmMedico?: string;
  especialidade?: string;
  cidade?: string;
  estado?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type LeadWhiteLabelPayload = Omit<
  LeadWhiteLabel,
  'id' | 'status' | 'leadScore' | 'leadTemperatura' | 'observacoes' | 'createdAt' | 'updatedAt'
>;

export const LEAD_WHITELABEL_STATUS_OPTIONS: { value: LeadWhiteLabelStatus; label: string }[] = [
  { value: 'novo', label: 'Novo' },
  { value: 'em_contato', label: 'Em contato' },
  { value: 'qualificado', label: 'Qualificado' },
  { value: 'reuniao_agendada', label: 'Reunião agendada' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
];

export const LEAD_WHITELABEL_INVESTIMENTO_OPTIONS = [
  'Até R$ 5.000.',
  'Entre R$ 5.000 e R$ 10.000.',
  'Entre R$ 10.000 e R$ 25.000.',
  'Acima de R$ 25.000.',
  'Depende do retorno esperado.',
] as const;

export const LEAD_WHITELABEL_PRAZO_OPTIONS = [
  'Sim. Quero começar imediatamente.',
  'Sim. Quero avaliar.',
  'Talvez.',
  'Não neste momento.',
] as const;
