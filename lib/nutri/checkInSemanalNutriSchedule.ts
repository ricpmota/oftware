import type { CheckInSemanalNutri, CheckInSemanalNutriStatus } from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  getNutritionWeek,
  getPreviousNutritionWeek,
  getNutritionCheckInCalendarDate,
  isNutritionCheckInFutureWeek,
  parseNutritionYmdLocal,
  type NutritionWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';
import { BRASIL_TIMEZONE, brasiliaWallTimeToInstant, parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';
import {
  isNutritionCheckInScheduledDateEligible,
  type NutritionTreatmentWindow,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';

/** Convenção JS `Date.getDay()`: 0 = domingo … 6 = sábado. */
export type NutriWeekdaySunday0 = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const NUTRI_WEEKDAY_SUNDAY_0: readonly NutriWeekdaySunday0[] = [0, 1, 2, 3, 4, 5, 6];

export const NUTRI_WEEKDAY_LABELS: Record<NutriWeekdaySunday0, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

/** Ordem de UI: segunda → domingo. */
export const NUTRI_WEEKDAY_UI_ORDER: NutriWeekdaySunday0[] = [1, 2, 3, 4, 5, 6, 0];

export const NUTRI_CHECKIN_SCHEDULES_COLLECTION = 'nutri_checkin_schedules';

export const DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME = '18:00';
/** Envio fixo: toda segunda-feira. O nutricionista só escolhe o horário. */
export const DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY: NutriWeekdaySunday0 = 1;

export type NutriWeeklyCheckInSchedule = {
  patientId: string;
  nutritionistId: string;
  enabled: boolean;
  weekday: NutriWeekdaySunday0;
  time: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
};

export type WeeklyNutritionCheckInSlot = {
  patientId: string;
  nutritionistId: string;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  scheduledDate: string;
  scheduledTime: string;
  status: CheckInSemanalNutriStatus;
};

export function nutriCheckInScheduleDocId(nutritionistId: string, patientId: string): string {
  return `${nutritionistId}_${patientId}`;
}

export function parseNutriWeekdaySunday0(value: unknown): NutriWeekdaySunday0 | null {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 6) return null;
  return n as NutriWeekdaySunday0;
}

/**
 * Offset segunda → domingo: domingo=6, segunda=0, … sábado=5.
 */
export function weekdayOffsetFromMonday(weekdaySunday0: NutriWeekdaySunday0): number {
  return weekdaySunday0 === 0 ? 6 : weekdaySunday0 - 1;
}

/**
 * Dia em que o paciente responde o check-in da semana nutricional `week`.
 * Domingo: fecha a própria semana (weekEnd).
 * Segunda a sábado: o mesmo dia da semana *seguinte* — o relato é da semana que acabou.
 * Ex.: semana 10–16/08 + segunda → 17/08.
 */
export function getScheduledDateForNutritionWeek(
  week: Pick<NutritionWeek, 'weekStart'>,
  weekdaySunday0: NutriWeekdaySunday0
): string {
  const start = parseNutritionYmdLocal(week.weekStart);
  if (weekdaySunday0 === 0) {
    return ymdLocal(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
  }
  const offset = weekdayOffsetFromMonday(weekdaySunday0);
  return ymdLocal(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7 + offset));
}

export function listNutritionWeeksOverlappingYmdRange(rangeStart: string, rangeEnd: string): NutritionWeek[] {
  const startWeek = getPreviousNutritionWeek(getNutritionWeek(rangeStart));
  const weeks: NutritionWeek[] = [];
  let cursor = startWeek;
  const guard = 12;
  for (let i = 0; i < guard; i += 1) {
    if (cursor.weekStart > rangeEnd) break;
    weeks.push(cursor);
    const nextStart = parseNutritionYmdLocal(cursor.weekStart);
    cursor = getNutritionWeek(new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() + 7));
  }
  return weeks;
}

export type WeeklyNutritionCheckInFillWindow = {
  weekday: NutriWeekdaySunday0;
  scheduledDate: string;
  scheduledTime: string;
  unlockAt: Date;
};

function scheduleWeekdayOrDefault(
  _schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null
): NutriWeekdaySunday0 {
  return DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY;
}

