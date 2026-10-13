/**
 * Substituição manual de exercício no draft — função pura.
 */

import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
import type { SelectedWorkoutExercise, WorkoutPlanDraft } from '@/types/workoutPlanDraft';

export function replaceWorkoutDraftExercise(params: {
  draft: WorkoutPlanDraft;
  sessionIndex: number;
  exerciseIndex: number;
  replacement: SelectedWorkoutExercise;
}): WorkoutPlanDraft {
  const { draft, sessionIndex, exerciseIndex, replacement } = params;
  const sessions = draft.sessions.map((s, i) => {
    if (i !== sessionIndex) {
      return {
        ...s,
        exercises: s.exercises.map((e) => ({ ...e })),
        missingRequiredSlots: [...s.missingRequiredSlots],
      };
    }
    const exercises = s.exercises.map((e, j) =>
      j === exerciseIndex
        ? {
            ...replacement,
            primaryMuscles: [...replacement.primaryMuscles],
            movementPatterns: [...replacement.movementPatterns],
            equipment: [...replacement.equipment],
            selectionReasons: [...replacement.selectionReasons],
            compatibilityWarnings: [...replacement.compatibilityWarnings],
            repetitionRange: { ...replacement.repetitionRange },
            targetRpe: { ...replacement.targetRpe },
          }
        : { ...e }
    );
    return {
      ...s,
      exercises,
      missingRequiredSlots: [...s.missingRequiredSlots],
    };
  });

  const next: WorkoutPlanDraft = {
    ...draft,
    eligibility: {
      ...draft.eligibility,
      blockers: [...draft.eligibility.blockers],
      warnings: [...draft.eligibility.warnings],
    },
    structure: { ...draft.structure },
    catalogDiagnostics: {
      ...draft.catalogDiagnostics,
      missingSlots: [...draft.catalogDiagnostics.missingSlots],
    },
    sessions,
    source: { ...draft.source },
    validation: { valid: false, errors: [], warnings: [] },
  };

  next.validation = validateWorkoutPlanDraft(next);
  return next;
}

/** Restaura exercício original do baseDraft no mesmo slot. */
export function undoWorkoutDraftExerciseReplacement(params: {
  workingDraft: WorkoutPlanDraft;
  baseDraft: WorkoutPlanDraft;
  sessionDayIndex: number;
  slotId: string;
}): WorkoutPlanDraft {
  const { workingDraft, baseDraft, sessionDayIndex, slotId } = params;
  const baseSession = baseDraft.sessions.find((s) => s.dayIndex === sessionDayIndex);
  const baseEx = baseSession?.exercises.find((e) => e.slotId === slotId);
  if (!baseEx) return workingDraft;

  const sessionIndex = workingDraft.sessions.findIndex((s) => s.dayIndex === sessionDayIndex);
  if (sessionIndex < 0) return workingDraft;
  const exerciseIndex = workingDraft.sessions[sessionIndex].exercises.findIndex(
    (e) => e.slotId === slotId
  );
  if (exerciseIndex < 0) return workingDraft;

  return replaceWorkoutDraftExercise({
    draft: workingDraft,
    sessionIndex,
    exerciseIndex,
    replacement: baseEx,
  });
}
