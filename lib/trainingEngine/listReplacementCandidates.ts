/**
 * Lista candidatos compatíveis para substituição de um slot.
 */

import { evaluateExerciseCompatibility } from '@/lib/trainingEngine/evaluateCompatibility';
import { normalizeExerciseCatalog } from '@/lib/trainingEngine/normalizeExercise';
import { compareScoredExercises, scoreExercise } from '@/lib/trainingEngine/scoreExercise';
import { selectExerciseForSlot } from '@/lib/trainingEngine/selectExerciseForSlot';
import type { Exercise } from '@/types/exercise';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type {
  ExerciseCompatibilityResult,
  NormalizedExercise,
  SelectedWorkoutExercise,
  WorkoutExerciseSlot,
  WorkoutPlanDraft,
} from '@/types/workoutPlanDraft';

export type ReplacementCandidate = {
  exercise: SelectedWorkoutExercise;
  normalized: NormalizedExercise;
  totalScore: number;
};

export function listReplacementCandidates(params: {
  draft: WorkoutPlanDraft;
  index: TrainingPersonalizationIndex;
  catalog: Exercise[];
  sessionIndex: number;
  exerciseIndex: number;
  limit?: number;
}): ReplacementCandidate[] {
  const { draft, index, catalog, sessionIndex, exerciseIndex, limit = 20 } = params;
  const session = draft.sessions[sessionIndex];
  const current = session?.exercises[exerciseIndex];
  if (!session || !current) return [];

  const slot: WorkoutExerciseSlot = {
    slotId: current.slotId,
    role: current.role as WorkoutExerciseSlot['role'],
    targetMovementPatterns: current.movementPatterns as WorkoutExerciseSlot['targetMovementPatterns'],
    targetMuscles: current.primaryMuscles,
    required: true,
  };

  const normalized = normalizeExerciseCatalog(catalog);
  const compatibilityById = new Map<string, ExerciseCompatibilityResult>();
  const eligible: NormalizedExercise[] = [];
  for (const ex of normalized) {
    const compat = evaluateExerciseCompatibility(ex, index);
    compatibilityById.set(ex.id, compat);
    if (compat.eligible && ex.id !== current.exerciseId) {
      eligible.push(ex);
    }
  }

  const alreadySelected = session.exercises
    .filter((_, i) => i !== exerciseIndex)
    .map((e) => normalized.find((n) => n.id === e.exerciseId))
    .filter(Boolean) as NormalizedExercise[];

  const scored: ReplacementCandidate[] = [];
  for (const candidate of eligible) {
    const result = selectExerciseForSlot({
      slot,
      candidates: [candidate],
      compatibilityById,
      index,
      alreadySelected,
    });
    if (!result.ok) continue;
    const compat = compatibilityById.get(candidate.id)!;
    const score = scoreExercise({
      exercise: candidate,
      index,
      compatibility: compat,
      slot,
    });
    scored.push({
      exercise: {
        ...result.exercise,
        // Preserva parâmetros do exercício atual (não editar séries nesta etapa)
        sets: current.sets,
        repetitionRange: { ...current.repetitionRange },
        restSeconds: current.restSeconds,
        targetRpe: { ...current.targetRpe },
        slotId: current.slotId,
        role: current.role,
      },
      normalized: candidate,
      totalScore: score.totalScore,
    });
  }

  scored.sort((a, b) =>
    compareScoredExercises(
      { exercise: a.normalized, score: { exerciseId: a.normalized.id, totalScore: a.totalScore, scoreReasons: [] } },
      { exercise: b.normalized, score: { exerciseId: b.normalized.id, totalScore: b.totalScore, scoreReasons: [] } }
    )
  );

  return scored.slice(0, limit);
}
