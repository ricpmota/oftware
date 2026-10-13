import { describe, expect, it } from 'vitest';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import type { TrainingExerciseExecution } from '@/lib/personal/trainingExecutionSeries';
import {
  buildExerciseEvolutionSummaries,
  buildTrainingStatsDataset,
  buildWeeklySessionCounts,
  calculateLoadVariation,
  calculateSessionCompletionStats,
  emptyTrainingStatsDataset,
  formatLoadVariationPercent,
  getSessionCompletionState,
  maxActualLoadKgFromSeries,
  statsPeriodRange,
  toLocalYYYYMMDD,
  type TrainingStatsSessionInput,
} from '@/lib/personal/trainingStats';

function session(
  id: string,
  date: string,
  status: TrainingSession['status'] = 'scheduled'
): TrainingSession {
  return {
    id,
    patientId: 'p1',
    createdBy: 'patient',
    createdById: 'u1',
    scheduledDate: date,
    title: 'Treino',
    status,
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function execution(params: {
  exerciseDocId: string;
  exerciseId: string;
  status?: TrainingExerciseExecution['status'];
  series: TrainingExerciseExecution['series'];
}): TrainingExerciseExecution {
  return {
    exerciseDocId: params.exerciseDocId,
    exerciseId: params.exerciseId,
    status: params.status ?? 'done',
    series: params.series,
  };
}

describe('trainingStats período e datas', () => {
  it('toLocalYYYYMMDD não usa UTC', () => {
    const date = new Date(2026, 7, 16, 23, 30, 0);
    expect(toLocalYYYYMMDD(date)).toBe('2026-08-16');
  });

  it('statsPeriodRange de 90 dias é inclusivo', () => {
    const range = statsPeriodRange(90, new Date(2026, 7, 16));
    expect(range.endDate).toBe('2026-08-16');
    expect(range.startDate).toBe('2026-05-19');
  });
});

describe('conclusão de sessão', () => {
  it('respeita status done/skipped gravado', () => {
    expect(getSessionCompletionState(session('a', '2026-08-01', 'done'), [])).toBe('done');
    expect(getSessionCompletionState(session('a', '2026-08-01', 'skipped'), [])).toBe(
      'skipped'
    );
  });

  it('scheduled com todos exercícios done conta como concluída', () => {
    const exercises = [
      { status: 'done' as const },
      { status: 'done' as const },
    ];
    expect(getSessionCompletionState(session('a', '2026-08-01'), exercises)).toBe('done');
  });

  it('mistura done+skipped terminal conta como concluída', () => {
    const exercises = [
      { status: 'done' as const },
      { status: 'skipped' as const },
    ];
    expect(getSessionCompletionState(session('a', '2026-08-01'), exercises)).toBe('done');
  });

  it('todos skipped conta como pulada', () => {
    const exercises = [{ status: 'skipped' as const }, { status: 'skipped' as const }];
    expect(getSessionCompletionState(session('a', '2026-08-01'), exercises)).toBe(
      'skipped'
    );
  });
});

describe('KPIs de sessão', () => {
  it('10 programadas, 8 done, 1 skipped, 1 scheduled', () => {
    const stats = calculateSessionCompletionStats([
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'done',
      'skipped',
      'scheduled',
    ]);
    expect(stats).toEqual({
      programmed: 10,
      completed: 8,
      skipped: 1,
      scheduled: 1,
      completionRatePercent: 80,
    });
  });

  it('nenhuma sessão → taxa null (empty, não 0%)', () => {
    const empty = emptyTrainingStatsDataset({
      days: 90,
      startDate: '2026-05-19',
      endDate: '2026-08-16',
    });
    expect(empty.completion.programmed).toBe(0);
    expect(empty.completion.completionRatePercent).toBeNull();
    expect(empty.exercises).toEqual([]);
  });
});

describe('carga por ocorrência', () => {
  it('usa a maior carga done da pirâmide', () => {
    expect(
      maxActualLoadKgFromSeries([
        {
          seriesId: 's1',
          order: 1,
          prescribedReps: 15,
          prescribedLoadKg: 20,
          prescribedRestSec: 60,
          actualReps: 15,
          actualLoadKg: 20,
          status: 'done',
        },
        {
          seriesId: 's2',
          order: 2,
          prescribedReps: 12,
          prescribedLoadKg: 25,
          prescribedRestSec: 60,
          actualReps: 12,
          actualLoadKg: 25,
          status: 'done',
        },
        {
          seriesId: 's3',
          order: 3,
          prescribedReps: 10,
          prescribedLoadKg: 30,
          prescribedRestSec: 60,
          actualReps: 10,
          actualLoadKg: 30,
          status: 'done',
        },
        {
          seriesId: 's4',
          order: 4,
          prescribedReps: 8,
          prescribedLoadKg: 35,
          prescribedRestSec: 60,
          actualReps: 8,
          actualLoadKg: 35,
          status: 'done',
        },
      ])
    ).toBe(35);
  });

  it('série skipped não entra na maior carga', () => {
    expect(
      maxActualLoadKgFromSeries([
        {
          seriesId: 's1',
          order: 1,
          prescribedReps: 10,
          prescribedLoadKg: 40,
          prescribedRestSec: 60,
          actualReps: 10,
          actualLoadKg: 40,
          status: 'done',
        },
        {
          seriesId: 's2',
          order: 2,
          prescribedReps: 8,
          prescribedLoadKg: 50,
          prescribedRestSec: 60,
          actualReps: null,
          actualLoadKg: 50,
          status: 'skipped',
        },
      ])
    ).toBe(40);
  });

  it('null não vira 0', () => {
    expect(
      maxActualLoadKgFromSeries([
        {
          seriesId: 's1',
          order: 1,
          prescribedReps: 12,
          prescribedLoadKg: null,
          prescribedRestSec: 60,
          actualReps: 12,
          actualLoadKg: null,
          status: 'done',
        },
      ])
    ).toBeNull();
  });
});

describe('progressão por exercício', () => {
  const bench = (
    date: string,
    docId: string,
    load: number,
    prescribed = load
  ): TrainingStatsSessionInput => ({
    session: session(date, date, 'done'),
    exercises: [
      {
        id: docId,
        source: 'exercisedb',
        exerciseId: '0025',
        name: 'barbell bench press',
        bodyPart: 'chest',
        target: 'pectorals',
        equipment: 'barbell',
        order: 0,
        prescription: { series: [] },
      } as TrainingSessionExercise,
    ],
    executions: [
      execution({
        exerciseDocId: docId,
        exerciseId: '0025',
        series: [
          {
            seriesId: 's1',
            order: 1,
            prescribedReps: 10,
            prescribedLoadKg: prescribed,
            prescribedRestSec: 60,
            actualReps: 10,
            actualLoadKg: load,
            status: 'done',
          },
        ],
      }),
    ],
  });

  it('Supino 30 → 32 → 35: latest/max/first/variação', () => {
    const summaries = buildExerciseEvolutionSummaries([
      bench('2026-08-05', 'ex-a', 30),
      bench('2026-08-12', 'ex-b', 32),
      bench('2026-08-19', 'ex-c', 35),
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      exerciseId: '0025',
      latestLoadKg: 35,
      maxLoadKg: 35,
      firstLoadKg: 30,
    });
    expect(summaries[0].variationPercent).toBeCloseTo(16.666, 2);
    expect(formatLoadVariationPercent(summaries[0].variationPercent)).toBe('+16,67%');
  });

  it('carga caiu: variação negativa, sem chamar de falha', () => {
    expect(calculateLoadVariation(35, 32)).toBeCloseTo(-8.571, 2);
    expect(formatLoadVariationPercent(calculateLoadVariation(35, 32))).toBe('-8,57%');
  });

  it('flexão com load null não entra no ranking de carga', () => {
    const summaries = buildExerciseEvolutionSummaries([
      {
        session: session('s1', '2026-08-05', 'done'),
        exercises: [
          {
            id: 'push',
            source: 'exercisedb',
            exerciseId: '0662',
            name: 'push-up',
            bodyPart: 'chest',
            target: 'pectorals',
            equipment: 'body weight',
            order: 0,
            prescription: { series: [] },
          } as TrainingSessionExercise,
        ],
        executions: [
          execution({
            exerciseDocId: 'push',
            exerciseId: '0662',
            series: [
              {
                seriesId: 's1',
                order: 1,
                prescribedReps: 12,
                prescribedLoadKg: null,
                prescribedRestSec: 60,
                actualReps: 12,
                actualLoadKg: null,
                status: 'done',
              },
            ],
          }),
        ],
      },
    ]);
    expect(summaries).toEqual([]);
  });

  it('duas ocorrências do mesmo exerciseId na mesma sessão entram no histórico', () => {
    const summaries = buildExerciseEvolutionSummaries([
      {
        session: session('s1', '2026-08-12', 'done'),
        exercises: [
          {
            id: 'a',
            source: 'exercisedb',
            exerciseId: '0025',
            name: 'barbell bench press',
            bodyPart: 'chest',
            target: 'pectorals',
            equipment: 'barbell',
            order: 0,
            prescription: { series: [] },
          } as TrainingSessionExercise,
          {
            id: 'b',
            source: 'exercisedb',
            exerciseId: '0025',
            name: 'barbell bench press',
            bodyPart: 'chest',
            target: 'pectorals',
            equipment: 'barbell',
            order: 1,
            prescription: { series: [] },
          } as TrainingSessionExercise,
        ],
        executions: [
          execution({
            exerciseDocId: 'a',
            exerciseId: '0025',
            series: [
              {
                seriesId: 's1',
                order: 1,
                prescribedReps: 10,
                prescribedLoadKg: 30,
                prescribedRestSec: 60,
                actualReps: 10,
                actualLoadKg: 30,
                status: 'done',
              },
            ],
          }),
          execution({
            exerciseDocId: 'b',
            exerciseId: '0025',
            series: [
              {
                seriesId: 's1',
                order: 1,
                prescribedReps: 8,
                prescribedLoadKg: 35,
                prescribedRestSec: 60,
                actualReps: 8,
                actualLoadKg: 35,
                status: 'done',
              },
            ],
          }),
        ],
      },
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].exerciseId).toBe('0025');
    expect(summaries[0].occurrences).toHaveLength(2);
    expect(summaries[0].maxLoadKg).toBe(35);
    expect(summaries[0].sessionCountWithLoad).toBe(1);
  });

  it('usa prescribed* da execução, não da prescrição atual', () => {
    const summaries = buildExerciseEvolutionSummaries([
      {
        session: session('s1', '2026-08-12', 'done'),
        exercises: [
          {
            id: 'a',
            source: 'exercisedb',
            exerciseId: '0025',
            name: 'barbell bench press',
            bodyPart: 'chest',
            target: 'pectorals',
            equipment: 'barbell',
            order: 0,
            prescription: { series: [] },
          } as TrainingSessionExercise,
        ],
        executions: [
          execution({
            exerciseDocId: 'a',
            exerciseId: '0025',
            series: [
              {
                seriesId: 's1',
                order: 1,
                prescribedReps: 10,
                prescribedLoadKg: 30,
                prescribedRestSec: 60,
                actualReps: 10,
                actualLoadKg: 32,
                status: 'done',
              },
            ],
          }),
        ],
      },
    ]);
    expect(summaries[0].occurrences[0].series[0]).toMatchObject({
      prescribedLoadKg: 30,
      actualLoadKg: 32,
    });
  });

  it('agrupa carga intercalada pelo exerciseId do movimento', () => {
    const summaries = buildExerciseEvolutionSummaries([
      {
        session: session('s1', '2026-08-12', 'done'),
        exercises: [
          {
            id: 'host',
            source: 'exercisedb',
            exerciseId: '0025',
            name: 'barbell bench press',
            bodyPart: 'chest',
            target: 'pectorals',
            equipment: 'barbell',
            order: 0,
            prescription: {
              series: [],
              intercalations: [
                {
                  id: 'int_lat',
                  afterSeriesId: 'a1',
                  slotOrder: 0,
                  exerciseId: '0334',
                  name: 'dumbbell lateral raise',
                  bodyPart: 'shoulders',
                  target: 'delts',
                  equipment: 'dumbbell',
                  series: { id: 'b1', order: 1, reps: 12, loadKg: 8, restSec: 0 },
                },
              ],
            },
          } as TrainingSessionExercise,
        ],
        executions: [
          execution({
            exerciseDocId: 'int_lat',
            exerciseId: '0334',
            series: [
              {
                seriesId: 'b1',
                order: 1,
                prescribedReps: 12,
                prescribedLoadKg: 8,
                prescribedRestSec: 0,
                actualReps: 12,
                actualLoadKg: 10,
                status: 'done',
              },
            ],
          }),
        ],
      },
    ]);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].exerciseId).toBe('0334');
    expect(summaries[0].name).toBe('dumbbell lateral raise');
    expect(summaries[0].latestLoadKg).toBe(10);
  });

  it('treino só com card Feito, sem execution, não inventa carga', () => {
    const dataset = buildTrainingStatsDataset(
      [
        {
          session: session('s1', '2026-08-12', 'scheduled'),
          exercises: [{ status: 'done' } as TrainingSessionExercise],
          executions: [],
        },
      ],
      { days: 90, startDate: '2026-05-19', endDate: '2026-08-16' }
    );
    expect(dataset.completion.completed).toBe(1);
    expect(dataset.exercises).toEqual([]);
    expect(dataset.series.total).toBe(0);
  });

  it('treino desativado e ainda agendado não entra nas estatísticas', () => {
    const dataset = buildTrainingStatsDataset(
      [
        {
          session: { ...session('inactive', '2026-08-12', 'scheduled'), active: false },
          exercises: [],
          executions: [],
        },
        {
          session: { ...session('done-old', '2026-08-10', 'done'), active: false },
          exercises: [{ status: 'done' } as TrainingSessionExercise],
          executions: [],
        },
        {
          session: session('active', '2026-08-14', 'scheduled'),
          exercises: [],
          executions: [],
        },
      ],
      { days: 90, startDate: '2026-05-19', endDate: '2026-08-16' }
    );
    expect(dataset.completion.programmed).toBe(2);
    expect(dataset.completion.scheduled).toBe(1);
    expect(dataset.completion.completed).toBe(1);
    expect(dataset.sessions.map((row) => row.sessionId)).toEqual(['done-old', 'active']);
  });
});

describe('semanal', () => {
  it('conta sessões concluídas, não exercícios', () => {
    const weeks = buildWeeklySessionCounts(
      [
        { scheduledDate: '2026-08-16', completion: 'done' },
        { scheduledDate: '2026-08-16', completion: 'done' },
        { scheduledDate: '2026-08-10', completion: 'scheduled' },
        { scheduledDate: '2026-08-03', completion: 'done' },
      ],
      '2026-08-16',
      4
    );
    expect(weeks).toHaveLength(4);
    const last = weeks[weeks.length - 1];
    expect(last.endDate).toBe('2026-08-16');
    expect(last.completed).toBe(2);
  });
});
