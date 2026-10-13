export type TimeSlotRange = { startTime: string; endTime: string };

export type PeriodPresetId = 'manha' | 'tarde' | 'noite' | 'custom';

export const PERIOD_PRESETS: Record<
  Exclude<PeriodPresetId, 'custom'>,
  { label: string; startTime: string; endTime: string }
> = {
  manha: { label: 'Manhã', startTime: '09:00', endTime: '12:00' },
  tarde: { label: 'Tarde', startTime: '14:00', endTime: '18:00' },
  noite: { label: 'Noite', startTime: '18:00', endTime: '21:00' },
};

export const SLOT_DURATION_OPTIONS = [
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30' },
] as const;

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateKey(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]) - 1, day: Number(match[3]) };
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function getMonthCalendarGrid(year: number, month: number): (string | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];

  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toDateKey(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function generateSlotsInRange(
  periodStart: string,
  periodEnd: string,
  durationMinutes: number,
  bufferMinutes = 0
): TimeSlotRange[] {
  const start = timeToMinutes(periodStart);
  const end = timeToMinutes(periodEnd);
  if (durationMinutes <= 0 || end <= start) return [];

  const step = durationMinutes + Math.max(0, bufferMinutes);
  const slots: TimeSlotRange[] = [];
  let cursor = start;
  while (cursor + durationMinutes <= end) {
    slots.push({
      startTime: minutesToTime(cursor),
      endTime: minutesToTime(cursor + durationMinutes),
    });
    cursor += step;
  }
  return slots;
}

export function addDaysToDateKey(date: string, days: number): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  const d = new Date(parsed.year, parsed.month, parsed.day + days);
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function lastDateKeyOfMonth(year: number, month: number): string {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return toDateKey(year, month, lastDay);
}

export function getBrazilDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const BRAZIL_TZ = 'America/Sao_Paulo';

function brazilDateTimePart(now: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  return parts.find((part) => part.type === type)?.value || '';
}

/** Relógio de Brasília em HH:mm, independente do fuso do servidor. */
export function getBrazilTimeKey(now = new Date()): string {
  const hour = Number(brazilDateTimePart(now, 'hour'));
  const minute = Number(brazilDateTimePart(now, 'minute'));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '00:00';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function addHoursToBrazilDateTime(
  now: Date,
  hours: number
): { date: string; time: string } {
  const date = getBrazilDateKey(now);
  const time = getBrazilTimeKey(now);
  const [h, m] = time.split(':').map(Number);
  const addMinutes = Math.round(Math.max(0, hours) * 60);
  const total = h * 60 + m + addMinutes;
  const dayDelta = Math.floor(total / (24 * 60));
  const mins = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    date: addDaysToDateKey(date, dayDelta),
    time: `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
  };
}

/**
 * Horário ainda reservável no link público.
 * `minAdvanceHours` 0 = qualquer horário que ainda não começou em Brasília.
 */
export function isPublicBookableSlot(input: {
  date: string;
  startTime: string;
  minAdvanceHours: number;
  maxAdvanceDays: number;
  now?: Date;
}): boolean {
  if (!parseDateKey(input.date)) return false;
  const start = /^(\d{1,2}):(\d{2})/.exec(String(input.startTime || '').trim());
  if (!start) return false;
  const startTime = `${String(Number(start[1])).padStart(2, '0')}:${start[2]}`;

  const now = input.now ?? new Date();
  const today = getBrazilDateKey(now);
  const horizon = Math.max(0, Number(input.maxAdvanceDays) || 0);
  const maxDate = addDaysToDateKey(today, horizon);
  if (input.date < today || input.date > maxDate) return false;

  const min = addHoursToBrazilDateTime(now, Math.max(0, Number(input.minAdvanceHours) || 0));
  if (input.date !== min.date) return input.date > min.date;
  return startTime >= min.time;
}

export const MAX_AVAILABILITY_RANGE_DAYS = 366;

/**
 * Datas YYYY-MM-DD de `fromDate` até `toDate` (inclusive).
 * `weekdays` usa 0=domingo … 6=sábado; se omitido, inclui todos os dias.
 */
export function listDateKeysInRange(
  fromDate: string,
  toDate: string,
  options?: { weekdays?: number[]; minDate?: string; maxDays?: number }
): string[] {
  const fromParsed = parseDateKey(fromDate);
  const toParsed = parseDateKey(toDate);
  if (!fromParsed || !toParsed) return [];

  let start = fromDate <= toDate ? fromDate : toDate;
  let end = fromDate <= toDate ? toDate : fromDate;
  if (options?.minDate && start < options.minDate) start = options.minDate;
  if (start > end) return [];

  const weekdaySet =
    options?.weekdays && options.weekdays.length > 0
      ? new Set(options.weekdays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))
      : null;

  const cap = options?.maxDays ?? MAX_AVAILABILITY_RANGE_DAYS;
  const dates: string[] = [];
  let cursor = start;
  let walked = 0;
  while (cursor <= end) {
    if (walked++ >= cap) break;
    const weekday = getWeekdayFromDateKey(cursor);
    if (weekday !== null && (!weekdaySet || weekdaySet.has(weekday))) {
      dates.push(cursor);
    }
    const next = addDaysToDateKey(cursor, 1);
    if (next === cursor) break;
    cursor = next;
  }
  return dates;
}

export function getWeekdayFromDateKey(date: string): number | null {
  const parsed = parseDateKey(date);
  if (!parsed) return null;
  return new Date(parsed.year, parsed.month, parsed.day).getDay();
}

export function buildAvailabilityDocId(date: string, startTime: string, endTime: string): string {
  return `slot_${date}_${startTime.replace(':', '')}_${endTime.replace(':', '')}`;
}

export function parseAvailabilityDocId(
  id: string
): { date: string; startTime: string; endTime: string } | null {
  const match = /^slot_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})_(\d{2})(\d{2})$/.exec(id);
  if (!match) return null;
  return {
    date: match[1],
    startTime: `${match[2]}:${match[3]}`,
    endTime: `${match[4]}:${match[5]}`,
  };
}

export function slotKey(date: string, startTime: string, endTime: string): string {
  return `${date}|${startTime}|${endTime}`;
}
