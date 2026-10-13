/**
 * Mapa avaliação → strings reais da ExerciseDB (equipmentTranslations / API).
 */

import type { TrainingPersonalizationIndex } from '@/types/trainingPersonalizationIndex';
import type { NormalizedExercise } from '@/types/workoutPlanDraft';

export type AssessmentEquipmentCode =
  | 'mat'
  | 'resistance_bands'
  | 'mini_bands'
  | 'dumbbells'
  | 'kettlebell'
  | 'barbell_plates'
  | 'bench'
  | 'ankle_weights'
  | 'swiss_ball'
  | 'step'
  | 'jump_rope'
  | 'trx'
  | 'stationary_bike'
  | 'treadmill'
  | 'elliptical'
  | 'strength_machines'
  | 'none'
  | 'unknown'
  | 'other';

/** Assessment code → ExerciseDB equipment strings (audited against equipmentTranslations). */
export const ASSESSMENT_TO_API_EQUIPMENT: Record<string, string[]> = {
  none: ['body weight', 'none'],
  mat: ['body weight'],
  resistance_bands: ['resistance band', 'band'],
  mini_bands: ['resistance band', 'band'],
  dumbbells: ['dumbbell'],
  kettlebell: ['kettlebell'],
  barbell_plates: ['barbell', 'olympic barbell', 'ez barbell', 'ez-bar', 'trap bar'],
  bench: ['dumbbell', 'barbell'], // banco sozinho não existe na API; não libera máquina
  ankle_weights: ['weighted'],
  swiss_ball: ['stability ball', 'bosu ball'],
  step: ['body weight', 'stepmill machine'],
  jump_rope: ['rope'],
  trx: ['body weight'], // API não tem "suspension"; peso corporal / assistido
  stationary_bike: ['stationary bike'],
  treadmill: ['body weight'], // corrida/caminhada sem código treadmill dedicado
  elliptical: ['elliptical machine'],
  strength_machines: [
    'machine',
    'leverage machine',
    'smith machine',
    'cable',
    'sled machine',
  ],
  other: [],
  unknown: [],
};

export const BODYWEIGHT_API_EQUIPMENT = new Set(['body weight', 'none']);

export function mapAssessmentEquipmentToApi(assessmentEquipment: string[]): string[] {
  const out = new Set<string>();
  for (const code of assessmentEquipment) {
    const mapped = ASSESSMENT_TO_API_EQUIPMENT[code];
    if (!mapped) continue;
    for (const api of mapped) out.add(api);
  }
  return [...out];
}

export function splitExerciseEquipment(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return String(raw)
    .toLowerCase()
    .split(',')
    .map((s) => s.replace(/\(.*?\)/g, '').trim())
    .filter(Boolean);
}

export function isBodyweightEquipment(equipment: string[]): boolean {
  if (equipment.length === 0) return true;
  return equipment.every((e) => BODYWEIGHT_API_EQUIPMENT.has(e));
}

/**
 * Compatibilidade de equipamento.
 * - unknown / lista vazia desconhecida → apenas body weight
 * - none conhecido → body weight
 * - lista concreta → body weight + mapeados
 */
export function isExerciseEquipmentCompatible(
  exercise: NormalizedExercise,
  index: TrainingPersonalizationIndex
): boolean {
  const exEq = exercise.equipment.map((e) => e.toLowerCase());
  if (exEq.length === 0 || isBodyweightEquipment(exEq)) return true;

  if (!index.environment.equipmentAvailabilityKnown) {
    return false;
  }

  const available = index.environment.availableEquipment || [];
  if (available.length === 0) {
    return false;
  }

  const allowedApi = new Set(mapAssessmentEquipmentToApi(available));
  // body weight always ok above
  return exEq.some((e) => allowedApi.has(e));
}
