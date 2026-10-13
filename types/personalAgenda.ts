import type {
  WhiteLabelAllowedDaysMode,
  WhiteLabelAvailabilityPeriod,
  WhiteLabelAvailabilityRule,
  WhiteLabelCalendarException,
  WhiteLabelSlotSource,
} from '@/types/whiteLabelAgenda';
import type { WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';

export type PersonalAllowedDaysMode = WhiteLabelAllowedDaysMode;
export type PersonalAvailabilityPeriod = WhiteLabelAvailabilityPeriod;
export type PersonalAvailabilityRule = WhiteLabelAvailabilityRule;
export type PersonalCalendarException = WhiteLabelCalendarException;
export type PersonalSlotSource = WhiteLabelSlotSource;
export type PersonalAvailabilityStatus = WhiteLabelAvailabilityStatus;

export const PERSONAL_CONSULTA_LINK_PLACEHOLDER = '{{link_agendamento}}';
export const PERSONAL_CONSULTA_NOME_PACIENTE_PLACEHOLDER = '{{nome_paciente}}';
export const PERSONAL_CONSULTA_NOME_PERSONAL_PLACEHOLDER = '{{nome_personal}}';
export const PERSONAL_CONSULTA_NOME_MEDICO_PLACEHOLDER = '{{nome_medico}}';
/** Frase inicial: pede anamnese só se o paciente ainda não preencheu. */
export const PERSONAL_CONSULTA_CTA_INICIO_PLACEHOLDER = '{{cta_inicio}}';

/** Origem dos lembretes auto-criados quando o paciente agenda pelo link. */
export const PERSONAL_CONSULTA_LEMBRETE_ORIGEM = 'personal_consulta';
/** Lembrete 30 min antes — WhatsApp do personal → paciente. */
export const PERSONAL_CONSULTA_PACIENTE_LEMBRETE_ORIGEM = 'personal_consulta_paciente';

export function isPersonalConsultaAutoLembrete(origem: string | undefined): boolean {
  return (
    origem === PERSONAL_CONSULTA_LEMBRETE_ORIGEM || origem === PERSONAL_CONSULTA_PACIENTE_LEMBRETE_ORIGEM
  );
}

/** Quando o Canal Chat avisa o personal da consulta agendada. */
export type PersonalConsultaReminderAviso = 'no_horario' | '30_min_antes' | '1_hora_antes';

export const PERSONAL_CONSULTA_REMINDER_OPTIONS: Array<{
  value: PersonalConsultaReminderAviso;
  label: string;
  hint: string;
}> = [
  { value: 'no_horario', label: 'Na hora da consulta', hint: 'No horário marcado' },
  { value: '30_min_antes', label: '30 minutos antes', hint: 'Meia hora antes do horário' },
  { value: '1_hora_antes', label: '1 hora antes', hint: 'Uma hora antes do horário' },
];

export type PersonalAgendaSettings = {
  defaultDurationMinutes: 15 | 30 | 45 | 60;
  bufferMinutes: 0 | 5 | 10 | 15 | 30;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  /**
   * @deprecated No metapersonal os dias permitidos vêm da aba Recorrente.
   * Mantido só por compatibilidade com documentos antigos.
   */
  allowedDaysMode: PersonalAllowedDaysMode;
  slotGenerationEnabled: boolean;
  /** Modelo da mensagem de boas-vindas enviada ao aceitar o vínculo. */
  welcomeMessageTemplate: string;
  /**
   * Antecedência do alerta WhatsApp (Canal Chat → personal)
   * quando um paciente agenda uma consulta.
   */
  consultaReminderAviso: PersonalConsultaReminderAviso;
  updatedAt?: string | null;
};

export type PersonalAvailability = {
  id: string;
  personalTrainerId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: PersonalAvailabilityStatus;
  source?: PersonalSlotSource;
  pacienteId?: string;
  pacienteNome?: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  /** Lembrete de alerta (Canal Chat) criado no agendamento. */
  reminderLembreteId?: string;
  /** Lembrete 30 min antes para o paciente (WhatsApp do personal). */
  patientReminderLembreteId?: string;
  /** Anotações do personal sobre esta consulta. */
  observacoes?: string;
  /** Personal marcou a consulta como realizada. */
  realizada?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type PersonalAvailabilityApiRow = Omit<PersonalAvailability, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null;
  updatedAt: string | null;
};

export type PersonalConsultaLink = {
  token: string;
  personalTrainerId: string;
  pacienteId: string;
  status: 'active' | 'revoked';
  createdAt: string | null;
};

export type PersonalConsultaMeeting = {
  id: string;
  personalTrainerId: string;
  pacienteId: string;
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
};
