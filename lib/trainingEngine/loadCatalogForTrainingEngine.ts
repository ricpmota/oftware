/**
 * Carrega catálogo candidato uma vez (por bodyPart) para o motor.
 * Sem chamada por slot.
 */

import { exerciseDbService } from '@/services/exerciseDbService';
import type { Exercise } from '@/types/exercise';

const BODY_PARTS = [
  'back',
  'chest',
  'shoulders',
  'upper arms',
  'upper legs',
  'lower legs',
  'waist',
  'cardio',
] as const;

const PER_PART_LIMIT = 40;

/** Cache em memória do cliente (TTL curto). */
let memoryCache: { at: number; exercises: Exercise[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function loadCatalogForTrainingEngine(options?: {
  forceRefresh?: boolean;
}): Promise<{ exercises: Exercise[]; catalogVersion: string }> {
  if (
    !options?.forceRefresh &&
    memoryCache &&
    Date.now() - memoryCache.at < CACHE_TTL_MS
  ) {
    return {
      exercises: memoryCache.exercises,
      catalogVersion: `exercisedb_bodyparts_v1_${memoryCache.exercises.length}`,
    };
  }

  const batches = await Promise.all(
    BODY_PARTS.map((bodyPart) =>
      exerciseDbService
        .getExercises({ bodyPart, limit: PER_PART_LIMIT })
        .catch(() => [] as Exercise[])
    )
  );

  const byId = new Map<string, Exercise>();
  for (const list of batches) {
    for (const ex of list) {
      if (ex?.id && !byId.has(ex.id)) byId.set(ex.id, ex);
    }
  }

  const exercises = [...byId.values()];
  memoryCache = { at: Date.now(), exercises };

  return {
    exercises,
    catalogVersion: `exercisedb_bodyparts_v1_${exercises.length}`,
  };
}
