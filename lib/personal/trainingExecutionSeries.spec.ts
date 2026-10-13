import { describe, expect, it } from 'vitest';
import { createDefaultTrainingSeries } from '@/lib/personal/trainingExerciseSeries';
import {
  completeExecutedSeries,
  createExerciseExecutionFromPrescription,
  getExerciseExecutionStatus,
  getMarkExerciseStatusFromExecution,
  getNextPendingSeries,
  getSeriesProgress,
  isExerciseExecutionDone,
  skipExecutedSeries,
  skipRemainingExerciseSeries,
  resetExerciseExecution,
  updatePendingExecutedSeriesPrescription,
} from '@/lib/personal/trainingExecutionSeries';

function makePrescription() {
  const series = createDefaultTrainingSeries();
  series[0] = { ...series[0], reps: 15, loadKg: 20, restSec: 60 };
  series[1] = { ...series[1], reps: 12, loadKg: 25, restSec: 60 };
  series[2] = { ...series[2], reps: 10, loadKg: 30, restSec: 75 };
  return { series };
}

describe('trainingExecutionSeries', () => {
  it('cria execução com 3 pending a partir da prescrição', () => {
    const prescription = makePrescription();
    const execution = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription,
    });
    expect(execution.series).toHaveLength(3);
    expect(execution.series.every((s) => s.status === 'pending')).toBe(true);
    expect(execution.series[0]).toMatchObject({
      seriesId: prescription.series[0].id,
      prescribedReps: 15,
      prescribedLoadKg: 20,
      prescribedRestSec: 60,
      actualReps: null,
      actualLoadKg: null,
    });
    expect(execution.status).toBe('pending');
  });

  it('completar série persiste realizado e não muta a prescrição', () => {
    const prescription = makePrescription();
    const originalId = prescription.series[0].id;
    const originalReps = prescription.series[0].reps;
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription,
    });
    const result = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 15,
      actualLoadKg: 20,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.execution.series[0]).toMatchObject({
      actualReps: 15,
      actualLoadKg: 20,
      status: 'done',
    });
    expect(result.execution.status).toBe('in_progress');
    expect(prescription.series[0].reps).toBe(originalReps);
    expect(prescription.series[0].id).toBe(originalId);
    result.execution.series[0].actualReps = 1;
    expect(created.series[0].actualReps).toBeNull();
  });

  it('getNextPendingSeries aponta para S2 depois de S1', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const after = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 15,
      actualLoadKg: 20,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(getNextPendingSeries(after.execution)?.order).toBe(2);
  });

  it('pular série zera realizado e avança', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const skipped = skipExecutedSeries(created, created.series[1].seriesId);
    expect(skipped.series[1]).toMatchObject({
      status: 'skipped',
      actualReps: null,
      actualLoadKg: null,
    });
    expect(getNextPendingSeries(skipped)?.order).toBe(1);
  });

  it('status do exercício: done / done+skipped / all skipped', () => {
    expect(
      getExerciseExecutionStatus([
        { seriesId: 'a', order: 1, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: 10, actualLoadKg: null, status: 'done' },
        { seriesId: 'b', order: 2, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: 10, actualLoadKg: null, status: 'done' },
        { seriesId: 'c', order: 3, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: 10, actualLoadKg: null, status: 'done' },
      ])
    ).toBe('done');
    expect(
      getExerciseExecutionStatus([
        { seriesId: 'a', order: 1, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: 10, actualLoadKg: null, status: 'done' },
        { seriesId: 'b', order: 2, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: null, actualLoadKg: null, status: 'skipped' },
        { seriesId: 'c', order: 3, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: 10, actualLoadKg: null, status: 'done' },
      ])
    ).toBe('done');
    expect(
      getExerciseExecutionStatus([
        { seriesId: 'a', order: 1, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: null, actualLoadKg: null, status: 'skipped' },
        { seriesId: 'b', order: 2, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: null, actualLoadKg: null, status: 'skipped' },
        { seriesId: 'c', order: 3, prescribedReps: 10, prescribedLoadKg: null, prescribedRestSec: 60, actualReps: null, actualLoadKg: null, status: 'skipped' },
      ])
    ).toBe('skipped');
  });

  it('pular exercício marca pendentes skipped', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const afterFirst = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 15,
      actualLoadKg: 20,
    });
    expect(afterFirst.ok).toBe(true);
    if (!afterFirst.ok) return;
    const skipped = skipRemainingExerciseSeries(afterFirst.execution);
    expect(skipped.series[0].status).toBe('done');
    expect(skipped.series[1].status).toBe('skipped');
    expect(skipped.series[2].status).toBe('skipped');
    expect(skipped.status).toBe('done');
    expect(isExerciseExecutionDone(skipped)).toBe(true);
    expect(getSeriesProgress(skipped)).toMatchObject({ done: 1, skipped: 2, total: 3 });
  });

  it('pular todas as séries deixa o exercício skipped', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const skipped = skipRemainingExerciseSeries(created);
    expect(skipped.status).toBe('skipped');
    expect(isExerciseExecutionDone(skipped)).toBe(false);
    expect(getMarkExerciseStatusFromExecution(skipped)).toBe('skipped');
  });

  it('treino legado sets/reps vira séries pending na execução', () => {
    const execution = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_legacy',
      exerciseId: '0025',
      prescription: { sets: 4, reps: 8, restSec: 90 },
    });
    expect(execution.series).toHaveLength(4);
    expect(execution.series.every((s) => s.prescribedReps === 8 && s.prescribedRestSec === 90)).toBe(
      true
    );
    expect(execution.series.every((s) => s.prescribedLoadKg == null && s.status === 'pending')).toBe(
      true
    );
  });

  it('não reescreve série já concluída', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const first = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 15,
      actualLoadKg: 20,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = completeExecutedSeries(first.execution, created.series[0].seriesId, {
      actualReps: 1,
      actualLoadKg: 1,
    });
    expect(second.ok).toBe(false);
    expect(first.execution.series[0].actualReps).toBe(15);
  });

  it('congela trainerNote no snapshot da execução', () => {
    const liveNote = { text: 'Manter escápulas retraídas.' };
    const execution = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
      trainerNote: liveNote.text,
    });
    expect(execution.prescribedTrainerNote).toBe('Manter escápulas retraídas.');
    liveNote.text = 'Outra orientação';
    expect(execution.prescribedTrainerNote).toBe('Manter escápulas retraídas.');
  });

  it('execução sem trainerNote não quebra', () => {
    const execution = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
      trainerNote: '   ',
    });
    expect(execution.prescribedTrainerNote).toBeUndefined();
  });

  it('resetExerciseExecution volta séries para pending sem alterar prescrito', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const after = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 14,
      actualLoadKg: 22,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    const reset = resetExerciseExecution(after.execution);
    expect(reset.status).toBe('pending');
    expect(reset.series.every((item) => item.status === 'pending')).toBe(true);
    expect(reset.series[0]).toMatchObject({
      prescribedReps: 15,
      prescribedLoadKg: 20,
      actualReps: null,
      actualLoadKg: null,
    });
    expect(getNextPendingSeries(reset)?.seriesId).toBe(created.series[0].seriesId);
  });

  it('atualiza prescrito da série pending sem marcar como feita', () => {
    const created = createExerciseExecutionFromPrescription({
      exerciseDocId: 'ex_doc',
      exerciseId: '0025',
      prescription: makePrescription(),
    });
    const next = updatePendingExecutedSeriesPrescription(created, created.series[0].seriesId, {
      prescribedReps: 8,
      prescribedLoadKg: 40,
      prescribedRestSec: 90,
    });
    expect(next?.series[0]).toMatchObject({
      prescribedReps: 8,
      prescribedLoadKg: 40,
      prescribedRestSec: 90,
      actualReps: null,
      status: 'pending',
    });
    expect(next?.series[1].prescribedLoadKg).toBe(25);
    const afterDone = completeExecutedSeries(created, created.series[0].seriesId, {
      actualReps: 15,
      actualLoadKg: 20,
    });
    expect(afterDone.ok).toBe(true);
    if (!afterDone.ok) return;
    expect(
      updatePendingExecutedSeriesPrescription(afterDone.execution, created.series[0].seriesId, {
        prescribedReps: 1,
        prescribedLoadKg: 1,
        prescribedRestSec: 1,
      })
    ).toBeNull();
    expect(
      updatePendingExecutedSeriesPrescription(created, created.series[0].seriesId, {
        prescribedReps: 15,
        prescribedLoadKg: 20,
        prescribedRestSec: 60,
      })
    ).toBeNull();
  });
});
