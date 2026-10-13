/**
 * Persistência de edição estrutural + agendamento na Central.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  applyCombinedWorkoutEdit,
  inferSchedulesForPatients,
  previewCombinedWorkoutEdit,
  type CombinedEditInput,
  type CombinedEditWriters,
  type SharedScheduleView,
} from '@/lib/metapersonal/bulkWorkoutSchedule';
import type { PlannerCardPatient } from '@/lib/metapersonal/treinosPlannerGroup';

function firestoreWriters(): CombinedEditWriters {
  return {
    getSession: (sessionId) => trainingSessionService.getSession(sessionId),
    getSessionExercises: (sessionId) => trainingSessionService.getSessionExercises(sessionId),
    listPatientSessions: (patientId, startDate, endDate) =>
      trainingSessionService.getPatientSessionsInDateRange(patientId, startDate, endDate),
    updateExercisePrescription: (sessionId, exerciseDocId, prescription) =>
      trainingSessionService.updateExercisePrescription(sessionId, exerciseDocId, prescription),
    updateExerciseTrainerNote: (sessionId, exerciseDocId, trainerNote) =>
      trainingSessionService.updateExerciseTrainerNote(sessionId, exerciseDocId, trainerNote),
    updateExerciseOrder: (sessionId, exerciseDocId, order) =>
      trainingSessionService.updateExerciseOrder(sessionId, exerciseDocId, order),
    addExercise: (sessionId, exercise) => trainingSessionService.addSessionExercise(sessionId, exercise),
    deleteExercise: (sessionId, exerciseDocId) =>
      trainingSessionService.deleteSessionExercise(sessionId, exerciseDocId),
    createSessionWithExercises: (session, exercises) =>
      trainingSessionService.createSessionWithExercises(session, exercises),
    setSessionsActive: (sessionIds, active) => trainingSessionService.setSessionsActive(sessionIds, active),
    updateSession: (sessionId, updates) => trainingSessionService.updateSession(sessionId, updates),
  };
}

export async function inferCardSchedules(
  patients: PlannerCardPatient[],
  today: string
): Promise<SharedScheduleView> {
  return inferSchedulesForPatients(patients, today, firestoreWriters());
}

export async function previewBulkWorkoutAndSchedule(input: CombinedEditInput) {
  return previewCombinedWorkoutEdit(input, firestoreWriters());
}

export async function saveBulkWorkoutAndSchedule(input: CombinedEditInput) {
  return applyCombinedWorkoutEdit(input, firestoreWriters());
}
