import { describe, expect, it } from 'vitest';
import {
  buildPublishedTrainingPlan,
  buildPublishKey,
  PublishPlanError,
} from '@/lib/trainingEngine/buildPublishedTrainingPlan';
import { describeRpeRange } from '@/lib/trainingEngine/rpePatientCopy';
import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
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
      generatedAt: '2026-07-27T00:00:00.000Z',
    },
    eligibility: { generationAllowed: true, blockers: [], warnings: [] },
    structure: {
      weeklyFrequency: 3,
      splitStrategy: 'full_body_three_times',
      sessionDurationMinutes: 45,
    },
    sessions: [
      {
        dayIndex: 0,
        weekday: 'monday',
        title: 'Sessão A',
        focus: 'full_body_A',
        warmup: { durationMinutes: 5, notesCode: 'general_dynamic_warmup' },
        exercises: [
          {
            exerciseId: 'ex1',
            exerciseName: 'Squat',
            sourceId: 'ex1',
            slotId: 'd0_squat',
            role: 'primary_compound',
            primaryMuscles: ['quads'],
            movementPatterns: ['squat'],
            equipment: ['barbell'],
            sets: 3,
            repetitionRange: { min: 8, max: 12 },
            restSeconds: 90,
            targetRpe: { min: 5, max: 7 },
            score: 40,
            selectionReasons: ['goal_compatible:30'],
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

function sampleReview(
  overrides: Partial<ReviewedWorkoutPlanDraft> = {}
): ReviewedWorkoutPlanDraft {
  const draft = sampleDraft();
  return {
    version: 1,
    id: 'draft-1',
    patientId: 'p1',
    organizationId: null,
    assessmentId: 'p1',
    assessmentVersion: 1,
    indexVersion: 1,
    engineVersion: TRAINING_ENGINE_VERSION,
    catalogVersion: 'cat_10',
    fingerprint: 'fp_abc',
    baseDraft: structuredClone(draft),
    workingDraft: draft,
    review: {
      status: 'approved',
      reviewedBy: 'doc1',
      reviewerRole: 'doctor',
      startedAt: '2026-07-27T00:00:00.000Z',
      approvedAt: '2026-07-27T01:00:00.000Z',
      discardedAt: null,
      notes: null,
    },
    manualAdjustments: [],
    validation: { valid: true, errors: [], warnings: [] },
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T01:00:00.000Z',
    createdBy: 'doc1',
    createdByRole: 'doctor',
    ...overrides,
  };
}

describe('buildPublishedTrainingPlan', () => {
  it('gera plano a partir de review aprovado sem mutar input', () => {
    const review = sampleReview();
    const before = structuredClone(review);
    const plan = buildPublishedTrainingPlan({
      review,
      planVersion: 1,
      publishedBy: 'doc1',
      publishedByRole: 'doctor',
      patientUserId: 'uid-patient',
      exerciseSnapshots: {
        ex1: {
          instructions: ['Stand', 'Squat'],
          imageUrl: '/api/exercisedb/image?exerciseId=ex1&resolution=360',
          videoUrl: null,
        },
      },
    });

    expect(review).toEqual(before);
    expect(plan.status).toBe('active');
    expect(plan.planVersion).toBe(1);
    expect(plan.sessions).toHaveLength(1);
    expect(plan.sessions[0].exercises[0].instructions).toEqual(['Stand', 'Squat']);
    expect(plan.sessions[0].exercises[0].media.imageUrl).toContain('ex1');
    expect(plan.source.publishKey).toBe(buildPublishKey('draft-1', 'fp_abc'));
    expect(plan.patientUserId).toBe('uid-patient');
  });

  it('rejeita não aprovado / inválido / missing slots', () => {
    expect(() =>
      buildPublishedTrainingPlan({
        review: sampleReview({
          review: {
            ...sampleReview().review,
            status: 'in_review',
          },
        }),
        planVersion: 1,
        publishedBy: 'doc1',
        publishedByRole: 'doctor',
        patientUserId: 'uid',
      })
    ).toThrow(PublishPlanError);

    const missing = sampleReview();
    missing.workingDraft.catalogDiagnostics.missingSlots = ['slot_x'];
    expect(() =>
      buildPublishedTrainingPlan({
        review: missing,
        planVersion: 1,
        publishedBy: 'doc1',
        publishedByRole: 'doctor',
        patientUserId: 'uid',
      })
    ).toThrow(/componentes/i);

    const blocked = sampleReview();
    blocked.workingDraft.status = 'blocked';
    expect(() =>
      buildPublishedTrainingPlan({
        review: blocked,
        planVersion: 1,
        publishedBy: 'doc1',
        publishedByRole: 'doctor',
        patientUserId: 'uid',
      })
    ).toThrow(PublishPlanError);
  });

  it('valida datas e usa workingDraft', () => {
    const review = sampleReview();
    review.workingDraft.sessions[0].exercises[0].exerciseName = 'From Working';
    review.baseDraft.sessions[0].exercises[0].exerciseName = 'From Base';
    const plan = buildPublishedTrainingPlan({
      review,
      planVersion: 2,
      publishedBy: 'pt1',
      publishedByRole: 'personal_trainer',
      patientUserId: 'uid',
    });
    expect(plan.sessions[0].exercises[0].sourceExerciseName).toBe('From Working');
    expect(plan.title).toContain('Versão 2');

    expect(() =>
      buildPublishedTrainingPlan({
        review,
        planVersion: 1,
        publishedBy: 'doc1',
        publishedByRole: 'doctor',
        patientUserId: 'uid',
        startsAt: '2026-08-10',
        endsAt: '2026-08-01',
      })
    ).toThrow(/data final/i);
  });

  it('não referencia trainingSessions nem calendário', () => {
    const plan = buildPublishedTrainingPlan({
      review: sampleReview(),
      planVersion: 1,
      publishedBy: 'doc1',
      publishedByRole: 'doctor',
      patientUserId: 'uid',
    });
    const json = JSON.stringify(plan);
    expect(json).not.toMatch(/trainingSessions|calendar|scheduledDate|openai|vertex/i);
  });
});

describe('rpePatientCopy', () => {
  it('explica faixa sem alterar valores', () => {
    expect(describeRpeRange(5, 7)).toMatch(/moderado/i);
    expect(describeRpeRange(3, 4)).toMatch(/leve/i);
  });
});
