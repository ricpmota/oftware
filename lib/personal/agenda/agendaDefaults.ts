import { PERSONAL_CONSULTA_CTA_INICIO_PLACEHOLDER, PERSONAL_CONSULTA_LINK_PLACEHOLDER } from '@/types/personalAgenda';
import type { PersonalAgendaSettings } from '@/types/personalAgenda';

export const PERSONAL_AGENDA_SETTINGS_COLLECTION = 'personalAgendaSettings';
export const PERSONAL_AVAILABILITY_RULES_COLLECTION = 'personalAvailabilityRules';
export const PERSONAL_CALENDAR_EXCEPTIONS_COLLECTION = 'personalCalendarExceptions';
export const PERSONAL_AVAILABILITY_COLLECTION = 'personalAvailability';
export const PERSONAL_CONSULTA_LINKS_COLLECTION = 'personalConsultaLinks';

export const DEFAULT_PERSONAL_WELCOME_MESSAGE = [
  `Olá, {{nome_paciente}}!`,
  ``,
  `Agora estamos conectados por aqui — vinculados pelo {{nome_medico}}.`,
  ``,
  `A partir de agora, cuido do seu acompanhamento de treinos. Pode me chamar neste WhatsApp sempre que precisar.`,
  ``,
  PERSONAL_CONSULTA_CTA_INICIO_PLACEHOLDER,
  PERSONAL_CONSULTA_LINK_PLACEHOLDER,
  ``,
  `Um abraço,`,
  `{{nome_personal}}`,
].join('\n');

export const DEFAULT_PERSONAL_AGENDA_SETTINGS: PersonalAgendaSettings = {
  defaultDurationMinutes: 60,
  bufferMinutes: 10,
  minAdvanceHours: 4,
  maxAdvanceDays: 30,
  allowedDaysMode: 'mon_fri',
  slotGenerationEnabled: true,
  welcomeMessageTemplate: DEFAULT_PERSONAL_WELCOME_MESSAGE,
  consultaReminderAviso: '30_min_antes',
};

export function personalRuleDocId(personalTrainerId: string, weekday: number): string {
  return `${personalTrainerId}_${weekday}`;
}

export function personalSlotDocId(
  personalTrainerId: string,
  date: string,
  startTime: string,
  endTime: string
): string {
  const start = startTime.replace(':', '');
  const end = endTime.replace(':', '');
  return `${personalTrainerId}__slot_${date}_${start}_${end}`;
}
