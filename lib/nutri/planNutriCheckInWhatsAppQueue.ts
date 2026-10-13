import {
  buildWeeklyNutritionCheckInSlot,
  listNutritionWeeksOverlappingYmdRange,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import {
  isNutritionCheckInScheduledDateEligible,
  type NutritionTreatmentWindow,
} from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import { addDaysToYmd } from '@/lib/nutri/checkInSemanalNutriYmd';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';

export type PlannedNutriCheckInWhatsAppItem = {
  weekKey: string;
  scheduledDate: string;
  scheduledTime: string;
  milestone: 'd0' | 'dplus1';
  scheduledDateKey: string;
};

export function planNutriCheckInWhatsAppQueueItems(input: {
  schedule: Pick<NutriWeeklyCheckInSchedule, 'patientId' | 'nutritionistId' | 'weekday' | 'time' | 'enabled'>;
  statusTratamento?: string | null;
  window: NutritionTreatmentWindow | null;
  existingWeekKeys?: Iterable<string>;
  todayKey: string;
  horizonKey: string;
  records?: Array<Pick<CheckInSemanalNutri, 'weekKey' | 'scheduledDate'>>;
}): PlannedNutriCheckInWhatsAppItem[] {
  if (!input.schedule.enabled) return [];
  const existing = new Set(input.existingWeekKeys ?? []);
  const lookbackStart = addDaysToYmd(input.todayKey, -1);
  const weeks = listNutritionWeeksOverlappingYmdRange(lookbackStart, input.horizonKey);
  const recordsByWeek = new Map((input.records ?? []).map((record) => [record.weekKey, record]));
  const items: PlannedNutriCheckInWhatsAppItem[] = [];

  for (const week of weeks) {
    if (existing.has(week.weekKey)) continue;
    const slot = buildWeeklyNutritionCheckInSlot({
      schedule: input.schedule,
      week,
      record: recordsByWeek.get(week.weekKey) ?? null,
    });
    if (!slot || slot.status === 'completed') continue;
    if (
      !isNutritionCheckInScheduledDateEligible({
        statusTratamento: input.statusTratamento,
        window: input.window,
        scheduledDate: slot.scheduledDate,
      })
    ) {
      continue;
    }

    const d0DateKey = slot.scheduledDate;
    const atrasadoDateKey = addDaysToYmd(slot.scheduledDate, 1);

    if (d0DateKey >= input.todayKey && d0DateKey <= input.horizonKey) {
      items.push({
        weekKey: slot.weekKey,
        scheduledDate: slot.scheduledDate,
        scheduledTime: slot.scheduledTime,
        milestone: 'd0',
        scheduledDateKey: d0DateKey,
      });
    }
    if (atrasadoDateKey >= input.todayKey && atrasadoDateKey <= input.horizonKey) {
      items.push({
        weekKey: slot.weekKey,
        scheduledDate: slot.scheduledDate,
        scheduledTime: slot.scheduledTime,
        milestone: 'dplus1',
        scheduledDateKey: atrasadoDateKey,
      });
    }
  }

  return items;
}
