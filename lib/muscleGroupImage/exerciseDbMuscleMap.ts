/**
 * Mapa ExerciseDB (bodyPart / target) → IDs do Muscle Group Image Generator (RapidAPI).
 * IDs de imagem usam lowercase (ex.: chest, calfs, gluteus).
 */

export type MuscleGroupId = string;

/** Targets ExerciseDB → músculo da API de imagem. */
export const EXERCISEDB_TARGET_TO_MUSCLE_GROUP: Record<string, MuscleGroupId> = {
  abductors: 'abductors',
  abs: 'abs',
  adductors: 'adductors',
  biceps: 'biceps',
  calves: 'calfs',
  delts: 'shoulders',
  'anterior deltoids': 'shoulders_front',
  'middle delts': 'shoulders',
  'rear delts': 'shoulders_back',
  forearms: 'forearms',
  glutes: 'gluteus',
  hamstrings: 'hamstring',
  lats: 'latissimus',
  'levator scapulae': 'neck',
  pectorals: 'chest',
  quads: 'quadriceps',
  quadriceps: 'quadriceps',
  'serratus anterior': 'chest',
  spine: 'back_lower',
  traps: 'back_upper',
  triceps: 'triceps',
  'upper back': 'back_upper',
  'lower back': 'back_lower',
};

/** bodyPart ExerciseDB → músculo da API (fallback quando target não mapeia). */
export const EXERCISEDB_BODYPART_TO_MUSCLE_GROUP: Record<string, MuscleGroupId> = {
  back: 'back',
  chest: 'chest',
  'lower arms': 'forearms',
  'lower legs': 'calfs',
  neck: 'neck',
  shoulders: 'shoulders',
  'upper arms': 'biceps',
  'upper legs': 'legs',
  waist: 'abs',
};

function norm(value: string | undefined | null): string {
  return String(value || '')
    .toLowerCase()
    .trim();
}

/** Converte um target ou bodyPart ExerciseDB para ID da API (ou null). */
export function mapExerciseDbToMuscleGroup(
  target?: string | null,
  bodyPart?: string | null
): MuscleGroupId | null {
  const t = norm(target);
  if (t && EXERCISEDB_TARGET_TO_MUSCLE_GROUP[t]) {
    return EXERCISEDB_TARGET_TO_MUSCLE_GROUP[t];
  }
  const bp = norm(bodyPart);
  if (bp && EXERCISEDB_BODYPART_TO_MUSCLE_GROUP[bp]) {
    return EXERCISEDB_BODYPART_TO_MUSCLE_GROUP[bp];
  }
  return null;
}

export type SessionMuscleSource = {
  target?: string | null;
  bodyPart?: string | null;
};

/**
 * Rankeia músculos do treino pelo target dos exercícios (fallback bodyPart).
 * Retorna até `limit` IDs únicos da API de imagem.
 */
export function muscleGroupsFromSessionExercises(
  exercises: SessionMuscleSource[],
  limit = 4
): MuscleGroupId[] {
  const counts = new Map<MuscleGroupId, number>();
  for (const ex of exercises) {
    const id = mapExerciseDbToMuscleGroup(ex.target, ex.bodyPart);
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, Math.max(1, limit))
    .map(([id]) => id);
}

export type MuscleGroupImageParams = {
  muscles: MuscleGroupId[];
  color?: string;
  backgroundColor?: string;
  transparent?: boolean;
  size?: 'small' | 'medium' | 'large' | 'original' | string;
};

/** URL do proxy local para a imagem dos grupos musculares. */
export function buildMuscleGroupImageUrl(params: MuscleGroupImageParams): string {
  const muscles = params.muscles.map((m) => norm(m)).filter(Boolean);
  if (muscles.length === 0) return '';
  const qs = new URLSearchParams();
  qs.set('muscles', muscles.join(','));
  if (params.color) qs.set('color', params.color.replace(/^#/, ''));
  if (params.backgroundColor) qs.set('backgroundColor', params.backgroundColor.replace(/^#/, ''));
  if (params.transparent !== false) qs.set('transparent', 'true');
  if (params.size) qs.set('size', params.size);
  return `/api/muscle-group/image?${qs.toString()}`;
}
