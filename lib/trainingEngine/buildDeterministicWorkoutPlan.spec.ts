import { describe, expect, it } from 'vitest';
import { buildTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex';
import { buildSafetyAssessment } from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { buildDeterministicWorkoutPlan } from '@/lib/trainingEngine/buildDeterministicWorkoutPlan';
import { buildWeeklyStructure } from '@/lib/trainingEngine/buildWeeklyStructure';
import { evaluateExerciseCompatibility } from '@/lib/trainingEngine/evaluateCompatibility';
import {
  isExerciseEquipmentCompatible,
  mapAssessmentEquipmentToApi,
} from '@/lib/trainingEngine/equipmentMap';
import { normalizeExercise } from '@/lib/trainingEngine/normalizeExercise';
import { compareScoredExercises, scoreExercise } from '@/lib/trainingEngine/scoreExercise';
import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
import type { Exercise } from '@/types/exercise';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaBasicAnswers,
} from '@/types/avaliacaoAtividadeFisica';
import type { NormalizedExercise } from '@/types/workoutPlanDraft';

function makeExercise(partial: Partial<Exercise> & Pick<Exercise, 'id' | 'name'>): Exercise {
  return {
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'dumbbell',
    secondaryMuscles: ['triceps', 'delts'],
    instructions: ['Step 1', 'Step 2'],
    difficulty: 'beginner',
    category: 'strength',
    ...partial,
  };
}

const CATALOG: Exercise[] = [
  makeExercise({
    id: '1',
    name: 'Barbell Squat',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'barbell',
    secondaryMuscles: ['glutes'],
  }),
  makeExercise({
    id: '2',
    name: 'Dumbbell Bench Press',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'dumbbell',
  }),
  makeExercise({
    id: '3',
    name: 'Barbell Row',
    bodyPart: 'back',
    target: 'upper back',
    equipment: 'barbell',
    secondaryMuscles: ['biceps', 'lats'],
  }),
  makeExercise({
    id: '4',
    name: 'Romanian Deadlift',
    bodyPart: 'upper legs',
    target: 'hamstrings',
    equipment: 'barbell',
    secondaryMuscles: ['glutes'],
  }),
  makeExercise({
    id: '5',
    name: 'Pull-up',
    bodyPart: 'back',
    target: 'lats',
    equipment: 'body weight',
  }),
  makeExercise({
    id: '6',
    name: 'Dumbbell Shoulder Press',
    bodyPart: 'shoulders',
    target: 'delts',
    equipment: 'dumbbell',
  }),
  makeExercise({
    id: '7',
    name: 'Push-up',
    bodyPart: 'chest',
    target: 'pectorals',
    equipment: 'body weight',
  }),
  makeExercise({
    id: '8',
    name: 'Plank',
    bodyPart: 'waist',
    target: 'abs',
    equipment: 'body weight',
  }),
  makeExercise({
    id: '9',
    name: 'Box Jump',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'body weight',
    category: 'plyometrics',
  }),
  makeExercise({
    id: '10',
    name: 'Running',
    bodyPart: 'cardio',
    target: 'cardiovascular system',
    equipment: 'body weight',
    category: 'cardio',
  }),
  makeExercise({
    id: '11',
    name: 'Cable Lat Pulldown',
    bodyPart: 'back',
    target: 'lats',
    equipment: 'cable',
  }),
  makeExercise({
    id: '12',
    name: 'Leg Press',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'leverage machine',
  }),
  makeExercise({
    id: '13',
    name: 'Advanced Olympic Snatch',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'barbell',
    difficulty: 'advanced',
  }),
  makeExercise({
    id: '14',
    name: 'Bulgarian Split Squat',
    bodyPart: 'upper legs',
    target: 'quads',
    equipment: 'dumbbell',
  }),
  makeExercise({
    id: '15',
    name: 'Standing Calf Raise',
    bodyPart: 'lower legs',
    target: 'calves',
    equipment: 'body weight',
  }),
];

