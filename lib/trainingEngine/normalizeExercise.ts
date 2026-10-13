/**
 * Normaliza Exercise (ExerciseDB) → NormalizedExercise.
 * Puro: sem rede, Firestore ou IA.
 */

import type { Exercise } from '@/types/exercise';
import type { TrainingEnvironmentCode } from '@/types/workoutPlanDraft';
import type { NormalizedExercise } from '@/types/workoutPlanDraft';
import { splitExerciseEquipment, isBodyweightEquipment } from '@/lib/trainingEngine/equipmentMap';
import {
  inferImpactLevel,
  inferMovementPatterns,
  inferNoiseLevel,
  inferRequiresFloor,
} from '@/lib/trainingEngine/movementPatternMap';

function inferEnvironments(
  equipment: string[],
  bodyPart: string | null,
  exerciseType: NormalizedExercise['exerciseType']
): { environments: TrainingEnvironmentCode[]; confidence: 'mapped' | 'inferred' | 'unknown' } {
  const eq = equipment.map((e) => e.toLowerCase());
  const envs = new Set<TrainingEnvironmentCode>();

  const machineLike = eq.some(
    (e) =>
      e.includes('machine') ||
      e === 'cable' ||
      e.includes('smith') ||
      e.includes('sled') ||
      e.includes('elliptical') ||
      e.includes('stationary bike') ||
      e.includes('skierg')
  );
  const freeWeight = eq.some(
    (e) =>
      e.includes('dumbbell') ||
      e.includes('barbell') ||
      e.includes('kettlebell') ||
      e.includes('ez')
  );
  const bw = isBodyweightEquipment(eq);

  if (machineLike) {
    envs.add('gym');
    envs.add('condo_gym');
  }
  if (freeWeight) {
    envs.add('gym');
    envs.add('home');
    envs.add('condo_gym');
  }
  if (bw) {
    envs.add('gym');
    envs.add('home');
    envs.add('condo_gym');
    envs.add('outdoors');
  }
  if (exerciseType === 'cardio' || bodyPart === 'cardio') {
    envs.add('outdoors');
    envs.add('gym');
  }

  if (envs.size === 0) {
    return { environments: [], confidence: 'unknown' };
  }
  return { environments: [...envs], confidence: 'inferred' };
}

function inferExerciseType(exercise: Exercise): NormalizedExercise['exerciseType'] {
  if (exercise.category === 'cardio' || exercise.bodyPart === 'cardio') return 'cardio';
  if (exercise.category === 'mobility' || exercise.category === 'stretching') return 'mobility';
  if (exercise.category === 'strength' || exercise.category === 'plyometrics') return 'strength';
  if (exercise.target === 'cardiovascular system') return 'cardio';
  // default: strength catalog bias
  if (exercise.bodyPart && exercise.bodyPart !== 'cardio') return 'strength';
  return 'other';
}

function inferCompound(params: {
  patterns: string[];
  secondary: string[];
  name: string;
}): boolean | null {
  const n = params.name.toLowerCase();
  const compoundHints = [
    'squat',
    'deadlift',
    'bench press',
    'row',
    'press',
    'pull-up',
    'chin-up',
    'lunge',
    'clean',
    'snatch',
  ];
  if (compoundHints.some((h) => n.includes(h))) return true;
  if (params.secondary.length >= 2) return true;
  const isolation = ['curl', 'extension', 'raise', 'fly', 'kickback', 'pushdown'];
  if (isolation.some((h) => n.includes(h))) return false;
  return null;
}

function inferUnilateral(name: string): boolean | null {
  const n = name.toLowerCase();
  if (
    n.includes('single') ||
    n.includes('one-arm') ||
    n.includes('one arm') ||
    n.includes('unilateral') ||
    n.includes('split squat') ||
    n.includes('bulgarian')
  ) {
    return true;
  }
  return null;
}

export function normalizeExercise(exercise: Exercise): NormalizedExercise {
  const name = String(exercise.name || '').trim();
  const normalizedName = name.toLowerCase();
  const equipment = splitExerciseEquipment(exercise.equipment);
  const bodyPart = exercise.bodyPart ? String(exercise.bodyPart).toLowerCase() : null;
  const target = exercise.target ? String(exercise.target).toLowerCase() : null;
  const secondary = Array.isArray(exercise.secondaryMuscles)
    ? exercise.secondaryMuscles.map((m) => String(m).toLowerCase())
    : [];
  const instructions = Array.isArray(exercise.instructions)
    ? [...exercise.instructions]
    : [];

  const exerciseType = inferExerciseType(exercise);
  const movement = inferMovementPatterns({
    name: normalizedName,
    target,
    bodyPart,
    category: exercise.category,
  });
  const requiresFloor = inferRequiresFloor(normalizedName, bodyPart);
  const impact = inferImpactLevel({
    name: normalizedName,
    bodyPart,
    category: exercise.category,
    patterns: movement.patterns,
  });
  const noise = inferNoiseLevel({
    impact: impact.level,
    patterns: movement.patterns,
    equipment,
  });
  const environments = inferEnvironments(equipment, bodyPart, exerciseType);

  const difficulty = exercise.difficulty ?? 'unknown';

  return {
    id: String(exercise.id),
    source: 'exercise_db',
    sourceId: String(exercise.id),
    name,
    normalizedName,
    bodyPart,
    primaryMuscles: target ? [target] : [],
    secondaryMuscles: secondary,
    equipment,
    environments: environments.environments,
    difficulty,
    movementPatterns: movement.patterns,
    exerciseType,
    impactLevel: impact.level,
    requiresFloor,
    noiseLevel: noise.level,
    isUnilateral: inferUnilateral(normalizedName),
    isCompound: inferCompound({
      patterns: movement.patterns,
      secondary,
      name: normalizedName,
    }),
    contraindicationTags: [],
    limitationTags: [],
    instructions,
    imageUrl: exercise.gifUrl ?? null,
    videoUrl: null,
    metadataConfidence: {
      equipment: equipment.length ? 'mapped' : 'unknown',
      movementPattern: movement.confidence,
      environment: environments.confidence,
      impact: impact.confidence,
    },
  };
}

export function normalizeExerciseCatalog(exercises: Exercise[]): NormalizedExercise[] {
  return exercises.map(normalizeExercise);
}
