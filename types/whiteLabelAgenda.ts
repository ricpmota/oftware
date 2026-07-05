export type WhiteLabelAllowedDaysMode = 'mon_fri' | 'mon_sat' | 'all';

export type WhiteLabelAgendaSettings = {
  defaultDurationMinutes: 15 | 30 | 45 | 60;
  bufferMinutes: 0 | 5 | 10 | 15 | 30;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  allowedDaysMode: WhiteLabelAllowedDaysMode;
  slotGenerationEnabled: boolean;
  updatedAt?: string | null;
};

export type WhiteLabelAvailabilityPeriod = {
  startTime: string;
  endTime: string;
};

/** 0 = domingo … 6 = sábado (mesmo padrão de Date.getDay()) */
export type WhiteLabelAvailabilityRule = {
  id: string;
  weekday: number;
  enabled: boolean;
  periods: WhiteLabelAvailabilityPeriod[];
  updatedAt?: string | null;
};

export type WhiteLabelCalendarExceptionType = 'blocked' | 'extra';

export type WhiteLabelCalendarException = {
  id: string;
  date: string;
  type: WhiteLabelCalendarExceptionType;
  reason?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WhiteLabelSlotSource = 'manual' | 'generated' | 'extra';

export const WHITELABEL_DURATION_OPTIONS = [15, 30, 45, 60] as const;
export const WHITELABEL_BUFFER_OPTIONS = [0, 5, 10, 15, 30] as const;

export const WHITELABEL_ALLOWED_DAYS_OPTIONS: {
  value: WhiteLabelAllowedDaysMode;
  label: string;
}[] = [
  { value: 'mon_fri', label: 'Segunda a sexta' },
  { value: 'mon_sat', label: 'Segunda a sábado' },
  { value: 'all', label: 'Todos os dias' },
];

export const WHITELABEL_WEEKDAYS: { weekday: number; label: string; short: string }[] = [
  { weekday: 0, label: 'Domingo', short: 'Dom' },
  { weekday: 1, label: 'Segunda-feira', short: 'Seg' },
  { weekday: 2, label: 'Terça-feira', short: 'Ter' },
  { weekday: 3, label: 'Quarta-feira', short: 'Qua' },
  { weekday: 4, label: 'Quinta-feira', short: 'Qui' },
  { weekday: 5, label: 'Sexta-feira', short: 'Sex' },
  { weekday: 6, label: 'Sábado', short: 'Sáb' },
];
