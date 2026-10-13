import { describe, expect, it } from 'vitest';
import { buildDraftFingerprint } from '@/lib/trainingEngine/buildDraftFingerprint';
import { labelBlocker, labelSelectionReason, labelWarning } from '@/lib/trainingEngine/draftLabels';
import {
  replaceWorkoutDraftExercise,
  undoWorkoutDraftExerciseReplacement,
} from '@/lib/trainingEngine/replaceWorkoutDraftExercise';
import { validateWorkoutPlanDraft } from '@/lib/trainingEngine/validateWorkoutPlanDraft';
import type { SelectedWorkoutExercise, WorkoutPlanDraft } from '@/types/workoutPlanDraft';
import { TRAINING_ENGINE_VERSION } from '@/types/workoutPlanDraft';

function sampleExercise(
  overrides: Partial<SelectedWorkoutExercise> & Pick<SelectedWorkoutExercise, 'exerciseId' | 'slotId'>
): SelectedWorkoutExercise {
  return {
    exerciseName: 'Sample',
    sourceId: overrides.exerciseId,
    role: 'primary_compound',
    primaryMuscles: ['quads'],
    movementPatterns: ['squat'],
    equipment: ['dumbbell'],
    sets: 3,
    repetitionRange: { min: 10, max: 15 },
    restSeconds: 90,
    targetRpe: { min: 5, max: 7 },
    score: 50,
    selectionReasons: ['goal_compatible:30'],
    compatibilityWarnings: [],
    ...overrides,
  };
}

function sampleDraft(exercises: SelectedWorkoutExercise[]): WorkoutPlanDraft {
  return {
    version: 1,
    status: 'generated',
    source: {
      patientId: 'p1',
      assessmentId: 'p1',
      personalizationIndexVersion: 1,
      engineVersion: TRAINING_ENGINE_VERSION,
      generatedAt: '2026-07-27T00:00:00.000Z',
    },
    eligibility: {
      generationAllowed: true,
      blockers: [],
      warnings: [],
    },
    structure: {
      weeklyFrequency: 2,
      splitStrategy: 'full_body_twice',
      sessionDurationMinutes: 45,
    },
    sessions: [
      {
        dayIndex: 0,
        weekday: 'monday',
        title: 'Sessão A',
        focus: 'full_body_A',
        warmup: { durationMinutes: 5, notesCode: 'general_dynamic_warmup' },
        exercises,
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

describe('replaceWorkoutDraftExercise', () => {
  it('não muta o draft base e registra exercício novo', () => {
    const original = sampleExercise({ exerciseId: '1', slotId: 's1', exerciseName: 'Squat' });
    const base = sampleDraft([original]);
    const cloneBefore = structuredClone(base);
    const replacement = sampleExercise({
      exerciseId: '2',
      slotId: 's1',
      exerciseName: 'Leg Press',
    });

    const next = replaceWorkoutDraftExercise({
      draft: base,
      sessionIndex: 0,
      exerciseIndex: 0,
      replacement,
    });

    expect(base).toEqual(cloneBefore);
    expect(next.sessions[0].exercises[0].exerciseId).toBe('2');
    expect(next.sessions[0].exercises[0].exerciseName).toBe('Leg Press');
    expect(validateWorkoutPlanDraft(next).valid).toBe(true);
  });

  it('desfaz substituição restaurando baseDraft', () => {
    const original = sampleExercise({ exerciseId: '1', slotId: 's1', exerciseName: 'Squat' });
    const base = sampleDraft([original]);
    const replaced = replaceWorkoutDraftExercise({
      draft: base,
      sessionIndex: 0,
      exerciseIndex: 0,
      replacement: sampleExercise({ exerciseId: '2', slotId: 's1', exerciseName: 'Leg Press' }),
    });
    const undone = undoWorkoutDraftExerciseReplacement({
      workingDraft: replaced,
      baseDraft: base,
      sessionDayIndex: 0,
      slotId: 's1',
    });
    expect(undone.sessions[0].exercises[0].exerciseId).toBe('1');
  });
});

describe('draft labels', () => {
  it('converte códigos em labels humanas', () => {
    expect(labelBlocker('professional_review_required')).toMatch(/revisão profissional/i);
    expect(labelWarning('metadata_unknown')).toMatch(/metadados/i);
    expect(labelSelectionReason('goal_compatible:30')).toMatch(/objetivo/i);
  });
});

describe('fingerprint', () => {
  it('é determinístico para o mesmo contexto', () => {
    const a = buildDraftFingerprint({
      patientId: 'p1',
      assessmentVersion: 1,
      indexVersion: 1,
      engineVersion: 'training_engine_v1',
      catalogVersion: 'cat_10',
    });
    const b = buildDraftFingerprint({
      patientId: 'p1',
      assessmentVersion: 1,
      indexVersion: 1,
      engineVersion: 'training_engine_v1',
      catalogVersion: 'cat_10',
    });
    const c = buildDraftFingerprint({
      patientId: 'p1',
      assessmentVersion: 2,
      indexVersion: 1,
      engineVersion: 'training_engine_v1',
      catalogVersion: 'cat_10',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('fora do escopo', () => {
  it('replace não cria trainingSessions nem carga em kg', () => {
    const draft = sampleDraft([
      sampleExercise({ exerciseId: '1', slotId: 's1' }),
    ]);
    const next = replaceWorkoutDraftExercise({
      draft,
      sessionIndex: 0,
      exerciseIndex: 0,
      replacement: sampleExercise({ exerciseId: '9', slotId: 's1' }),
    });
    const json = JSON.stringify(next);
    expect(json).not.toMatch(/trainingSessions|published|1RM|\bkg\b/i);
  });
});
