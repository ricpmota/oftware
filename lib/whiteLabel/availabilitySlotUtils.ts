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
