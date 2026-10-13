import {
  getWeeklyNutritionCheckInFillWindow,
  isWeeklyNutritionCheckInFillWindowOpen,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import type { PlanoTerapeuticoTreatmentWeek } from '@/lib/nutri/checkInSemanalNutriTreatmentEligibility';
import { getNutritionWeek, type NutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';

export type PickerWeeklyNutritionCheckIn = {
  week: NutritionWeek;
  treatmentWeekNumber: number;
  treatmentWeekStart: string;
  treatmentWeekEnd: string;
  scheduledDate: string;
  scheduledTime: string;
  isCurrent: boolean;
  answered: boolean;
  fillable: boolean;
};

function todayYmd(now: Date): string {
  return ymdLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Uma linha por semana do plano terapêutico já iniciada, da atual para a primeira.
 */
export function listPickerWeeklyNutritionCheckIns(input: {
  answeredWeekKeys: Iterable<string>;
  schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null;
  treatmentWeeks: PlanoTerapeuticoTreatmentWeek[];
  now?: Date;
}): PickerWeeklyNutritionCheckIn[] {
  const now = input.now ?? new Date();
  const answered = new Set(
    [...input.answeredWeekKeys].map((key) => String(key).trim()).filter(Boolean)
  );
  const today = todayYmd(now);
  const started = [...input.treatmentWeeks]
    .filter((week) => week.start <= today)
    .sort((a, b) => b.semana - a.semana);
  const currentNum = started[0]?.semana ?? null;

  if (started.length === 0) {
    const current = getNutritionWeek(now);
    const fillWindow = getWeeklyNutritionCheckInFillWindow({
      week: current,
      schedule: input.schedule,
    });
    return [
      {
        week: current,
        treatmentWeekNumber: 0,
        treatmentWeekStart: current.weekStart,
        treatmentWeekEnd: current.weekEnd,
        scheduledDate: fillWindow.scheduledDate,
        scheduledTime: fillWindow.scheduledTime,
        isCurrent: true,
        answered: answered.has(current.weekKey),
        fillable: isWeeklyNutritionCheckInFillWindowOpen({
          week: current,
          schedule: input.schedule,
          now,
        }),
      },
    ];
  }

  return started.map((treatmentWeek) => {
    const week = getNutritionWeek(treatmentWeek.start);
    const fillWindow = getWeeklyNutritionCheckInFillWindow({
      week,
      schedule: input.schedule,
    });
    return {
      week,
      treatmentWeekNumber: treatmentWeek.semana,
      treatmentWeekStart: treatmentWeek.start,
      treatmentWeekEnd: treatmentWeek.end,
      scheduledDate: fillWindow.scheduledDate,
      scheduledTime: fillWindow.scheduledTime,
      isCurrent: treatmentWeek.semana === currentNum,
      answered: answered.has(week.weekKey),
      fillable: isWeeklyNutritionCheckInFillWindowOpen({
        week,
        schedule: input.schedule,
        now,
      }),
    };
  });
}
