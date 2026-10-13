import { NUTRI_CONSULTA_CTA_INICIO_PLACEHOLDER, NUTRI_CONSULTA_LINK_PLACEHOLDER } from '@/types/nutriAgenda';
import type { NutriAgendaSettings } from '@/types/nutriAgenda';

export const NUTRI_AGENDA_SETTINGS_COLLECTION = 'nutriAgendaSettings';
export const NUTRI_AVAILABILITY_RULES_COLLECTION = 'nutriAvailabilityRules';
export const NUTRI_CALENDAR_EXCEPTIONS_COLLECTION = 'nutriCalendarExceptions';
export const NUTRI_AVAILABILITY_COLLECTION = 'nutriAvailability';
export const NUTRI_CONSULTA_LINKS_COLLECTION = 'nutriConsultaLinks';

export const DEFAULT_NUTRI_WELCOME_MESSAGE = [
  `Olá, {{nome_paciente}}!`,
  ``,
  `Agora estamos conectados por aqui — vinculados pelo {{nome_medico}}.`,
  ``,
  `A partir de agora, cuido do seu acompanhamento nutricional. Pode me chamar neste WhatsApp sempre que precisar.`,
  ``,
  NUTRI_CONSULTA_CTA_INICIO_PLACEHOLDER,
  NUTRI_CONSULTA_LINK_PLACEHOLDER,
  ``,
  `Um abraço,`,
  `{{nome_nutri}}`,
].join('\n');

export const DEFAULT_NUTRI_AGENDA_SETTINGS: NutriAgendaSettings = {
  defaultDurationMinutes: 60,
  bufferMinutes: 10,
  minAdvanceHours: 4,
  maxAdvanceDays: 30,
  allowedDaysMode: 'mon_fri',
  slotGenerationEnabled: true,
  welcomeMessageTemplate: DEFAULT_NUTRI_WELCOME_MESSAGE,
  consultaReminderAviso: '30_min_antes',
};

export function nutriRuleDocId(nutricionistaId: string, weekday: number): string {
  return `${nutricionistaId}_${weekday}`;
}

export function nutriSlotDocId(
  nutricionistaId: string,
  date: string,
  startTime: string,
  endTime: string
): string {
  const start = startTime.replace(':', '');
  const end = endTime.replace(':', '');
  return `${nutricionistaId}__slot_${date}_${start}_${end}`;
}
