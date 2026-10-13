/**
 * Writes de observação em massa. Campos vivos, um documento por paciente.
 */

import { trainingSessionService } from '@/services/trainingSessionService';
import {
  applyBulkWorkoutNotes,
  type BulkNotePlanInput,
  type BulkNoteResult,
} from '@/lib/metapersonal/bulkWorkoutNotes';

export async function saveBulkWorkoutNotes(input: BulkNotePlanInput): Promise<BulkNoteResult> {
  return applyBulkWorkoutNotes(input, {
    updateSessionTrainerNotes: async (sessionId, trainerNotes) => {
      await trainingSessionService.updateSession(sessionId, { trainerNotes });
    },
    updateExerciseTrainerNote: async (sessionId, exerciseDocId, trainerNote) => {
      await trainingSessionService.updateExerciseTrainerNote(sessionId, exerciseDocId, trainerNote);
    },
  });
}
