/**
 * Heurística operacional: região de dor/prioridade → targets/bodyParts ExerciseDB.
 * NÃO é decisão clínica.
 */

/** Prioridade corporal da avaliação → targets ExerciseDB. */
export const BODY_PRIORITY_TO_TARGETS: Record<string, string[]> = {
  full_body: [],
  chest: ['pectorals'],
  back: ['lats', 'upper back', 'traps', 'spine'],
  shoulders: ['delts'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  abs: ['abs'],
  glutes: ['glutes'],
  quads: ['quads'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
};

/** Região de dor da avaliação → targets / bodyParts relacionados. */
export const PAIN_REGION_TO_TARGETS: Record<string, string[]> = {
  knee: ['quads', 'hamstrings', 'calves'],
  hip: ['glutes', 'abductors', 'adductors'],
  lower_back: ['spine', 'glutes', 'hamstrings'],
  upper_back: ['upper back', 'traps', 'lats'],
  neck: ['levator scapulae', 'traps'],
  shoulder: ['delts', 'traps'],
  elbow: ['biceps', 'triceps', 'forearms'],
  wrist: ['forearms'],
  ankle: ['calves'],
  chest: ['pectorals'],
  back: ['lats', 'upper back', 'spine'],
  abs: ['abs'],
};

export function targetsForBodyPriorities(priorities: string[]): string[] {
  const out = new Set<string>();
  for (const p of priorities) {
    for (const t of BODY_PRIORITY_TO_TARGETS[p] || []) out.add(t);
  }
  return [...out];
}

export function targetsForPainRegions(regions: string[]): string[] {
  const out = new Set<string>();
  for (const r of regions) {
    for (const t of PAIN_REGION_TO_TARGETS[r] || []) out.add(t);
  }
  return [...out];
}