function scheduleTimeOrDefault(
  schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null
): string {
  return parseHorarioBrasil(schedule?.time ?? DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME) || DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME;
}

/**
 * Data/hora em que o check-in da semana descrita fica disponível.
 * Sempre na segunda-feira, no horário do cronograma (padrão 18:00).
 */
export function getWeeklyNutritionCheckInFillWindow(input: {
  week: Pick<NutritionWeek, 'weekStart'>;
  schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null;
}): WeeklyNutritionCheckInFillWindow {
  const weekday = scheduleWeekdayOrDefault(input.schedule);
  const scheduledTime = scheduleTimeOrDefault(input.schedule);
  const scheduledDate = getScheduledDateForNutritionWeek(input.week, weekday);
  return {
    weekday,
    scheduledDate,
    scheduledTime,
    unlockAt: brasiliaWallTimeToInstant(scheduledDate, scheduledTime),
  };
}

/** Semana ainda não começou, ou o horário de Check-in Ativo ainda não chegou. */
export function isWeeklyNutritionCheckInFillWindowOpen(input: {
  week: Pick<NutritionWeek, 'weekKey' | 'weekStart'>;
  schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (isNutritionCheckInFutureWeek(input.week.weekKey, now)) return false;
  return now.getTime() >= getWeeklyNutritionCheckInFillWindow(input).unlockAt.getTime();
}

export function formatWeeklyNutritionCheckInFillWindowLabel(
  window: Pick<WeeklyNutritionCheckInFillWindow, 'weekday' | 'scheduledDate' | 'scheduledTime'>
): string {
  const parts = window.scheduledDate.split('-');
  const dateLabel = parts.length === 3 ? `${parts[2]}/${parts[1]}` : window.scheduledDate;
  return `${NUTRI_WEEKDAY_LABELS[window.weekday]}, ${dateLabel}, às ${window.scheduledTime}`;
}

export function resolveWeeklyNutritionCheckInSlotStatus(input: {
  hasRecord: boolean;
  scheduledDate: string;
  scheduledTime: string;
  now?: Date;
}): CheckInSemanalNutriStatus {
  if (input.hasRecord) return 'completed';
  const time = parseHorarioBrasil(input.scheduledTime) || DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME;
  const instant = brasiliaWallTimeToInstant(input.scheduledDate, time);
  const now = input.now ?? new Date();
  return now.getTime() < instant.getTime() ? 'upcoming' : 'pending';
}

/**
 * Data em que o card aparece no calendário operacional.
 * Sempre o dia programado do cronograma; resposta atrasada não empurra o card.
 * Se o nutricionista mudar o weekday depois, check-in já feito permanece no dia original.
 */
export function resolveWeeklyNutritionCheckInCalendarDate(input: {
  week: Pick<NutritionWeek, 'weekStart' | 'weekEnd'>;
  weekday: NutriWeekdaySunday0;
  recordScheduledDate?: string | null;
  hasRecord: boolean;
}): string {
  const programmed = getScheduledDateForNutritionWeek(input.week, input.weekday);
  if (!input.hasRecord) return programmed;
  const fromRecord = getNutritionCheckInCalendarDate(
    {
      weekStart: input.week.weekStart,
      weekEnd: input.week.weekEnd,
      scheduledDate: input.recordScheduledDate,
    },
    programmed
  );
  return fromRecord > programmed ? programmed : fromRecord;
}

export function buildWeeklyNutritionCheckInSlot(input: {
  schedule: Pick<NutriWeeklyCheckInSchedule, 'patientId' | 'nutritionistId' | 'weekday' | 'time' | 'enabled'>;
  week: NutritionWeek;
  record?: Pick<CheckInSemanalNutri, 'weekKey' | 'scheduledDate'> | null;
  now?: Date;
  treatmentEligible?: boolean;
}): WeeklyNutritionCheckInSlot | null {
  const hasRecord = Boolean(input.record);
  if (!input.schedule.enabled && !hasRecord) return null;

  const scheduledDate = resolveWeeklyNutritionCheckInCalendarDate({
    week: input.week,
    weekday: input.schedule.weekday,
    recordScheduledDate: input.record?.scheduledDate,
    hasRecord,
  });
  const scheduledTime = parseHorarioBrasil(input.schedule.time) || DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME;

  if (!hasRecord && input.treatmentEligible === false) return null;

  return {
    patientId: input.schedule.patientId,
    nutritionistId: input.schedule.nutritionistId,
    weekKey: input.week.weekKey,
    weekStart: input.week.weekStart,
    weekEnd: input.week.weekEnd,
    scheduledDate,
    scheduledTime,
    status: resolveWeeklyNutritionCheckInSlotStatus({
      hasRecord,
      scheduledDate,
      scheduledTime,
      now: input.now,
    }),
  };
}

export function buildWeeklyNutritionCheckInSlotsForRange(input: {
  schedules: NutriWeeklyCheckInSchedule[];
  records: Array<Pick<CheckInSemanalNutri, 'pacienteId' | 'weekKey' | 'scheduledDate'>>;
  rangeStart: string;
  rangeEnd: string;
  now?: Date;
  eligibilityByPatient?: Record<
    string,
    { statusTratamento?: string | null; window: NutritionTreatmentWindow | null }
  >;
}): WeeklyNutritionCheckInSlot[] {
  const recordsByPatientWeek = new Map<string, Pick<CheckInSemanalNutri, 'weekKey' | 'scheduledDate'>>();
  for (const record of input.records) {
    recordsByPatientWeek.set(`${record.pacienteId}::${record.weekKey}`, record);
  }

  const weeks = listNutritionWeeksOverlappingYmdRange(input.rangeStart, input.rangeEnd);
  const slots: WeeklyNutritionCheckInSlot[] = [];

  for (const week of weeks) {
    for (const schedule of input.schedules) {
      const record = recordsByPatientWeek.get(`${schedule.patientId}::${week.weekKey}`) ?? null;
      const hasRecord = Boolean(record);
      const eligibility = input.eligibilityByPatient?.[schedule.patientId];
      const treatmentEligible =
        eligibility == null
          ? true
          : isNutritionCheckInScheduledDateEligible({
              statusTratamento: eligibility.statusTratamento,
              window: eligibility.window,
              scheduledDate: resolveWeeklyNutritionCheckInCalendarDate({
                week,
                weekday: schedule.weekday,
                recordScheduledDate: record?.scheduledDate,
                hasRecord,
              }),
              hasRecord,
            });
      const slot = buildWeeklyNutritionCheckInSlot({
        schedule,
        week,
        record,
        now: input.now,
        treatmentEligible,
      });
      if (!slot) continue;
      if (slot.scheduledDate < input.rangeStart || slot.scheduledDate > input.rangeEnd) continue;
      slots.push(slot);
    }
  }

  return slots.sort((a, b) => {
    const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
    if (dateCmp !== 0) return dateCmp;
    return a.scheduledTime.localeCompare(b.scheduledTime);
  });
}

export function scheduleTimezoneOrDefault(value?: string | null): string {
  return value?.trim() || BRASIL_TIMEZONE;
}

function toScheduleDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const d = (value as { toDate: () => Date }).toDate();
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function deserializeNutriWeeklyCheckInSchedule(
  data: Record<string, unknown>,
  fallbackIds: { nutritionistId: string; patientId: string }
): NutriWeeklyCheckInSchedule | null {
  const patientId = String(data.patientId ?? fallbackIds.patientId ?? '').trim();
  const nutritionistId = String(data.nutritionistId ?? fallbackIds.nutritionistId ?? '').trim();
  const time = parseHorarioBrasil(String(data.time ?? '')) || DEFAULT_NUTRI_WEEKLY_CHECKIN_TIME;
  if (!patientId || !nutritionistId) return null;
  return {
    patientId,
    nutritionistId,
    enabled: data.enabled === true,
    weekday: DEFAULT_NUTRI_WEEKLY_CHECKIN_WEEKDAY,
    time,
    timezone: scheduleTimezoneOrDefault(typeof data.timezone === 'string' ? data.timezone : null),
    createdAt: toScheduleDate(data.createdAt),
    updatedAt: toScheduleDate(data.updatedAt),
    createdBy: String(data.createdBy ?? nutritionistId),
  };
}
