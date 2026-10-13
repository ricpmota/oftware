import { describe, expect, it } from 'vitest';
import {
  addTrainingSeries,
  createDefaultTrainingSeries,
  createUniformTrainingSeries,
  formatTrainingSeriesSummary,
  getEffectiveRestSec,
  normalizeTrainingExercisePrescription,
  parseLoadKgInput,
  removeTrainingSeries,
  serializeTrainingPrescription,
  updateTrainingSeries,
  validateTrainingPrescription,
} from '@/lib/personal/trainingExerciseSeries';

describe('trainingExerciseSeries', () => {
  it('cria 3×10×60s por padrão', () => {
    const series = createDefaultTrainingSeries();
    expect(series).toHaveLength(3);
    expect(series.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(series.every((s) => s.reps === 10 && s.restSec === 60 && s.loadKg == null)).toBe(true);
    expect(new Set(series.map((s) => s.id)).size).toBe(3);
  });

  it('normaliza prescrição legado sets/reps/restSec', () => {
    const normalized = normalizeTrainingExercisePrescription({
      sets: 4,
      reps: 8,
      restSec: 90,
    });
    expect(normalized.series).toHaveLength(4);
    expect(normalized.series.every((s) => s.reps === 8 && s.restSec === 90 && s.loadKg == null)).toBe(
      true
    );
  });

  it('preserva series[] novas e reordena após buraco', () => {
    const normalized = normalizeTrainingExercisePrescription({
      series: [
        { id: 'a', order: 1, reps: 15, loadKg: 20, restSec: 60 },
        { id: 'b', order: 4, reps: 8, loadKg: 35, restSec: 90 },
      ],
    });
    expect(normalized.series.map((s) => s.order)).toEqual([1, 2]);
    expect(normalized.series[1].reps).toBe(8);
  });

  it('adiciona série copiando a última e remove reordenando', () => {
    let series = createUniformTrainingSeries({ count: 3, reps: 10, restSec: 60, loadKg: 30 });
    series = updateTrainingSeries(series, series[2].id, { reps: 8, loadKg: 35, restSec: 90 });
    series = addTrainingSeries(series);
    expect(series).toHaveLength(4);
    expect(series[3]).toMatchObject({ order: 4, reps: 8, loadKg: 35, restSec: 90 });

    series = removeTrainingSeries(series, series[1].id);
    expect(series.map((s) => s.order)).toEqual([1, 2, 3]);
    expect(series.map((s) => s.reps)).toEqual([10, 8, 8]);
  });

  it('não remove a última série', () => {
    const one = createUniformTrainingSeries({ count: 1, reps: 12, restSec: 45 });
    expect(removeTrainingSeries(one, one[0].id)).toHaveLength(1);
  });

  it('formata resumo uniforme e pirâmide', () => {
    expect(
      formatTrainingSeriesSummary({
        series: createUniformTrainingSeries({ count: 3, reps: 10, restSec: 60, loadKg: 30 }),
      })
    ).toBe('3 × 10 · 30 kg');

    expect(
      formatTrainingSeriesSummary({
        series: [
          { id: '1', order: 1, reps: 15, loadKg: 20, restSec: 60 },
          { id: '2', order: 2, reps: 12, loadKg: 25, restSec: 60 },
          { id: '3', order: 3, reps: 10, loadKg: 30, restSec: 75 },
          { id: '4', order: 4, reps: 8, loadKg: 35, restSec: 90 },
        ],
      })
    ).toBe('4 séries · 15/12/10/8 reps · 20/25/30/35 kg');
  });

  it('parseia carga com vírgula e serializa loadKg null', () => {
    expect(parseLoadKgInput('12,5')).toBe(12.5);
    expect(parseLoadKgInput('')).toBeNull();
    const payload = serializeTrainingPrescription({
      series: createUniformTrainingSeries({ count: 2, reps: 12, restSec: 60, loadKg: null }),
    });
    expect(payload.series[0].loadKg).toBeNull();
    expect('sets' in payload).toBe(false);
  });

  it('usa o descanso da última série na execução', () => {
    expect(
      getEffectiveRestSec({
        series: [
          { id: '1', order: 1, reps: 15, loadKg: null, restSec: 60 },
          { id: '2', order: 2, reps: 8, loadKg: null, restSec: 90 },
        ],
      })
    ).toBe(90);
    expect(getEffectiveRestSec({ sets: 3, reps: 10, restSec: 45 })).toBe(45);
  });

  it('serializa intercalations fora de series[] e omite lista vazia', () => {
    const series = createUniformTrainingSeries({ count: 2, reps: 10, restSec: 60, loadKg: null });
    const payload = serializeTrainingPrescription({
      series,
      intercalations: [
        {
          id: 'int_1',
          afterSeriesId: series[0].id,
          slotOrder: 0,
          exerciseId: 'lat',
          name: 'lateral raise',
          bodyPart: 'shoulders',
          target: 'delts',
          equipment: 'dumbbell',
          series: { id: 'set_int', order: 1, reps: 12, loadKg: null, restSec: 0 },
        },
      ],
    });
    expect(payload.series[0]).not.toHaveProperty('intercalatedExercise');
    expect(payload.intercalations).toHaveLength(1);
    expect(payload.intercalations?.[0].afterSeriesId).toBe(series[0].id);
    expect(serializeTrainingPrescription({ series }).intercalations).toBeUndefined();
  });

  it('descarta intercalação órfã ao normalizar', () => {
    const series = createUniformTrainingSeries({ count: 1, reps: 10, restSec: 60 });
    const normalized = normalizeTrainingExercisePrescription({
      series,
      intercalations: [
        {
          id: 'int_orphan',
          afterSeriesId: 'missing',
          slotOrder: 0,
          exerciseId: 'lat',
          name: 'lateral raise',
          bodyPart: 'shoulders',
          target: 'delts',
          equipment: 'dumbbell',
          series: { id: 'set_x', order: 1, reps: 12, loadKg: 8, restSec: 0 },
        },
      ],
    } as never);
    expect(normalized.intercalations).toBeUndefined();
  });

  it('valida série mínima e valores', () => {
    expect(validateTrainingPrescription({ series: createDefaultTrainingSeries() }).ok).toBe(true);
    expect(validateTrainingPrescription({ series: [] }).ok).toBe(false);
    const bad = createDefaultTrainingSeries();
    bad[0].reps = 0;
    expect(validateTrainingPrescription({ series: bad }).ok).toBe(false);
  });
});
