import type { WhiteLabelAgendaSettings } from '@/types/whiteLabelAgenda';

export const WHITELABEL_AGENDA_SETTINGS_DOC_ID = 'default';
export const WHITELABEL_AGENDA_SETTINGS_COLLECTION = 'whiteLabelAgendaSettings';
export const WHITELABEL_AVAILABILITY_RULES_COLLECTION = 'whiteLabelAvailabilityRules';
export const WHITELABEL_CALENDAR_EXCEPTIONS_COLLECTION = 'whiteLabelCalendarExceptions';

export const DEFAULT_WHITELABEL_AGENDA_SETTINGS: WhiteLabelAgendaSettings = {
  defaultDurationMinutes: 60,
  bufferMinutes: 10,
  minAdvanceHours: 4,
  maxAdvanceDays: 30,
  allowedDaysMode: 'mon_fri',
  slotGenerationEnabled: true,
};
