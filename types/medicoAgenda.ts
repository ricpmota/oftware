import type {
  WhiteLabelAllowedDaysMode,
  WhiteLabelAvailabilityPeriod,
  WhiteLabelAvailabilityRule,
  WhiteLabelCalendarException,
  WhiteLabelSlotSource,
} from '@/types/whiteLabelAgenda';
import type { WhiteLabelAvailabilityStatus } from '@/types/whiteLabelAvailability';

export type MedicoAllowedDaysMode = WhiteLabelAllowedDaysMode;
export type MedicoAvailabilityPeriod = WhiteLabelAvailabilityPeriod;
export type MedicoAvailabilityRule = WhiteLabelAvailabilityRule;
export type MedicoCalendarException = WhiteLabelCalendarException;
export type MedicoSlotSource = WhiteLabelSlotSource;
export type MedicoAvailabilityStatus = WhiteLabelAvailabilityStatus;

export const MEDICO_CONSULTA_LINK_PLACEHOLDER = '{{link_agendamento}}';
export const MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER = '{{nome_paciente}}';
export const MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER = '{{nome_medico}}';
export const MEDICO_CONSULTA_CTA_INICIO_PLACEHOLDER = '{{cta_inicio}}';
export const MEDICO_CONSULTA_DATA_PLACEHOLDER = '{{data_consulta}}';
export const MEDICO_CONSULTA_HORARIO_PLACEHOLDER = '{{horario}}';
export const MEDICO_CONSULTA_HORARIO_INICIO_PLACEHOLDER = '{{horario_inicio}}';
export const MEDICO_CONSULTA_HORARIO_FIM_PLACEHOLDER = '{{horario_fim}}';

export type MedicoConsultaReminderAviso = 'no_horario' | '30_min_antes' | '1_hora_antes';

export const MEDICO_CONSULTA_REMINDER_OPTIONS: Array<{
  value: MedicoConsultaReminderAviso;
  label: string;
  hint: string;
}> = [
  { value: 'no_horario', label: 'Na hora da consulta', hint: 'No horário marcado' },
  { value: '30_min_antes', label: '30 minutos antes', hint: 'Meia hora antes do horário' },
  { value: '1_hora_antes', label: '1 hora antes', hint: 'Uma hora antes do horário' },
];

export type MedicoAgendaSettings = {
  defaultDurationMinutes: 15 | 30 | 45 | 60;
  bufferMinutes: 0 | 5 | 10 | 15 | 30;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  /**
   * @deprecated No metaadmin os dias permitidos vêm da aba Recorrente.
   * Mantido só por compatibilidade com documentos antigos.
   */
  allowedDaysMode: MedicoAllowedDaysMode;
  slotGenerationEnabled: boolean;
  /**
   * Se ligado, o paciente agenda um horário da agenda do médico ao terminar a anamnese inicial em /meta.
   * Padrão desligado para todos os médicos.
   */
  publicBookingEnabled: boolean;
  /**
   * Modelo da mensagem de WhatsApp enviada ao paciente ao confirmar o agendamento.
   */
  welcomeMessageTemplate: string;
  consultaReminderAviso: MedicoConsultaReminderAviso;
  updatedAt?: string | null;
};

export type MedicoAvailability = {
  id: string;
  medicoId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: MedicoAvailabilityStatus;
  source?: MedicoSlotSource;
  pacienteId?: string;
  pacienteNome?: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  reminderLembreteId?: string;
  patientReminderLembreteId?: string;
  observacoes?: string;
  realizada?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type MedicoAvailabilityApiRow = Omit<MedicoAvailability, 'createdAt' | 'updatedAt'> & {
  createdAt: string | null;
  updatedAt: string | null;
};

/** Origem dos lembretes auto-criados quando o paciente agenda pelo /meta. */
export const MEDICO_CONSULTA_LEMBRETE_ORIGEM = 'medico_consulta';
/** Lembrete 30 min antes — Canal Chat → paciente. */
export const MEDICO_CONSULTA_PACIENTE_LEMBRETE_ORIGEM = 'medico_consulta_paciente';
