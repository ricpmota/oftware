import type {
  WhiteLabelAllowedDaysMode,
  WhiteLabelAvailabilityPeriod,
  WhiteLabelAvailabilityRule,
  WhiteLabelCalendarException,
  WhiteLabelSlotSource,
} from '@/types/whiteLabelAgenda';
import type { WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';

export type NutriAllowedDaysMode = WhiteLabelAllowedDaysMode;
export type NutriAvailabilityPeriod = WhiteLabelAvailabilityPeriod;
export type NutriAvailabilityRule = WhiteLabelAvailabilityRule;
export type NutriCalendarException = WhiteLabelCalendarException;
export type NutriSlotSource = WhiteLabelSlotSource;
export type NutriAvailabilityStatus = WhiteLabelAvailabilityStatus;

export const NUTRI_CONSULTA_LINK_PLACEHOLDER = '{{link_agendamento}}';
export const NUTRI_CONSULTA_NOME_PACIENTE_PLACEHOLDER = '{{nome_paciente}}';
export const NUTRI_CONSULTA_NOME_NUTRI_PLACEHOLDER = '{{nome_nutri}}';
export const NUTRI_CONSULTA_NOME_MEDICO_PLACEHOLDER = '{{nome_medico}}';
/** Frase inicial: pede anamnese só se o paciente ainda não preencheu. */
export const NUTRI_CONSULTA_CTA_INICIO_PLACEHOLDER = '{{cta_inicio}}';

/** Origem dos lembretes auto-criados quando o paciente agenda pelo link. */
export const NUTRI_CONSULTA_LEMBRETE_ORIGEM = 'nutri_consulta';
/** Lembrete 30 min antes — WhatsApp da nutricionista → paciente. */
export const NUTRI_CONSULTA_PACIENTE_LEMBRETE_ORIGEM = 'nutri_consulta_paciente';

export function isNutriConsultaAutoLembrete(origem: string | undefined): boolean {
  return (
    origem === NUTRI_CONSULTA_LEMBRETE_ORIGEM || origem === NUTRI_CONSULTA_PACIENTE_LEMBRETE_ORIGEM
  );
}

/** Quando o Canal Chat avisa a nutricionista da consulta agendada. */
export type NutriConsultaReminderAviso = 'no_horario' | '30_min_antes' | '1_hora_antes';

export const NUTRI_CONSULTA_REMINDER_OPTIONS: Array<{
  value: NutriConsultaReminderAviso;
  label: string;
  hint: string;
}> = [
  { value: 'no_horario', label: 'Na hora da consulta', hint: 'No horário marcado' },
  { value: '30_min_antes', label: '30 minutos antes', hint: 'Meia hora antes do horário' },
  { value: '1_hora_antes', label: '1 hora antes', hint: 'Uma hora antes do horário' },
];

export type NutriAgendaSettings = {
  defaultDurationMinutes: 15 | 30 | 45 | 60;
  bufferMinutes: 0 | 5 | 10 | 15 | 30;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  /**
   * @deprecated No metanutri os dias permitidos vêm da aba Recorrente.
   * Mantido só por compatibilidade com documentos antigos.
   */
  allowedDaysMode: NutriAllowedDaysMode;
  slotGenerationEnabled: boolean;
  /** Modelo da mensagem de boas-vindas enviada ao aceitar o vínculo. */
  welcomeMessageTemplate: string;
  /**
   * Antecedência do alerta WhatsApp (Canal Chat → nutricionista)
   * quando um paciente agenda uma consulta.
   */
  consultaReminderAviso: NutriConsultaReminderAviso;
  updatedAt?: string | null;
};

export type NutriAvailability = {
  id: string;
  nutricionistaId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: NutriAvailabilityStatus;
  source?: NutriSlotSource;
  pacienteId?: string;
  pacienteNome?: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  /** Lembrete de alerta (Canal Chat) criado no agendamento. */
  reminderLembreteId?: string;
  /** Lembrete 30 min antes para o paciente (WhatsApp da nutricionista). */
  patientReminderLembreteId?: string;
  /** Anotações da nutricionista sobre esta consulta. */
  observacoes?: string;
  /** Nutricionista marcou a consulta como realizada. */
  realizada?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type NutriAvailabilityApiRow = Omit<NutriAvailability, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null;
  updatedAt: string | null;
};

export type NutriConsultaLink = {
  token: string;
  nutricionistaId: string;
  pacienteId: string;
  status: 'active' | 'revoked';
  createdAt: string | null;
};

export type NutriConsultaMeeting = {
  id: string;
  nutricionistaId: string;
  pacienteId: string;
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
};
