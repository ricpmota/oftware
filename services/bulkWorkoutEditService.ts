/**
 * Writes pontuais de edição estrutural em massa.
 * Não apaga/recria série. Não mexe em patientNotes nem exerciseGymMedia.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  applyBulkWorkoutEdit,
  previewBulkWorkoutEdit,
  type BulkEditPreview,
  type BulkWorkoutEditInput,
  type BulkWorkoutEditResult,
  type BulkWorkoutEditWriters,
} from '@/lib/metapersonal/bulkWorkoutEdit';

function firestoreWriters(): BulkWorkoutEditWriters {
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
  };
}

export async function saveBulkWorkoutEdit(input: BulkWorkoutEditInput): Promise<BulkWorkoutEditResult> {
  return applyBulkWorkoutEdit(input, firestoreWriters());
}

export async function previewSavedBulkWorkoutEdit(input: BulkWorkoutEditInput): Promise<BulkEditPreview> {
  return previewBulkWorkoutEdit(input, firestoreWriters());
}
