/**
 * Leitura pontual das sessões da semana de referência.
 * Sem listeners. Sem escrita. Batch controlado.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import { exerciseGymMediaService } from '@/services/exerciseGymMediaService';
import { sessionLookupIds } from '@/lib/metapersonal/treinosCoverage';
import { weekdayFromDateStr } from '@/lib/metapersonal/treinosWeek';
import { type ExistingSessionRow } from '@/lib/metapersonal/treinosPlannerGroup';
import { pacienteDisplayName, type TreinosSelectedPatient } from '@/components/metapersonal/treinos/treinosCentral.types';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import { gymMediaBelongsToPatient, type ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';

const PATIENT_BATCH = 6;
const EXERCISE_BATCH = 8;
const MEDIA_BATCH = 10;

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

async function loadPatientWeekSessions(
  patient: TreinosSelectedPatient,
  startDate: string,
  endDate: string
): Promise<TrainingSession[]> {
  const byId = new Map<string, TrainingSession>();
  for (const lookupId of sessionLookupIds(patient.paciente)) {
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

export async function loadExistingPlannerRows(input: {
  patients: TreinosSelectedPatient[];
  startDate: string;
  endDate: string;
  signal?: { cancelled: boolean };
}): Promise<ExistingSessionRow[]> {
  const rows: ExistingSessionRow[] = [];
  const loaded = await mapPool(
    input.patients,
    PATIENT_BATCH,
    async (patient) => {
      const sessions = await loadPatientWeekSessions(patient, input.startDate, input.endDate);
      return { patient, sessions };
    },
    input.signal
  );
  if (input.signal?.cancelled) return [];

  const sessionJobs: Array<{
    patient: TreinosSelectedPatient;
    session: TrainingSession;
  }> = [];
  for (const item of loaded) {
    for (const session of item.sessions) {
      sessionJobs.push({ patient: item.patient, session });
    }
  }

  const withExercises = await mapPool(
    sessionJobs,
    EXERCISE_BATCH,
    async (job) => {
      let exercises: TrainingSessionExercise[] = [];
      try {
        if (job.session.id) {
          exercises = await trainingSessionService.getSessionExercises(job.session.id);
        }
      } catch {
        exercises = [];
      }
      return { ...job, exercises };
    },
    input.signal
  );
  if (input.signal?.cancelled) return [];

  const mediaKeys = new Map<string, { patientUserId: string; pacienteId: string; exerciseId: string }>();
  for (const job of withExercises) {
    const patientUserId = String(job.patient.paciente.userId || '').trim();
    const pacienteId = String(job.patient.pacienteId || job.patient.paciente.id || '').trim();
    if (!patientUserId) continue;
    for (const exercise of job.exercises) {
      const exerciseId = String(exercise.exerciseId || '').trim();
      if (!exerciseId) continue;
      mediaKeys.set(`${patientUserId}__${exerciseId}`, { patientUserId, pacienteId, exerciseId });
    }
  }

  const mediaByKey = new Map<string, ExerciseGymMedia>();
  const mediaPairs = Array.from(mediaKeys.values());
  await mapPool(
    mediaPairs,
    MEDIA_BATCH,
    async (pair) => {
      try {
        const media = await exerciseGymMediaService.get(pair.patientUserId, pair.exerciseId);
        if (
          media &&
          gymMediaBelongsToPatient(media, { id: pair.pacienteId, userId: pair.patientUserId })
        ) {
          mediaByKey.set(`${pair.patientUserId}__${pair.exerciseId}`, media);
        }
      } catch {
        /* leitura opcional */
      }
      return null;
    },
    input.signal
  );
  if (input.signal?.cancelled) return [];

  for (const job of withExercises) {
    const weekday = weekdayFromDateStr(job.session.scheduledDate);
    if (!weekday) continue;
    const patientUserId = String(job.patient.paciente.userId || '').trim();
    const gymMedia: ExerciseGymMedia[] = [];
    const seenMedia = new Set<string>();
    for (const exercise of job.exercises) {
      const exerciseId = String(exercise.exerciseId || '').trim();
      const key = `${patientUserId}__${exerciseId}`;
      const media = mediaByKey.get(key);
      if (!media || seenMedia.has(media.id)) continue;
      seenMedia.add(media.id);
      gymMedia.push(media);
    }
    rows.push({
      pacienteId: job.patient.pacienteId,
      patientUserId,
      name: pacienteDisplayName(job.patient),
      weekday,
      session: job.session,
      exercises: job.exercises,
      gymMedia,
    });
  }

  return rows;
}