function baseAnswers(
  overrides: Partial<AvaliacaoAtividadeFisicaBasicAnswers> = {}
): AvaliacaoAtividadeFisicaBasicAnswers {
  return {
    primaryGoal: 'muscle_gain',
    experienceLevel: 'between_6_months_and_2_years',
    currentlyActive: true,
    availableDaysPerWeek: 3,
    preferredWeekdays: ['monday', 'wednesday', 'friday'],
    variableSchedule: false,
    sessionDurationMinutes: 45,
    durationConsistency: 'consistent',
    trainingLocation: 'gym',
    bodyPriorities: ['full_body'],
    preferredModalities: ['free_weights', 'machines'],
    preferredIntensity: 'moderate',
    cardioPreference: 'little',
    preferredCardioActivities: ['walk'],
    trainingBarriers: [],
    availableEquipment: ['dumbbells', 'barbell_plates', 'strength_machines'],
    floorExerciseAvailability: 'yes',
    environmentImpactNoiseRestriction: 'no',
    currentPainLevel: 'none',
    hasRelevantInjury: 'no',
    hasRelevantSurgery: 'no',
    movementLimitations: ['none'],
    hasProfessionalExerciseRestriction: 'no',
    finalConfirmationAccepted: true,
    ...overrides,
  };
}

function makeIndex(
  answers: AvaliacaoAtividadeFisicaBasicAnswers = baseAnswers()
) {
  const safety = buildSafetyAssessment(answers);
  const summary = buildPhysicalActivityAssessmentSummary(answers, safety);
  const assessment: AvaliacaoAtividadeFisica = {
    id: 'p1',
    patientId: 'p1',
    status: 'completed',
    version: 1,
    answers,
    safety,
    summary,
    startedAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    completedAt: new Date('2026-01-02'),
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
  };
  return buildTrainingPersonalizationIndex(assessment);
}

describe('normalizeExercise', () => {
  it('converte ExerciseDB e preserva id/instruções', () => {
    const raw = makeExercise({ id: 'x1', name: 'Dumbbell Bench Press' });
    const n = normalizeExercise(raw);
    expect(n.source).toBe('exercise_db');
    expect(n.sourceId).toBe('x1');
    expect(n.id).toBe('x1');
    expect(n.instructions).toEqual(['Step 1', 'Step 2']);
    expect(n.equipment).toContain('dumbbell');
    expect(n.movementPatterns).toContain('horizontal_push');
    expect(n.primaryMuscles).toEqual(['pectorals']);
  });

  it('campos ausentes → unknown/null; função pura', () => {
    const raw = makeExercise({
      id: 'x2',
      name: 'Mystery Move',
      difficulty: undefined,
      category: undefined,
      gifUrl: undefined,
    });
    const a = normalizeExercise(raw);
    const b = normalizeExercise(raw);
    expect(a).toEqual(b);
    expect(a.difficulty).toBe('unknown');
    expect(a.videoUrl).toBeNull();
  });
});

describe('equipamentos', () => {
  it('dumbbells → dumbbell; body weight sem equipamento', () => {
    expect(mapAssessmentEquipmentToApi(['dumbbells'])).toContain('dumbbell');
    const bw = normalizeExercise(
      makeExercise({ id: 'bw', name: 'Push-up', equipment: 'body weight' })
    );
    const index = makeIndex(baseAnswers({ availableEquipment: ['none'] }));
    expect(isExerciseEquipmentCompatible(bw, index)).toBe(true);
  });

  it('equipamento incompatível exclui', () => {
    const index = makeIndex(baseAnswers({ availableEquipment: ['dumbbells'] }));
    const machine = normalizeExercise(
      makeExercise({
        id: 'm',
        name: 'Leg Press',
        equipment: 'leverage machine',
        bodyPart: 'upper legs',
        target: 'quads',
      })
    );
    expect(isExerciseEquipmentCompatible(machine, index)).toBe(false);
    const compat = evaluateExerciseCompatibility(machine, index);
    expect(compat.hardExclusionReasons).toContain('equipment_unavailable');
  });

  it('unknown não trata como compatível garantido', () => {
    const index = makeIndex(baseAnswers({ availableEquipment: ['unknown'] }));
    expect(index.environment.equipmentAvailabilityKnown).toBe(false);
    const barbell = normalizeExercise(
      makeExercise({ id: 'b', name: 'Barbell Squat', equipment: 'barbell', bodyPart: 'upper legs', target: 'quads' })
    );
    expect(isExerciseEquipmentCompatible(barbell, index)).toBe(false);
  });
});

