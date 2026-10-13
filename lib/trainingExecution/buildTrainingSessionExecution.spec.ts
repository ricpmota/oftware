import { describe, expect, it } from 'vitest';
import {
  applyAbandonSession,
  applyCompleteSession,
  applySetExecutionUpdate,
  applySkipExercise,
  TrainingExecutionMutationError,
} from '@/lib/trainingExecution/applyTrainingExecutionMutations';
import {
  buildTrainingSessionExecution,
  TrainingExecutionBuildError,
} from '@/lib/trainingExecution/buildTrainingSessionExecution';
import type { PublishedTrainingPlan } from '@/types/publishedTrainingPlan';

function samplePlan(): PublishedTrainingPlan {
  return {
    version: 1,
    id: 'plan-1',
    patientId: 'p1',
    patientUserId: 'uid-patient',
    organizationId: null,
    source: {
      reviewedDraftId: 'draft-1',
      assessmentId: 'p1',
      assessmentVersion: 1,
      personalizationIndexVersion: 1,
      engineVersion: '1.0.0',
      catalogVersion: 'cat_1',
      draftFingerprint: 'fp',
      publishKey: 'draft-1::fp',
    },
    status: 'active',
    planVersion: 2,
    title: 'Plano 3x',
    description: null,
    structure: {
      weeklyFrequency: 3,
      splitStrategy: 'full_body_three_times',
      sessionDurationMinutes: 45,
    },
    sessions: [
      {
        sessionId: 'sess-a',
        dayIndex: 0,
        weekday: 'monday',
        title: 'Sessão A',
        focus: 'full_body_A',
        warmup: { durationMinutes: 5, notesCode: 'general_dynamic_warmup' },
        exercises: [
          {
            planExerciseId: 'pe1',
            sourceExerciseId: 'ex1',
            sourceExerciseName: 'Agachamento',
            slotId: 'd0_squat',
            role: 'primary_compound',
            primaryMuscles: ['quads'],
            movementPatterns: ['squat'],
            equipment: ['barbell'],
            prescription: {
              sets: 3,
              repetitionRange: { min: 8, max: 12 },
              restSeconds: 90,
              targetRpe: { min: 5, max: 7 },
            },
            media: { imageUrl: '/img/ex1.png', videoUrl: null },
            instructions: ['Pés na largura dos ombros', 'Desça controlado'],
            professionalNotes: null,
          },
          {
            planExerciseId: 'pe2',
            sourceExerciseId: 'ex2',
            sourceExerciseName: 'Remada',
            slotId: 'd0_row',
            role: 'secondary',
            primaryMuscles: ['lats'],
            movementPatterns: ['horizontal_pull'],
            equipment: ['dumbbell'],
            prescription: {
              sets: 2,
              repetitionRange: { min: 10, max: 12 },
              restSeconds: 60,
              targetRpe: { min: 6, max: 8 },
            },
            media: { imageUrl: null, videoUrl: null },
            instructions: ['Puxe o cotovelo'],
            professionalNotes: null,
          },
        ],
        cardio: {
          activityCode: 'brisk_walk',
          durationMinutes: 10,
          intensity: { rpeMin: 4, rpeMax: 6 },
        },
      },
    ],
    professional: {
      publishedBy: 'doc1',
      publishedByRole: 'doctor',
      approvedBy: 'doc1',
      approvedByRole: 'doctor',
    },
    lifecycle: {
      startsAt: null,
      endsAt: null,
      publishedAt: '2026-07-27T00:00:00.000Z',
      supersededAt: null,
      cancelledAt: null,
      completedAt: null,
      cancelReason: null,
    },
    createdAt: '2026-07-27T00:00:00.000Z',
    updatedAt: '2026-07-27T00:00:00.000Z',
  };
}

