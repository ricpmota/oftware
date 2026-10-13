import { describe, expect, it } from 'vitest';
import {
  buildMaterializedSessionsFromDraft,
  countMaterializedSessionDocs,
  labelSessionFocus,
  nextDateForWeekday,
  seriesKeyFromFocus,
} from '@/lib/trainingEngine/materializeDraftToTrainingSessions';
import type { WorkoutPlanDraft } from '@/types/workoutPlanDraft';
import { TRAINING_ENGINE_VERSION } from '@/types/workoutPlanDraft';

function sampleDraft(): WorkoutPlanDraft {
  return {
    version: 1,
    status: 'generated',
    source: {
      patientId: 'p1',
      assessmentId: 'p1',
      personalizationIndexVersion: 1,
      engineVersion: TRAINING_ENGINE_VERSION,
    },
    eligibility: { generationAllowed: true, blockers: [], warnings: [] },
    structure: {
      weeklyFrequency: 4,
      splitStrategy: 'upper_lower',
      sessionDurationMinutes: 45,
    },
    sessions: [
      {
        dayIndex: 0,
        weekday: 'monday',
        title: 'Sessão upper_A (monday)',
        focus: 'upper_A',
        warmup: null,
        exercises: [
          {
            exerciseId: 'ex1',
            exerciseName: 'Supino',
            sourceId: 'ex1',
            slotId: 's1',
            role: 'primary_compound',
            primaryMuscles: ['pectorals'],
            movementPatterns: ['horizontal_push'],
            equipment: ['barbell'],
            sets: 3,
            repetitionRange: { min: 8, max: 12 },
            restSeconds: 90,
            targetRpe: { min: 5, max: 7 },
            score: 10,
            selectionReasons: [],
            compatibilityWarnings: [],
          },
        ],
        cardio: null,
        missingRequiredSlots: [],
      },
      {
        dayIndex: 1,
        weekday: 'tuesday',
        title: 'Sessão lower_A (tuesday)',
        focus: 'lower_A',
        warmup: null,
        exercises: [
          {
            exerciseId: 'ex2',
            exerciseName: 'Agachamento',
            sourceId: 'ex2',
            slotId: 's2',
            role: 'primary_compound',
            primaryMuscles: ['quads'],
            movementPatterns: ['squat'],
            equipment: ['barbell'],
            sets: 3,
            repetitionRange: { min: 8, max: 10 },
            restSeconds: 120,
            targetRpe: { min: 6, max: 8 },
            score: 9,
            selectionReasons: [],
            compatibilityWarnings: [],
          },
        ],
        cardio: null,
        missingRequiredSlots: [],
      },
      {
        dayIndex: 2,
        weekday: 'thursday',
        title: 'Sessão upper_B (thursday)',
        focus: 'upper_B',
        warmup: null,
        exercises: [
          {
            exerciseId: 'ex3',
            exerciseName: 'Remada',
            sourceId: 'ex3',
            slotId: 's3',
            role: 'primary_compound',
            primaryMuscles: ['lats'],
            movementPatterns: ['horizontal_pull'],
            equipment: ['dumbbell'],
            sets: 3,
            repetitionRange: { min: 10, max: 12 },
            restSeconds: 60,
            targetRpe: { min: 6, max: 8 },
            score: 8,
            selectionReasons: [],
            compatibilityWarnings: [],
          },
        ],
        cardio: null,
        missingRequiredSlots: [],
      },
      {
        dayIndex: 3,
        weekday: 'friday',
        title: 'Sessão lower_B (friday)',
        focus: 'lower_B',
        warmup: null,
        exercises: [
          {
            exerciseId: 'ex4',
            exerciseName: 'Levantamento terra',
            sourceId: 'ex4',
            slotId: 's4',
            role: 'primary_compound',
            primaryMuscles: ['hamstrings'],
            movementPatterns: ['hip_hinge'],
            equipment: ['barbell'],
            sets: 3,
            repetitionRange: { min: 6, max: 8 },
            restSeconds: 120,
            targetRpe: { min: 6, max: 8 },
            score: 8,
            selectionReasons: [],
            compatibilityWarnings: [],
          },
        ],
        cardio: null,
        missingRequiredSlots: [],
      },
    ],
    catalogDiagnostics: {
      totalExercises: 10,
      normalizedExercises: 10,
      eligibleExercises: 8,
      excludedExercises: 2,
      missingSlots: [],
    },
    validation: { valid: true, errors: [], warnings: [] },
  };
}

describe('materializeDraftToTrainingSessions', () => {
  it('agrupa upper/lower em 2 séries com vários dias (modelo Criar)', () => {
    const start = new Date(2026, 6, 27); // segunda
    const plans = buildMaterializedSessionsFromDraft({
      draft: sampleDraft(),
      weeksCount: 4,
      startFrom: start,
      titleOverrides: {
        upper: 'Costas',
        lower: 'Peito',
      },
    });

    expect(plans).toHaveLength(2);
    expect(plans.map((p) => p.title)).toEqual(['Costas', 'Peito']);
    expect(plans[0].seriesKey).toBe('upper');
    expect(plans[1].seriesKey).toBe('lower');
    // Costas: seg + qui · Peito: ter + sex · 4 semanas
    expect(plans[0].weekdaysJs.sort()).toEqual([1, 4]);
    expect(plans[1].weekdaysJs.sort()).toEqual([2, 5]);
    expect(plans[0].dates).toHaveLength(8);
    expect(plans[1].dates).toHaveLength(8);
    expect(plans[0].dates).toContain('2026-07-27');
    expect(plans[0].dates).toContain('2026-07-30');
    expect(plans[1].dates).toContain('2026-07-28');
    expect(plans[1].dates).toContain('2026-07-31');
    expect(countMaterializedSessionDocs(plans)).toBe(16);
  });

  it('labelSessionFocus e seriesKey unificam variantes A/B de upper/lower', () => {
    expect(seriesKeyFromFocus('upper_A')).toBe('upper');
    expect(seriesKeyFromFocus('upper_B')).toBe('upper');
    expect(seriesKeyFromFocus('lower_A')).toBe('lower');
    expect(labelSessionFocus('upper_A')).toBe('Superior');
    expect(labelSessionFocus('lower_B')).toBe('Inferior');
    expect(labelSessionFocus('full_body_A')).toBe('Corpo inteiro A');
    expect(seriesKeyFromFocus('full_body_A')).toBe('full_body_A');
  });

  it('nextDateForWeekday inclui o dia atual quando coincide', () => {
    const monday = new Date(2026, 6, 27);
    expect(nextDateForWeekday(monday, 'monday').getDay()).toBe(1);
    expect(nextDateForWeekday(monday, 'thursday').getDay()).toBe(4);
  });
});
