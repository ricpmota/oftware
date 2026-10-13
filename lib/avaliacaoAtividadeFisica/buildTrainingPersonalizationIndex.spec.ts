import { describe, expect, it } from 'vitest';
import {
  buildTrainingPersonalizationIndex,
  deriveExerciseCountRange,
  deriveSplitStrategy,
  mapExperienceCategory,
  mapIntensityCategory,
} from '@/lib/avaliacaoAtividadeFisica/buildTrainingPersonalizationIndex';
import { buildSafetyAssessment } from '@/lib/avaliacaoAtividadeFisica/buildSafetyAssessment';
import { buildPhysicalActivityAssessmentSummary } from '@/lib/avaliacaoAtividadeFisica/buildAssessmentSummary';
import { validateTrainingPersonalizationIndex } from '@/lib/avaliacaoAtividadeFisica/validateTrainingPersonalizationIndex';
import type {
  AvaliacaoAtividadeFisica,
  AvaliacaoAtividadeFisicaBasicAnswers,
} from '@/types/avaliacaoAtividadeFisica';

function baseAnswers(
  overrides: Partial<AvaliacaoAtividadeFisicaBasicAnswers> = {}
): AvaliacaoAtividadeFisicaBasicAnswers {
  return {
    primaryGoal: 'health',
    experienceLevel: 'between_6_months_and_2_years',
    currentlyActive: true,
    availableDaysPerWeek: 3,
    preferredWeekdays: ['monday', 'wednesday', 'friday'],
    variableSchedule: false,
    sessionDurationMinutes: 45,
    durationConsistency: 'consistent',
    preferredTrainingPeriod: 'morning',
    trainingLocation: 'gym',
    bodyPriorities: ['full_body'],
    preferredModalities: ['strength'],
    preferredIntensity: 'moderate',
    cardioPreference: 'little',
    preferredCardioActivities: ['walk'],
    trainingBarriers: [],
    availableEquipment: ['dumbbells', 'strength_machines'],
    floorExerciseAvailability: 'yes',
    environmentImpactNoiseRestriction: 'no',
    currentPainLevel: 'none',
    hasRelevantInjury: 'no',
    hasRelevantSurgery: 'no',
    movementLimitations: ['none'],
    balanceFallHistory: 'no',
    shortnessOfBreathOnLightEffort: 'no',
    chestSymptomsDuringEffort: 'no',
    dizzinessOrFaintingDuringEffort: 'no',
    palpitationsDuringExercise: 'no',
    uncontrolledBloodPressureAdvice: 'no',
    hasProfessionalExerciseRestriction: 'no',
    safetyAnswersConfirmed: true,
    finalConfirmationAccepted: true,
    ...overrides,
  };
}

function makeAssessment(
  answers: AvaliacaoAtividadeFisicaBasicAnswers,
  opts: Partial<AvaliacaoAtividadeFisica> & { rebuildSummary?: boolean } = {}
): AvaliacaoAtividadeFisica {
  const safety = opts.safety ?? buildSafetyAssessment(answers);
  const summary =
    opts.summary === null
      ? null
      : opts.summary ?? buildPhysicalActivityAssessmentSummary(answers, safety);
  const { rebuildSummary: _r, ...rest } = opts;
  return {
    id: 'patient-1',
    patientId: 'patient-1',
    userId: 'user-1',
    organizationId: 'org-1',
    status: 'completed',
    version: 1,
    currentStep: 'completed',
    progressPercent: 100,
    answers,
    safety,
    summary,
    startedAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    completedAt: new Date('2026-01-02T00:00:00.000Z'),
    createdBy: 'patient',
    lastUpdatedBy: 'patient',
    ...rest,
  };
}

describe('buildTrainingPersonalizationIndex — pureza', () => {
  it('é pura, não muta assessment e é determinística', () => {
    const assessment = makeAssessment(baseAnswers());
    const clone = structuredClone(assessment);
    const a = buildTrainingPersonalizationIndex(assessment);
    const b = buildTrainingPersonalizationIndex(assessment);
    expect(assessment).toEqual(clone);
    expect(a).toEqual(b);
    expect(a.version).toBe(1);
  });

  it('arrays não compartilham referência com answers', () => {
    const answers = baseAnswers({ preferredWeekdays: ['monday', 'wednesday'] });
    const assessment = makeAssessment(answers);
    const index = buildTrainingPersonalizationIndex(assessment);
    index.routine.preferredWeekdays.push('sunday');
    expect(answers.preferredWeekdays).toEqual(['monday', 'wednesday']);
  });

  it('normaliza weekdays legados e generatedAt fica null no builder', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ preferredWeekdays: ['mon', 'wed', 'fri'] }))
    );
    expect(index.routine.preferredWeekdays).toEqual(['monday', 'wednesday', 'friday']);
    expect(index.source.generatedAt).toBeNull();
  });

  it('campos ausentes recebem fallback sem throw', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment({}, { status: 'draft', summary: null })
    );
    expect(index.experience.category).toBe('unknown');
    expect(index.eligibility.generationAllowed).toBe(false);
  });
});

