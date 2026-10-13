import {
  isWeeklyNutritionCheckInFillWindowOpen,
  type NutriWeeklyCheckInSchedule,
} from '@/lib/nutri/checkInSemanalNutriSchedule';
import type { CheckInSemanalNutriCapabilities } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import {
  getNutritionWeek,
  isNutritionCheckInFillableWeek,
  isNutritionCheckInFutureWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';

export type CanEditWeeklyNutritionCheckInInput = {
  weekKey: string;
  today?: Date | string;
  readOnly?: boolean;
  capabilities?: Pick<CheckInSemanalNutriCapabilities, 'edit' | 'editCurrentWeek'>;
};

/**
 * Paciente: só a semana de referência do check-in (semana anterior; no domingo, a semana que fecha).
 * Nutricionista/médico: qualquer semana já iniciada (passado e corrente), nunca futura.
 * Personal: nunca.
 */
export function canEditWeeklyNutritionCheckIn(input: CanEditWeeklyNutritionCheckInInput): boolean {
  if (input.readOnly) return false;
  const weekKey = String(input.weekKey || '').trim();
  if (!weekKey) return false;
  const today = input.today ?? new Date();
  if (isNutritionCheckInFutureWeek(weekKey, today)) return false;
  if (input.capabilities) {
    if (input.capabilities.edit) return true;
    if (!input.capabilities.editCurrentWeek) return false;
  }
  return isNutritionCheckInFillableWeek(weekKey, today);
}

export type CanCreateWeeklyNutritionCheckInInput = CanEditWeeklyNutritionCheckInInput & {
  now?: Date;
  schedule?: Pick<NutriWeeklyCheckInSchedule, 'weekday' | 'time' | 'enabled'> | null;
  capabilities?: Pick<CheckInSemanalNutriCapabilities, 'create' | 'edit' | 'editCurrentWeek'>;
};

/**
 * Liberar preenchimento só depois da data/hora de Check-in Ativo do nutricionista.
 * Sem cronograma, usa o padrão (domingo 18:00).
 */
export function canCreateWeeklyNutritionCheckIn(input: CanCreateWeeklyNutritionCheckInInput): boolean {
  if (input.readOnly) return false;
  if (input.capabilities?.create === false) return false;
  if (!canEditWeeklyNutritionCheckIn(input)) return false;
  const now =
    input.now ??
    (input.today instanceof Date ? input.today : undefined);
  return isWeeklyNutritionCheckInFillWindowOpen({
    week: getNutritionWeek(input.weekKey),
    schedule: input.schedule,
    now,
  });
}

export type CheckInSemanalNutriInteraction = 'create' | 'edit' | 'view';

export function resolveCheckInSemanalNutriInteraction(input: {
  hasRecord: boolean;
  canEdit: boolean;
  canCreate?: boolean;
  requested?: CheckInSemanalNutriInteraction | null;
}): CheckInSemanalNutriInteraction {
  if (input.requested === 'view') return 'view';
  if (input.requested === 'edit') {
    if (!input.hasRecord) return input.canCreate === false ? 'view' : 'create';
    return input.canEdit ? 'edit' : 'view';
  }
  if (input.requested === 'create') {
    if (input.hasRecord) return input.canEdit ? 'edit' : 'view';
    return input.canCreate === false ? 'view' : 'create';
  }
  if (!input.hasRecord) return input.canCreate === false ? 'view' : 'create';
  return 'view';
}
