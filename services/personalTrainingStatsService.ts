import { trainingSessionService } from '@/services/trainingSessionService';
import { TrainingExerciseExecutionService } from '@/services/trainingExerciseExecutionService';
import {
  buildTrainingStatsDataset,
  emptyTrainingStatsDataset,
  resolvePatientIdCandidates,
  statsPeriodRange,
  type StatsPeriodDays,
  type TrainingStatsDataset,
  type TrainingStatsSessionInput,
} from '@/lib/personal/trainingStats';

export class PersonalTrainingStatsService {
  /**
   * Uma leitura de sessões no período +, por sessão, exercises e exerciseExecutions em paralelo.
   * Usa só o patientId recebido. O sufixo `_timestamp` do cadastro não é outra chave do mesmo paciente.
   */
  static async loadDataset(
    patientId: string | null,
    periodDays: StatsPeriodDays,
    now: Date = new Date()
  ): Promise<TrainingStatsDataset> {
    const period = { days: periodDays, ...statsPeriodRange(periodDays, now) };
    const candidates = resolvePatientIdCandidates(patientId || '');
    if (candidates.length === 0) {
      return emptyTrainingStatsDataset(period);
    }

    const sessions = await trainingSessionService.getPatientSessionsInDateRange(
      candidates[0],
      period.startDate,
      period.endDate
    );

    const inputs: TrainingStatsSessionInput[] = await Promise.all(
      sessions.map(async (session) => {
        const sessionId = session.id;
        if (!sessionId) {
          return { session, exercises: [], executions: [] };
        }
        const [exercises, executions] = await Promise.all([
          trainingSessionService.getSessionExercises(sessionId),
          TrainingExerciseExecutionService.listBySession(sessionId),
        ]);
        return { session, exercises, executions };
      })
    );

    return buildTrainingStatsDataset(inputs, period);
  }
}
