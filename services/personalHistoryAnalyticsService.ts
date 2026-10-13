/**
 * Leitura agregada da carteira do personal para Histórico & Estatísticas.
 * Sem escrita. Sem realtime. Sem N+1 por componente.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import { sessionLookupIds } from '@/lib/metapersonal/treinosCoverage';
import { pacienteDisplayName } from '@/components/metapersonal/treinos/treinosCentral.types';
import {
  buildHistoryAnalytics,
  emptyHistoryAnalytics,
  historyLoadWindow,
  type HistoryAnalyticsResult,
  type HistorySessionInput,
} from '@/lib/metapersonal/historicoAnalytics';
import {
  HISTORY_DEFAULT_PERIOD_DAYS,
  type HistoryPeriodDays,
} from '@/lib/metapersonal/historicoThresholds';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const PATIENT_BATCH = 6;
const EXERCISE_BATCH = 8;

async function mapPool<T, R>(
  items: T[],
  size: number,
  mapper: (item: T) => Promise<R>,
  signal?: { cancelled: boolean }
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    if (signal?.cancelled) return out;
    const chunk = await Promise.all(items.slice(i, i + size).map(mapper));
    out.push(...chunk);
  }
  return out;
}

async function loadPatientSessions(
  paciente: PacienteVisivelPersonal['paciente'],
  startDate: string,
  endDate: string
): Promise<TrainingSession[]> {
  const byId = new Map<string, TrainingSession>();
  const ids = sessionLookupIds(paciente);
  for (const lookupId of ids) {
    try {
      const sessions = await trainingSessionService.getPatientSessionsInDateRange(
        lookupId,
        startDate,
        endDate
      );
      for (const session of sessions) {
        if (!session.id) continue;
        byId.set(session.id, session);
      }
    } catch {
      /* tenta o próximo identificador */
    }
  }
  return Array.from(byId.values());
}

function needsExercises(session: TrainingSession): boolean {
  return session.status === 'scheduled';
}

export async function loadPersonalHistoryAnalytics(input: {
  pacientes: PacienteVisivelPersonal[];
  personalName: string;
  periodDays?: HistoryPeriodDays;
  now?: Date;
  photoByUserId?: Record<string, string | null>;
  signal?: { cancelled: boolean };
}): Promise<HistoryAnalyticsResult> {
  const periodDays = input.periodDays ?? HISTORY_DEFAULT_PERIOD_DAYS;
  const now = input.now ?? new Date();
  const window = historyLoadWindow(periodDays, now);
  const ativos = input.pacientes.filter((item) => item.status === 'ativo');

  if (ativos.length === 0) {
    return emptyHistoryAnalytics(periodDays, now);
  }

  const loaded = await mapPool(
    ativos,
    PATIENT_BATCH,
    async (paciente) => {
      const sessions = await loadPatientSessions(
        paciente.paciente,
        window.loadStartDate,
        window.loadEndDate
      );
      return { paciente, sessions };
    },
    input.signal
  );
  if (input.signal?.cancelled) {
    return emptyHistoryAnalytics(periodDays, now);
  }

  const exerciseJobs: TrainingSession[] = [];
  for (const item of loaded) {
    for (const session of item.sessions) {
      if (session.id && needsExercises(session)) exerciseJobs.push(session);
    }
  }

  const exercisesBySessionId = new Map<string, TrainingSessionExercise[]>();
  await mapPool(
    exerciseJobs,
    EXERCISE_BATCH,
    async (session) => {
      const sessionId = session.id;
      if (!sessionId) return null;
      try {
        const exercises = await trainingSessionService.getSessionExercises(sessionId);
        exercisesBySessionId.set(sessionId, exercises);
      } catch {
        exercisesBySessionId.set(sessionId, []);
      }
      return null;
    },
    input.signal
  );
  if (input.signal?.cancelled) {
    return emptyHistoryAnalytics(periodDays, now);
  }

  return buildHistoryAnalytics({
    periodDays,
    personalName: input.personalName,
    now,
    patients: loaded.map(({ paciente, sessions }) => {
      const patientUserId = String(paciente.paciente.userId || '').trim();
      const sessionInputs: HistorySessionInput[] = sessions.map((session) => ({
        session,
        exercises: session.id ? exercisesBySessionId.get(session.id) ?? [] : [],
      }));
      return {
        identity: {
          pacienteId: paciente.pacienteId,
          patientUserId,
          name: pacienteDisplayName(paciente),
          photoUrl: (patientUserId && input.photoByUserId?.[patientUserId]) || null,
        },
        sessions: sessionInputs,
      };
    }),
  });
}
