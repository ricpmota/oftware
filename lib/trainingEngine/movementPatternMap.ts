/**
 * Inferência controlada de padrões de movimento a partir do catálogo ExerciseDB.
 * Sem processamento livre / IA.
 */

import type { TrainingMovementPattern } from '@/types/trainingPersonalizationIndex';

type InferResult = {
  patterns: TrainingMovementPattern[];
  confidence: 'mapped' | 'inferred' | 'unknown';
};

/** Aliases controlados no nome normalizado (substring). */
const NAME_ALIASES: { match: string; pattern: TrainingMovementPattern }[] = [
  { match: 'squat', pattern: 'squat' },
  { match: 'leg press', pattern: 'squat' },
  { match: 'lunge', pattern: 'squat' },
  { match: 'bench press', pattern: 'horizontal_push' },
  { match: 'push-up', pattern: 'horizontal_push' },
  { match: 'push up', pattern: 'horizontal_push' },
  { match: 'chest press', pattern: 'horizontal_push' },
  { match: 'shoulder press', pattern: 'vertical_push' },
  { match: 'overhead press', pattern: 'vertical_push' },
  { match: 'military press', pattern: 'vertical_push' },
  { match: 'row', pattern: 'horizontal_pull' },
  { match: 'pull-up', pattern: 'vertical_pull' },
  { match: 'pull up', pattern: 'vertical_pull' },
  { match: 'chin-up', pattern: 'vertical_pull' },
  { match: 'pulldown', pattern: 'vertical_pull' },
  { match: 'lat pull', pattern: 'vertical_pull' },
  { match: 'deadlift', pattern: 'hip_hinge' },
  { match: 'hip hinge', pattern: 'hip_hinge' },
  { match: 'romanian', pattern: 'hip_hinge' },
  { match: 'good morning', pattern: 'hip_hinge' },
  { match: 'hip thrust', pattern: 'hip_hinge' },
  { match: 'glute bridge', pattern: 'hip_hinge' },
  { match: 'curl', pattern: 'elbow_flexion' },
  { match: 'extension', pattern: 'elbow_extension' },
  { match: 'kickback', pattern: 'elbow_extension' },
  { match: 'pushdown', pattern: 'elbow_extension' },
  { match: 'calf raise', pattern: 'calf_raise' },
  { match: 'plank', pattern: 'core_stability' },
  { match: 'crunch', pattern: 'core_stability' },
  { match: 'sit-up', pattern: 'core_stability' },
  { match: 'russian twist', pattern: 'rotation' },
  { match: 'run', pattern: 'running' },
  { match: 'sprint', pattern: 'running' },
  { match: 'jog', pattern: 'running' },
  { match: 'jump', pattern: 'jumping' },
  { match: 'burpee', pattern: 'jumping' },
  { match: 'box jump', pattern: 'jumping' },
  { match: 'stepmill', pattern: 'stair_climbing' },
  { match: 'stair', pattern: 'stair_climbing' },
  { match: 'farmer', pattern: 'carry' },
  { match: 'carry', pattern: 'carry' },
];

const TARGET_PATTERNS: Record<string, TrainingMovementPattern[]> = {
  quads: ['squat', 'knee_extension'],
  hamstrings: ['hip_hinge', 'knee_flexion'],
  glutes: ['hip_hinge'],
  calves: ['calf_raise'],
  pectorals: ['horizontal_push'],
  delts: ['vertical_push', 'overhead_reach'],
  lats: ['vertical_pull'],
  'upper back': ['horizontal_pull'],
  traps: ['horizontal_pull'],
  biceps: ['elbow_flexion'],
  triceps: ['elbow_extension'],
  abs: ['core_stability'],
  spine: ['core_stability'],
  abductors: ['hip_abduction'],
  adductors: ['hip_adduction'],
  'cardiovascular system': ['locomotion'],
};

const BODY_PART_FALLBACK: Record<string, TrainingMovementPattern[]> = {
  chest: ['horizontal_push'],
  back: ['horizontal_pull'],
  shoulders: ['vertical_push'],
  'upper legs': ['squat'],
  'lower legs': ['calf_raise'],
  waist: ['core_stability'],
  cardio: ['locomotion'],
  'upper arms': ['elbow_flexion'],
  'lower arms': ['other'],
};

