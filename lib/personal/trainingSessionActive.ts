import type { TrainingSession } from '@/types/trainingSession';

/** Sessões antigas sem o campo continuam ativas. */
export function isTrainingSessionActive(
  session: Pick<TrainingSession, 'active'> | { active?: boolean } | null | undefined
): boolean {
  return session?.active !== false;
}

/** Hoje, cronograma e marcadores da semana: só treinos ligados. */
export function shouldShowSessionOnCalendar(session: Pick<TrainingSession, 'active'>): boolean {
  return isTrainingSessionActive(session);
}

/**
 * Estatísticas: treino desativado não conta como programado/pendente.
 * Sessões já feitas ou puladas continuam no histórico de evolução.
 */
export function shouldCountSessionInStats(
  session: Pick<TrainingSession, 'active'>,
  completion: 'done' | 'skipped' | 'scheduled'
): boolean {
  if (isTrainingSessionActive(session)) return true;
  return completion !== 'scheduled';
}
