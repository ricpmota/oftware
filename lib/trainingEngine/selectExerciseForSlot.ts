/**
 * Seleção determinística de exercício por slot.
 */

import { DIVERSITY_LIMITS_V1 } from '@/lib/trainingEngine/scoringConstants';
import { compareScoredExercises, scoreExercise } from '@/lib/trainingEngine/scoreExercise';
import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type {
  ExerciseCompatibilityResult,
  NormalizedExercise,
  SelectedWorkoutExercise,
  WorkoutExerciseSlot,
} from '@/types/workoutPlanDraft';

export type ExerciseSelectionResult =
  | {
      ok: true;
      exercise: SelectedWorkoutExercise;
      normalized: NormalizedExercise;
    }
  | {
      ok: false;
      slotId: string;
      reason: 'no_candidate';
    };

function countBy(
  selected: NormalizedExercise[],
  keyFn: (e: NormalizedExercise) => string[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of selected) {
    for (const k of keyFn(e)) {
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return map;
}

function respectsDiversity(
  candidate: NormalizedExercise,
  alreadySelected: NormalizedExercise[]
): boolean {
  const patternCounts = countBy(alreadySelected, (e) => e.movementPatterns);
  for (const p of candidate.movementPatterns) {
    if ((patternCounts.get(p) || 0) >= DIVERSITY_LIMITS_V1.maxPerMovementPattern) {
      return false;
    }
  }
  const muscleCounts = countBy(alreadySelected, (e) => e.primaryMuscles);
  for (const m of candidate.primaryMuscles) {
    if ((muscleCounts.get(m) || 0) >= DIVERSITY_LIMITS_V1.maxPerPrimaryMuscle) {
      return false;
    }
  }
  const eqCounts = countBy(alreadySelected, (e) => e.equipment);
  for (const eq of candidate.equipment) {
    if ((eqCounts.get(eq) || 0) >= DIVERSITY_LIMITS_V1.maxExercisesFromSameEquipment) {
      return false;
    }
  }
  if (alreadySelected.some((e) => e.id === candidate.id)) return false;
  return true;
}

function prescriptionForSlot(
  slot: WorkoutExerciseSlot,
  index: TrainingPersonalizationIndex
): Pick<
  SelectedWorkoutExercise,
  'sets' | 'repetitionRange' | 'restSeconds' | 'targetRpe'
> {
  const gp = index.generationParameters;
  const setsMin = gp.defaultSetsMin ?? 2;
  const setsMax = gp.defaultSetsMax ?? 3;
  const isPrimary =
    slot.role === 'primary_compound' || slot.role === 'secondary_compound';
  const isAccessory =
    slot.role === 'accessory' || slot.role === 'core' || slot.role === 'unilateral';

  const sets = isPrimary ? setsMax : isAccessory ? setsMin : Math.round((setsMin + setsMax) / 2);
  const restMin = gp.defaultRestSecondsMin ?? 60;
  const restMax = gp.defaultRestSecondsMax ?? 90;
  const restSeconds = isPrimary ? restMax : restMin;

  return {
    sets,
    repetitionRange: {
      min: gp.defaultRepRangeMin ?? 8,
      max: gp.defaultRepRangeMax ?? 15,
    },
    restSeconds,
    targetRpe: {
      min: gp.targetRpeMin ?? 4,
      max: gp.targetRpeMax ?? 6,
    },
  };
}

export function selectExerciseForSlot(params: {
  slot: WorkoutExerciseSlot;
  candidates: NormalizedExercise[];
  compatibilityById: Map<string, ExerciseCompatibilityResult>;
  index: TrainingPersonalizationIndex;
  alreadySelected: NormalizedExercise[];
}): ExerciseSelectionResult {
  const { slot, candidates, compatibilityById, index, alreadySelected } = params;

  const scored = candidates
    .filter((c) => {
      const compat = compatibilityById.get(c.id);
      if (!compat?.eligible) return false;
      if (!respectsDiversity(c, alreadySelected)) return false;
      // Preferência soft: se slot tem padrões, preferir match; se nenhum match, ainda aceitar
      return true;
    })
    .map((exercise) => {
      const compatibility = compatibilityById.get(exercise.id)!;
      const score = scoreExercise({ exercise, index, compatibility, slot });
      // Soft filter: boost already in score; require pattern/muscle soft match when possible
      return { exercise, score };
    });

  const withSlotAffinity = scored.filter(({ exercise }) => {
    const patternOk =
      slot.targetMovementPatterns.length === 0 ||
      exercise.movementPatterns.some((p) => slot.targetMovementPatterns.includes(p));
    const muscleOk =
      slot.targetMuscles.length === 0 ||
      exercise.primaryMuscles.some((m) => slot.targetMuscles.includes(m)) ||
      exercise.secondaryMuscles.some((m) => slot.targetMuscles.includes(m));
    return patternOk || muscleOk;
  });

  const pool = withSlotAffinity.length > 0 ? withSlotAffinity : scored;
  pool.sort(compareScoredExercises);

  const best = pool[0];
  if (!best) {
    return { ok: false, slotId: slot.slotId, reason: 'no_candidate' };
  }

  const prescription = prescriptionForSlot(slot, index);
  const compat = compatibilityById.get(best.exercise.id)!;

  return {
    ok: true,
    normalized: best.exercise,
    exercise: {
      exerciseId: best.exercise.id,
      exerciseName: best.exercise.name,
      sourceId: best.exercise.sourceId,
      slotId: slot.slotId,
      role: slot.role,
      primaryMuscles: [...best.exercise.primaryMuscles],
      movementPatterns: [...best.exercise.movementPatterns],
      equipment: [...best.exercise.equipment],
      ...prescription,
      score: best.score.totalScore,
      selectionReasons: best.score.scoreReasons.map((r) => `${r.code}:${r.points}`),
      compatibilityWarnings: [...compat.warnings],
    },
  };
}
