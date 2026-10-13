import {
  MEDICO_CONSULTA_DATA_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
} from '@/types/medicoAgenda';
import type { MedicoAgendaSettings } from '@/types/medicoAgenda';

export const MEDICO_AGENDA_SETTINGS_COLLECTION = 'medicoAgendaSettings';
export const MEDICO_AVAILABILITY_RULES_COLLECTION = 'medicoAvailabilityRules';
export const MEDICO_CALENDAR_EXCEPTIONS_COLLECTION = 'medicoCalendarExceptions';
export const MEDICO_AVAILABILITY_COLLECTION = 'medicoAvailability';

/** Modelo antigo de boas-vindas — migrado automaticamente para a confirmação. */
export const LEGACY_MEDICO_WELCOME_MESSAGE = [
  `Olá, {{nome_paciente}}!`,
  ``,
  `Agora estamos conectados por aqui.`,
  ``,
  `A partir de agora, cuido do seu acompanhamento. Pode me chamar neste WhatsApp sempre que precisar.`,
  ``,
  `{{cta_inicio}}`,
  `{{link_agendamento}}`,
  ``,
  `Um abraço,`,
  `{{nome_medico}}`,
].join('\n');

export const DEFAULT_MEDICO_CONFIRMACAO_MESSAGE = [
  `Olá, ${MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER}!`,
  ``,
  `Sua consulta com ${MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER} está confirmada.`,
  ``,
  `📅 ${MEDICO_CONSULTA_DATA_PLACEHOLDER}`,
  `🕐 ${MEDICO_CONSULTA_HORARIO_PLACEHOLDER} (horário de Brasília)`,
  ``,
  `Qualquer imprevisto, me chame neste WhatsApp.`,
  ``,
  `Até breve,`,
  MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER,
].join('\n');

/** @deprecated Use DEFAULT_MEDICO_CONFIRMACAO_MESSAGE */
export const DEFAULT_MEDICO_WELCOME_MESSAGE = DEFAULT_MEDICO_CONFIRMACAO_MESSAGE;

export const DEFAULT_MEDICO_AGENDA_SETTINGS: MedicoAgendaSettings = {
  defaultDurationMinutes: 60,
  bufferMinutes: 10,
  minAdvanceHours: 4,
  maxAdvanceDays: 30,
  allowedDaysMode: 'mon_fri',
  slotGenerationEnabled: true,
  publicBookingEnabled: false,
  welcomeMessageTemplate: DEFAULT_MEDICO_CONFIRMACAO_MESSAGE,
  consultaReminderAviso: '30_min_antes',
};

export function medicoRuleDocId(medicoId: string, weekday: number): string {
  return `${medicoId}_${weekday}`;
}

export function medicoSlotDocId(
  medicoId: string,
  date: string,
  startTime: string,
  endTime: string
): string {
  const start = startTime.replace(':', '');
  const end = endTime.replace(':', '');
  return `${medicoId}__slot_${date}_${start}_${end}`;
}