describe('buildTrainingSessionExecution', () => {
  it('cria execução a partir de sessão válida', () => {
    const plan = samplePlan();
    const exec = buildTrainingSessionExecution({
      plan,
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
    expect(exec.status).toBe('in_progress');
    expect(exec.patientId).toBe('p1');
    expect(exec.source.publishedPlanId).toBe('plan-1');
    expect(exec.source.prescribedSessionId).toBe('sess-a');
    expect(exec.exercises).toHaveLength(2);
    expect(exec.exercises[0].sets).toHaveLength(3);
    expect(exec.exercises[0].sets.every((s) => s.status === 'pending')).toBe(true);
    expect(exec.exercises[0].snapshot.exerciseName).toBe('Agachamento');
    expect(exec.warmup?.status).toBe('pending');
    expect(exec.cardio?.activityCode).toBe('brisk_walk');
  });

  it('rejeita sessão inexistente', () => {
    expect(() =>
      buildTrainingSessionExecution({
        plan: samplePlan(),
        prescribedSessionId: 'missing',
        startedAt: '2026-07-27T10:00:00.000Z',
      })
    ).toThrow(TrainingExecutionBuildError);
  });

  it('não muta o plano', () => {
    const plan = samplePlan();
    const before = structuredClone(plan);
    buildTrainingSessionExecution({
      plan,
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
    expect(plan).toEqual(before);
  });

  it('preserva snapshot e IDs estáveis', () => {
    const plan = samplePlan();
    const a = buildTrainingSessionExecution({
      plan,
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
    const b = buildTrainingSessionExecution({
      plan,
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T11:00:00.000Z',
    });
    expect(a.exercises[0].executionExerciseId).toBe(b.exercises[0].executionExerciseId);
    expect(a.exercises[0].snapshot.prescribedSets).toBe(3);
    expect(a.exercises[0].snapshot.instructions).toEqual([
      'Pés na largura dos ombros',
      'Desça controlado',
    ]);
  });

  it('rejeita plano não ativo', () => {
    const plan = samplePlan();
    plan.status = 'cancelled';
    expect(() =>
      buildTrainingSessionExecution({
        plan,
        prescribedSessionId: 'sess-a',
        startedAt: '2026-07-27T10:00:00.000Z',
      })
    ).toThrow(TrainingExecutionBuildError);
  });
});

describe('applySetExecutionUpdate', () => {
  function started() {
    return buildTrainingSessionExecution({
      plan: samplePlan(),
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
  }

  it('atualiza repetições, carga e RPE', () => {
    const base = started();
    const exId = base.exercises[0].executionExerciseId;
    const next = applySetExecutionUpdate(base, {
      executionExerciseId: exId,
      setIndex: 1,
      repetitions: 10,
      loadValue: 40,
      loadUnit: 'kg',
      rpe: 7,
      status: 'completed',
    });
    const set = next.exercises[0].sets[0];
    expect(set.repetitions).toBe(10);
    expect(set.load).toEqual({ value: 40, unit: 'kg' });
    expect(set.rpe).toBe(7);
    expect(set.status).toBe('completed');
    expect(next.exercises[0].status).toBe('in_progress');
    expect(base.exercises[0].sets[0].status).toBe('pending');
  });

  it('rejeita RPE inválido e carga negativa', () => {
    const base = started();
    const exId = base.exercises[0].executionExerciseId;
    expect(() =>
      applySetExecutionUpdate(base, {
        executionExerciseId: exId,
        setIndex: 1,
        rpe: 11,
      })
    ).toThrow(TrainingExecutionMutationError);
    expect(() =>
      applySetExecutionUpdate(base, {
        executionExerciseId: exId,
        setIndex: 1,
        loadValue: -1,
      })
    ).toThrow(TrainingExecutionMutationError);
  });

  it('rejeita exercício inexistente e execução concluída', () => {
    const base = started();
    expect(() =>
      applySetExecutionUpdate(base, {
        executionExerciseId: 'nope',
        setIndex: 1,
        status: 'completed',
      })
    ).toThrow(TrainingExecutionMutationError);

    const done = { ...base, status: 'completed' as const };
    expect(() =>
      applySetExecutionUpdate(done, {
        executionExerciseId: base.exercises[0].executionExerciseId,
        setIndex: 1,
        status: 'completed',
      })
    ).toThrow(TrainingExecutionMutationError);
  });
});

describe('applySkipExercise / complete / abandon', () => {
  function withOneSetDone() {
    const base = buildTrainingSessionExecution({
      plan: samplePlan(),
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
    return applySetExecutionUpdate(base, {
      executionExerciseId: base.exercises[0].executionExerciseId,
      setIndex: 1,
      repetitions: 8,
      status: 'completed',
    });
  }

  it('pula exercício preservando motivo e snapshot', () => {
    const base = withOneSetDone();
    const snap = structuredClone(base.exercises[1].snapshot);
    const next = applySkipExercise(base, {
      executionExerciseId: base.exercises[1].executionExerciseId,
      reason: 'equipment_busy',
    });
    expect(next.exercises[1].status).toBe('skipped');
    expect(next.exercises[1].skipReason).toBe('equipment_busy');
    expect(next.exercises[1].snapshot).toEqual(snap);
    expect(next.exercises[1].sets.every((s) => s.status === 'skipped')).toBe(true);
  });

  it('conclui com duração, feedback e pendências skipped', () => {
    const base = withOneSetDone();
    const now = new Date('2026-07-27T10:30:00.000Z');
    const next = applyCompleteSession(base, {
      overallRpe: 6,
      difficulty: 'adequate',
      painDuringSession: false,
      notes: 'ok',
      now,
    });
    expect(next.status).toBe('completed');
    expect(next.timing.durationSeconds).toBe(1800);
    expect(next.patientFeedback.overallRpe).toBe(6);
    expect(next.exercises[1].status).toBe('skipped');
    expect(applyCompleteSession(next, {})).toBe(next);
  });

  it('abandona preservando séries e bloqueia após conclusão', () => {
    const base = withOneSetDone();
    const abandoned = applyAbandonSession(base, { reason: 'tired' });
    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.exercises[0].sets[0].status).toBe('completed');
    expect(abandoned.abandonReason).toBe('tired');

    const completed = applyCompleteSession(base, {
      now: new Date('2026-07-27T10:20:00.000Z'),
    });
    expect(() => applyAbandonSession(completed)).toThrow(TrainingExecutionMutationError);
  });

  it('não conclui sem nenhum exercício iniciado', () => {
    const base = buildTrainingSessionExecution({
      plan: samplePlan(),
      prescribedSessionId: 'sess-a',
      startedAt: '2026-07-27T10:00:00.000Z',
    });
    expect(() => applyCompleteSession(base, {})).toThrow(TrainingExecutionMutationError);
  });
});