describe('elegibilidade', () => {
  it('draft bloqueia', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers(), { status: 'draft' })
    );
    expect(index.eligibility.blockers).toContain('assessment_not_completed');
    expect(index.eligibility.generationAllowed).toBe(false);
  });

  it('completed sem safety flags permite', () => {
    const index = buildTrainingPersonalizationIndex(makeAssessment(baseAnswers()));
    expect(index.eligibility.generationAllowed).toBe(true);
    expect(index.eligibility.blockers).toEqual([]);
  });

  it('safety attention bloqueia', () => {
    const answers = baseAnswers({ currentPainLevel: 'severe', painRegions: ['knee'] });
    const index = buildTrainingPersonalizationIndex(makeAssessment(answers));
    expect(index.eligibility.requiresProfessionalReview).toBe(true);
    expect(index.eligibility.blockers).toContain('professional_review_required');
    expect(index.eligibility.generationAllowed).toBe(false);
  });

  it('frequência ausente bloqueia', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ availableDaysPerWeek: null }))
    );
    expect(index.eligibility.blockers).toContain('weekly_frequency_missing');
  });

  it('duração ausente bloqueia', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ sessionDurationMinutes: null }))
    );
    expect(index.eligibility.blockers).toContain('session_duration_missing');
  });

  it('local ausente bloqueia', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ trainingLocation: null }))
    );
    expect(index.eligibility.blockers).toContain('training_location_missing');
  });

  it('equipamento unknown apenas avisa', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ availableEquipment: ['unknown'] }))
    );
    expect(index.eligibility.generationAllowed).toBe(true);
    expect(index.eligibility.warnings).toContain('equipment_availability_unknown');
    expect(index.environment.equipmentAvailabilityKnown).toBe(false);
    expect(index.environment.availableEquipment).toEqual([]);
  });

  it('summary ausente é reconstruído em memória', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers(), { summary: null })
    );
    expect(index.eligibility.warnings).toContain('summary_rebuilt_from_answers');
    expect(index.eligibility.generationAllowed).toBe(true);
  });
});

describe('experiência', () => {
  it.each([
    ['never_trained', 'beginner'],
    ['returning', 'returning'],
    ['less_than_6_months', 'beginner'],
    ['between_6_months_and_2_years', 'intermediate'],
    ['more_than_2_years', 'intermediate'],
    ['advanced', 'advanced'],
    [null, 'unknown'],
  ] as const)('%s → %s', (level, category) => {
    expect(mapExperienceCategory(level)).toBe(category);
  });
});

describe('parâmetros', () => {
  it('frequência define split sugerido', () => {
    expect(deriveSplitStrategy(3, 'beginner')).toBe('full_body_three_times');
    expect(deriveSplitStrategy(3, 'intermediate')).toBe('alternating_ab');
    expect(deriveSplitStrategy(4, 'advanced')).toBe('upper_lower');
  });

  it('duração define faixa de exercícios', () => {
    expect(deriveExerciseCountRange(30, 'intermediate', false)).toEqual({
      min: 4,
      max: 6,
    });
    expect(deriveExerciseCountRange(60, 'beginner', false)).toEqual({
      min: 6,
      max: 8,
    });
  });

  it('experiência define séries/reps/rest/RPE', () => {
    const beginner = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ experienceLevel: 'never_trained' }))
    );
    expect(beginner.generationParameters).toMatchObject({
      defaultSetsMin: 2,
      defaultSetsMax: 3,
      defaultRepRangeMin: 10,
      defaultRepRangeMax: 15,
      targetRpeMin: 4,
      targetRpeMax: 6,
    });

    const advanced = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ experienceLevel: 'advanced' }))
    );
    expect(advanced.generationParameters.targetRpeMax).toBe(8);
  });

  it('intensidade não ultrapassa limite por experiência', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(
        baseAnswers({
          experienceLevel: 'never_trained',
          preferredIntensity: 'very_intense',
        })
      )
    );
    expect(index.generationParameters.targetRpeMax).toBeLessThanOrEqual(6);
    expect(index.eligibility.warnings).toContain('very_intense_preference_capped');
    expect(mapIntensityCategory('very_intense')).toBe('intense');
  });

  it('cardio gera faixa coerente e min ≤ max', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ cardioPreference: 'moderate', sessionDurationMinutes: 40 }))
    );
    const { cardioDurationMinutesMin: min, cardioDurationMinutesMax: max } =
      index.generationParameters;
    expect(min).not.toBeNull();
    expect(max).not.toBeNull();
    expect(min!).toBeLessThanOrEqual(max!);
  });
});

