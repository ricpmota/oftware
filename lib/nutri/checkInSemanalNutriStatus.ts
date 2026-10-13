import { parseNutritionYmdLocal } from '@/lib/nutri/checkInSemanalNutriWeek';
import type { CheckInSemanalNutriStatus } from '@/lib/nutri/checkInSemanalNutriTypes';
import { ymdLocal } from '@/utils/datasAplicacaoSemanaPlano';

export type ResolveCheckInSemanalNutriStatusInput = {
  hasRecord: boolean;
  scheduledDate?: string | null;
  weekEnd?: string | null;
  today?: Date | string;
};

/**
 * Status derivado (não persistido):
 * completed = existe check-in da weekKey
 * upcoming = data programada (ou domingo da semana) ainda no futuro
 * pending = data programada já chegou e não há check-in
 */
export function resolveCheckInSemanalNutriStatus(
  input: ResolveCheckInSemanalNutriStatusInput
): CheckInSemanalNutriStatus {
  if (input.hasRecord) return 'completed';

  const today = input.today
    ? parseNutritionYmdLocal(input.today)
    : parseNutritionYmdLocal(new Date());
  const todayKey = ymdLocal(today);

  const scheduled = input.scheduledDate?.trim() || input.weekEnd?.trim() || '';
  if (!scheduled) return 'pending';

  if (scheduled > todayKey) return 'upcoming';
  return 'pending';
}