describe('restrições', () => {
  it('jumping/running excluídos não passam', () => {
    const index = makeIndex(
      baseAnswers({ movementLimitations: ['jump', 'run'] })
    );
    expect(index.constraints.excludedMovementPatterns).toEqual(
      expect.arrayContaining(['jumping', 'running'])
    );
    // safety blocks generation when movement limitations present
    expect(index.eligibility.generationAllowed).toBe(false);
  });

  it('no floor / low impact / low noise / advanced beginner / blocked', () => {
    const floorIndex = makeIndex(
      baseAnswers({
        floorExerciseAvailability: 'no_space',
        movementLimitations: ['none'],
      })
    );
    // floor alone doesn't block generation
    const pushup = normalizeExercise(
      makeExercise({ id: '7', name: 'Push-up', equipment: 'body weight' })
    );
    if (floorIndex.eligibility.generationAllowed) {
      const c = evaluateExerciseCompatibility(pushup, floorIndex);
      expect(c.hardExclusionReasons).toContain('floor_exercise_not_allowed');
    }

    const impactIndex = {
      ...makeIndex(),
      constraints: {
        ...makeIndex().constraints,
        requiresLowImpact: true,
        requiresLowNoise: true,
      },
    };
    const box = normalizeExercise(
      makeExercise({
        id: '9',
        name: 'Box Jump',
        equipment: 'body weight',
        bodyPart: 'upper legs',
        target: 'quads',
        category: 'plyometrics',
      })
    );
    const c2 = evaluateExerciseCompatibility(box, impactIndex);
    expect(c2.hardExclusionReasons).toEqual(
      expect.arrayContaining(['high_impact_not_allowed', 'noise_not_allowed'])
    );

    const beginner = makeIndex(baseAnswers({ experienceLevel: 'never_trained' }));
    const adv = normalizeExercise(
      makeExercise({
        id: '13',
        name: 'Advanced Olympic Snatch',
        equipment: 'barbell',
        difficulty: 'advanced',
        bodyPart: 'upper legs',
        target: 'quads',
      })
    );
    expect(evaluateExerciseCompatibility(adv, beginner).hardExclusionReasons).toContain(
      'difficulty_incompatible'
    );

    const blocked = makeIndex(baseAnswers({ currentPainLevel: 'severe', painRegions: ['knee'] }));
    const plan = buildDeterministicWorkoutPlan({ index: blocked, exercises: CATALOG });
    expect(plan.status).toBe('blocked');
    expect(plan.sessions).toEqual([]);
  });
});

describe('pontuação e determinismo', () => {
  it('score e empate estáveis', () => {
    const index = makeIndex();
    const a = normalizeExercise(CATALOG[1]);
    const b = normalizeExercise(CATALOG[5]);
    const ca = evaluateExerciseCompatibility(a, index);
    const cb = evaluateExerciseCompatibility(b, index);
    const sa = scoreExercise({ exercise: a, index, compatibility: ca });
    const sb = scoreExercise({ exercise: b, index, compatibility: cb });
    expect(sa.totalScore).toBeGreaterThan(0);

    const sorted1 = [
      { exercise: a, score: sa },
      { exercise: b, score: sb },
    ].sort(compareScoredExercises);
    const sorted2 = [
      { exercise: b, score: sb },
      { exercise: a, score: sa },
    ].sort(compareScoredExercises);
    expect(sorted1.map((x) => x.exercise.id)).toEqual(sorted2.map((x) => x.exercise.id));

    const p1 = buildDeterministicWorkoutPlan({ index, exercises: CATALOG });
    const p2 = buildDeterministicWorkoutPlan({ index, exercises: CATALOG });
    expect(p1).toEqual(p2);
  });
});