export function inferMovementPatterns(params: {
  name: string;
  target: string | null;
  bodyPart: string | null;
  category?: string | null;
}): InferResult {
  const patterns: TrainingMovementPattern[] = [];
  const push = (p: TrainingMovementPattern) => {
    if (!patterns.includes(p)) patterns.push(p);
  };

  const name = params.name.toLowerCase();
  let fromName = false;
  for (const alias of NAME_ALIASES) {
    if (name.includes(alias.match)) {
      push(alias.pattern);
      fromName = true;
    }
  }

  const target = (params.target || '').toLowerCase();
  let fromTarget = false;
  if (target && TARGET_PATTERNS[target]) {
    for (const p of TARGET_PATTERNS[target]) push(p);
    fromTarget = true;
  }

  const bodyPart = (params.bodyPart || '').toLowerCase();
  let fromBody = false;
  if (patterns.length === 0 && bodyPart && BODY_PART_FALLBACK[bodyPart]) {
    for (const p of BODY_PART_FALLBACK[bodyPart]) push(p);
    fromBody = true;
  }

  if (params.category === 'cardio') push('locomotion');
  if (params.category === 'mobility' || params.category === 'stretching') {
    // sem padrão específico de mobilidade no contrato de restrição
  }

  if (patterns.length === 0) {
    return { patterns: ['other'], confidence: 'unknown' };
  }

  if (fromName) return { patterns, confidence: 'mapped' };
  if (fromTarget || fromBody) return { patterns, confidence: 'inferred' };
  return { patterns, confidence: 'inferred' };
}

/** Heurística controlada: nomes típicos de chão. */
export function inferRequiresFloor(name: string, bodyPart: string | null): boolean | null {
  const n = name.toLowerCase();
  const floorHints = [
    'push-up',
    'push up',
    'plank',
    'crunch',
    'sit-up',
    'bridge',
    'burpee',
    'mountain climber',
    'glute bridge',
    'lying',
    'floor',
  ];
  if (floorHints.some((h) => n.includes(h))) return true;
  if (bodyPart === 'waist' && (n.includes('crunch') || n.includes('plank'))) return true;
  return null;
}

export function inferImpactLevel(params: {
  name: string;
  bodyPart: string | null;
  category?: string | null;
  patterns: TrainingMovementPattern[];
}): { level: 'low' | 'moderate' | 'high' | 'unknown'; confidence: 'mapped' | 'inferred' | 'unknown' } {
  const n = params.name.toLowerCase();
  if (
    params.patterns.includes('jumping') ||
    n.includes('jump') ||
    n.includes('burpee') ||
    n.includes('box jump') ||
    n.includes('plyometric')
  ) {
    return { level: 'high', confidence: 'inferred' };
  }
  if (params.patterns.includes('running') || n.includes('sprint') || n.includes('run')) {
    return { level: 'high', confidence: 'inferred' };
  }
  if (params.category === 'cardio' || params.bodyPart === 'cardio') {
    return { level: 'moderate', confidence: 'inferred' };
  }
  if (params.category === 'strength' || params.category === 'mobility') {
    return { level: 'low', confidence: 'inferred' };
  }
  return { level: 'unknown', confidence: 'unknown' };
}

export function inferNoiseLevel(params: {
  impact: 'low' | 'moderate' | 'high' | 'unknown';
  patterns: TrainingMovementPattern[];
  equipment: string[];
}): { level: 'low' | 'moderate' | 'high' | 'unknown'; confidence: 'mapped' | 'inferred' | 'unknown' } {
  if (params.impact === 'high' || params.patterns.includes('jumping')) {
    return { level: 'high', confidence: 'inferred' };
  }
  if (params.equipment.some((e) => e.includes('barbell') || e.includes('machine'))) {
    return { level: 'moderate', confidence: 'inferred' };
  }
  if (params.impact === 'low') return { level: 'low', confidence: 'inferred' };
  return { level: 'unknown', confidence: 'unknown' };
}