describe('ambiente', () => {
  it('mapeia locais', () => {
    expect(
      buildTrainingPersonalizationIndex(makeAssessment(baseAnswers({ trainingLocation: 'gym' })))
        .environment.allowedEnvironments
    ).toEqual(['gym']);
    expect(
      buildTrainingPersonalizationIndex(makeAssessment(baseAnswers({ trainingLocation: 'home' })))
        .environment.allowedEnvironments
    ).toEqual(['home']);
    expect(
      buildTrainingPersonalizationIndex(
        makeAssessment(baseAnswers({ trainingLocation: 'gym_and_home' }))
      ).environment.allowedEnvironments
    ).toEqual(['gym', 'home']);
  });

  it('equipment none → lista vazia conhecida', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ availableEquipment: ['none'] }))
    );
    expect(index.environment.availableEquipment).toEqual([]);
    expect(index.environment.equipmentAvailabilityKnown).toBe(true);
  });

  it('floor no_space gera restrição', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ floorExerciseAvailability: 'no_space' }))
    );
    expect(index.constraints.requiresNoFloorExercises).toBe(true);
  });

  it('ruído gera restrição ambiental (não clínica automática)', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ environmentImpactNoiseRestriction: 'yes' }))
    );
    expect(index.constraints.requiresLowNoise).toBe(true);
    expect(index.constraints.requiresEnvironmentalLowImpact).toBe(true);
    expect(index.constraints.requiresClinicalLowImpact).toBe(false);
  });
});

describe('segurança e limitações', () => {
  it('dor forte / lesão / cirurgia / restrição profissional bloqueiam via safety', () => {
    const severe = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ currentPainLevel: 'severe', painRegions: ['back'] }))
    );
    expect(severe.eligibility.generationAllowed).toBe(false);

    const injury = buildTrainingPersonalizationIndex(
      makeAssessment(baseAnswers({ hasRelevantInjury: 'current' }))
    );
    expect(injury.eligibility.generationAllowed).toBe(false);

    const surgery = buildTrainingPersonalizationIndex(
      makeAssessment(
        baseAnswers({
          hasRelevantSurgery: 'yes',
          surgeryTiming: 'less_than_3_months',
        })
      )
    );
    expect(surgery.eligibility.generationAllowed).toBe(false);

    const restriction = buildTrainingPersonalizationIndex(
      makeAssessment(
        baseAnswers({
          hasProfessionalExerciseRestriction: 'yes',
          professionalExerciseRestrictionDetails: 'evitar impact',
        })
      )
    );
    expect(restriction.eligibility.blockers).toContain('professional_restriction_present');
  });

  it('limitações viram movement patterns; texto livre não diagnostica', () => {
    const index = buildTrainingPersonalizationIndex(
      makeAssessment(
        baseAnswers({
          movementLimitations: ['squat', 'jump', 'run'],
          avoidedExercisesText: 'não gosto de burpee',
        })
      )
    );
    expect(index.constraints.restrictedMovementPatterns).toEqual(
      expect.arrayContaining(['squat', 'jumping', 'running'])
    );
    expect(index.constraints.excludedMovementPatterns).toEqual(
      expect.arrayContaining(['jumping', 'running'])
    );
    expect(index.constraints.avoidedExerciseTerms).toEqual(['não gosto de burpee']);
    expect(index.eligibility.warnings).toContain('exercise_preferences_not_in_catalog');
  });
});

describe('validateTrainingPersonalizationIndex', () => {
  it('aceita índice válido e detecta incoerência de blockers', () => {
    const index = buildTrainingPersonalizationIndex(makeAssessment(baseAnswers()));
    expect(validateTrainingPersonalizationIndex(index).valid).toBe(true);

    const broken = {
      ...index,
      eligibility: {
        ...index.eligibility,
        generationAllowed: true,
        blockers: ['weekly_frequency_missing' as const],
      },
    };
    expect(validateTrainingPersonalizationIndex(broken).valid).toBe(false);
  });
});

describe('fora do escopo', () => {
  it('não seleciona exercícios nem monta sessão', () => {
    const index = buildTrainingPersonalizationIndex(makeAssessment(baseAnswers()));
    const json = JSON.stringify(index);
    expect(json).not.toMatch(/selectedExercises|workoutSessions|weeklyPlan|prompt/i);
    expect(index.generationParameters.recommendedSplitStrategy).toBeTruthy();
  });
});