describe('estrutura semanal', () => {
  it('full body 2/3, A/B, upper/lower, variável, advanced unsupported', () => {
    const fb2 = buildWeeklyStructure(
      makeIndex(baseAnswers({ availableDaysPerWeek: 2, experienceLevel: 'never_trained' }))
    );
    expect(fb2.templates).toHaveLength(2);

    const fb3 = buildWeeklyStructure(
      makeIndex(baseAnswers({ availableDaysPerWeek: 3, experienceLevel: 'never_trained' }))
    );
    expect(fb3.templates).toHaveLength(3);

    const ab = buildWeeklyStructure(
      makeIndex(
        baseAnswers({
          availableDaysPerWeek: 3,
          experienceLevel: 'between_6_months_and_2_years',
        })
      )
    );
    expect(ab.splitStrategy).toBe('alternating_ab');

    const ul = buildWeeklyStructure(
      makeIndex(
        baseAnswers({
          availableDaysPerWeek: 4,
          experienceLevel: 'advanced',
        })
      )
    );
    expect(ul.splitStrategy).toBe('upper_lower');
    expect(ul.templates).toHaveLength(4);

    const variable = buildWeeklyStructure(
      makeIndex(baseAnswers({ variableSchedule: true, availableDaysPerWeek: 3 }))
    );
    expect(variable.templates.every((t) => t.weekday === null)).toBe(true);

    const adv = buildWeeklyStructure({
      ...makeIndex(baseAnswers({ availableDaysPerWeek: 6, experienceLevel: 'advanced' })),
      generationParameters: {
        ...makeIndex().generationParameters,
        recommendedSplitStrategy: 'advanced_split_candidate',
      },
    });
    expect(adv.unsupportedSplit).toBe(true);
  });
});

describe('draft e validação', () => {
  it('generated com parâmetros do índice; blocked sem sessões', () => {
    const index = makeIndex();
    const draft = buildDeterministicWorkoutPlan({ index, exercises: CATALOG, patientId: 'p1' });
    expect(['generated', 'insufficient_catalog']).toContain(draft.status);
    expect(draft.source.engineVersion).toBeTruthy();
    expect(draft.version).toBe(1);

    if (draft.status === 'generated') {
      expect(draft.sessions.length).toBeGreaterThan(0);
      const ex = draft.sessions[0].exercises[0];
      expect(ex.sets).toBeGreaterThanOrEqual(index.generationParameters.defaultSetsMin!);
      expect(ex.sets).toBeLessThanOrEqual(index.generationParameters.defaultSetsMax!);
      expect(ex.repetitionRange.min).toBe(index.generationParameters.defaultRepRangeMin);
      expect(ex.targetRpe.max).toBeLessThanOrEqual(10);
      expect(JSON.stringify(ex)).not.toMatch(/kg|1RM/i);
    }

    const validation = validateWorkoutPlanDraft(draft);
    expect(validation.valid).toBe(true);

    const blocked = buildDeterministicWorkoutPlan({
      index: makeIndex(baseAnswers({ currentPainLevel: 'severe', painRegions: ['back'] })),
      exercises: CATALOG,
    });
    expect(blocked.status).toBe('blocked');
    expect(blocked.sessions).toEqual([]);
  });

  it('unsupported split e pilates-only', () => {
    const index = makeIndex(baseAnswers({ availableDaysPerWeek: 6, experienceLevel: 'advanced' }));
    index.generationParameters.recommendedSplitStrategy = 'advanced_split_candidate';
    const draft = buildDeterministicWorkoutPlan({ index, exercises: CATALOG });
    expect(draft.status).toBe('unsupported_split');

    const pilates = makeIndex(
      baseAnswers({ preferredModalities: ['pilates'] })
    );
    const d2 = buildDeterministicWorkoutPlan({ index: pilates, exercises: CATALOG });
    expect(d2.status).toBe('unsupported_profile');
  });

  it('nenhuma IA / persistência / publicação', () => {
    const draft = buildDeterministicWorkoutPlan({ index: makeIndex(), exercises: CATALOG });
    expect(JSON.stringify(draft)).not.toMatch(/openai|vertex|prompt|published|trainingSessions/i);
  });
});

describe('diversidade', () => {
  it('não repete o mesmo exercício na mesma sessão', () => {
    const draft = buildDeterministicWorkoutPlan({ index: makeIndex(), exercises: CATALOG });
    for (const session of draft.sessions) {
      const ids = session.exercises.map((e) => e.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

// type guard unused
void (null as unknown as NormalizedExercise);
