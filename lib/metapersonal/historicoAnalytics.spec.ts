import { describe, expect, it } from 'vitest';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import {
  buildHistoryAnalytics,
  calculateAdherence,
  calculateStreak,
  classifyHistorySession,
  consecutiveMisses,
  filterHistoryPatients,
  formatLastWorkoutLabel,
  getEvolutionTrend,
  getPatientPerformanceStatus,
  historyLoadWindow,
  previousPeriodRange,
  sortHistoryPatients,
  type HistoryPatientMetrics,
  type HistorySessionInput,
} from '@/lib/metapersonal/historicoAnalytics';
import { HISTORY_DEFAULT_PERIOD_DAYS } from '@/lib/metapersonal/historicoThresholds';

function session(
  overrides: Partial<TrainingSession> & { id: string; scheduledDate: string }
): TrainingSession {
  return {
    patientId: 'uid_1',
    createdBy: 'trainer',
    createdById: 'personal-1',
    title: 'Treino',
    status: 'scheduled',
    published: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function exercise(status?: TrainingSessionExercise['status']): TrainingSessionExercise {
  return {
    source: 'exercisedb',
    exerciseId: 'ex1',
    name: 'Puxada',
    bodyPart: 'back',
    target: 'lats',
    equipment: 'cable',
    prescription: { series: [] },
    order: 1,
    status,
  };
}

function classified(
  date: string,
  status: TrainingSession['status'] = 'scheduled',
  extras?: Partial<TrainingSession>,
  exercises: TrainingSessionExercise[] = [],
  today = '2026-09-15'
) {
  return classifyHistorySession(
    session({ id: `s-${date}`, scheduledDate: date, status, ...extras }),
    exercises,
    today
  );
}

function identity(name = 'Ana Silva') {
  return {
    pacienteId: 'pac-1',
    patientUserId: 'uid_1',
    name,
  };
}

function metricsFromSessions(
  items: HistorySessionInput[],
  periodDays: 7 | 30 | 90 | 180 | 365 = 30,
  now = new Date(2026, 8, 15)
) {
  return buildHistoryAnalytics({
    periodDays,
    personalName: 'Ricardo Mota',
    now,
    patients: [{ identity: identity(), sessions: items }],
  }).patients[0];
}

describe('janela e períodos', () => {
  it('filtro 7/30/90 dias gera intervalos inclusivos e carrega período anterior', () => {
    const now = new Date(2026, 8, 15);
    const d7 = historyLoadWindow(7, now);
    expect(d7.current.startDate).toBe('2026-09-09');
    expect(d7.current.endDate).toBe('2026-09-15');
    expect(d7.previous.startDate).toBe('2026-09-02');
    expect(d7.previous.endDate).toBe('2026-09-08');

    const d30 = historyLoadWindow(30, now);
    expect(d30.current.startDate).toBe('2026-08-17');
    expect(d30.previous.endDate).toBe('2026-08-16');
    expect(d30.loadStartDate <= d30.previous.startDate).toBe(true);

    const d90 = historyLoadWindow(90, now);
    expect(d90.current.startDate).toBe('2026-06-18');
    expect(d90.loadEndDate >= d90.week.endDate).toBe(true);
  });

  it('default do produto é 30 dias', () => {
    expect(HISTORY_DEFAULT_PERIOD_DAYS).toBe(30);
    const prev = previousPeriodRange('2026-08-17', 30);
    expect(prev.endDate).toBe('2026-08-16');
    expect(prev.startDate).toBe('2026-07-18');
  });
});

describe('classificação de sessão e adesão', () => {
  it('adesão 100%', () => {
    const sessions = [
      classified('2026-09-08', 'done'),
      classified('2026-09-10', 'done'),
    ];
    const adherence = calculateAdherence(sessions);
    expect(adherence.percent).toBe(100);
    expect(adherence.done).toBe(2);
    expect(adherence.missed).toBe(0);
  });

  it('adesão parcial', () => {
    const sessions = [
      classified('2026-09-08', 'done'),
      classified('2026-09-10', 'skipped'),
    ];
    const adherence = calculateAdherence(sessions);
    expect(adherence.done).toBe(1);
    expect(adherence.missed).toBe(1);
    expect(adherence.percent).toBe(50);
  });

  it('nenhuma sessão', () => {
    expect(calculateAdherence([]).percent).toBeNull();
    expect(calculateAdherence([]).expected).toBe(0);
  });

  it('futuras não entram no denominador nem como não realizadas', () => {
    const sessions = [
      classified('2026-09-08', 'done'),
      classified('2026-09-20', 'scheduled'),
    ];
    const adherence = calculateAdherence(sessions);
    expect(adherence.expected).toBe(1);
    expect(adherence.missed).toBe(0);
    expect(sessions[1].due).toBe(false);
    expect(sessions[1].kind).toBe('scheduled');
  });

  it('active:false não penaliza sessão ainda programada', () => {
    const inactive = classified('2026-09-08', 'scheduled', { active: false });
    expect(inactive.kind).toBe('inactive');
    expect(inactive.due).toBe(false);
    expect(calculateAdherence([inactive]).expected).toBe(0);
  });

  it('status done conta como realizado', () => {
    const done = classified('2026-09-08', 'done');
    expect(done.kind).toBe('done');
    expect(done.due).toBe(true);
  });

  it('sessão prevista não realizada (passado ainda scheduled) entra como missed', () => {
    const missed = classified('2026-09-08', 'scheduled');
    expect(missed.kind).toBe('missed');
    expect(missed.due).toBe(true);
  });

  it('sessão de hoje ainda scheduled não é não realizada', () => {
    const today = classified('2026-09-15', 'scheduled');
    expect(today.kind).toBe('scheduled');
    expect(today.due).toBe(false);
  });

  it('todos os exercícios done concluem a sessão mesmo com status scheduled', () => {
    const done = classifyHistorySession(
      session({ id: 'a', scheduledDate: '2026-09-08', status: 'scheduled' }),
      [exercise('done'), exercise('done')],
      '2026-09-15'
    );
    expect(done.kind).toBe('done');
  });
});

describe('classificação de desempenho', () => {
  it('Excelente', () => {
    expect(getPatientPerformanceStatus(100)).toBe('excelente');
    expect(getPatientPerformanceStatus(85)).toBe('excelente');
  });

  it('Boa', () => {
    expect(getPatientPerformanceStatus(84)).toBe('boa');
    expect(getPatientPerformanceStatus(70)).toBe('boa');
  });

  it('Atenção', () => {
    expect(getPatientPerformanceStatus(69)).toBe('atencao');
    expect(getPatientPerformanceStatus(40)).toBe('atencao');
  });

  it('Crítica', () => {
    expect(getPatientPerformanceStatus(39)).toBe('critica');
    expect(getPatientPerformanceStatus(0)).toBe('critica');
  });

  it('Sem dados', () => {
    expect(getPatientPerformanceStatus(null)).toBe('sem-dados');
  });
});

describe('últimos 7 dias, último treino e sequência', () => {
  it('últimos 7 dias usa realizados/previstos', () => {
    const result = metricsFromSessions(
      [
        { session: session({ id: '1', scheduledDate: '2026-09-10', status: 'done' }), exercises: [] },
        { session: session({ id: '2', scheduledDate: '2026-09-12', status: 'skipped' }), exercises: [] },
        { session: session({ id: '3', scheduledDate: '2026-09-14', status: 'done' }), exercises: [] },
        { session: session({ id: '4', scheduledDate: '2026-08-01', status: 'done' }), exercises: [] },
      ],
      30
    );
    expect(result.last7Days).toEqual({ done: 2, expected: 3 });
  });

  it('último treino usa somente sessão realizada', () => {
    const result = metricsFromSessions([
      { session: session({ id: '1', scheduledDate: '2026-09-10', status: 'done' }), exercises: [] },
      { session: session({ id: '2', scheduledDate: '2026-09-14', status: 'skipped' }), exercises: [] },
    ]);
    expect(result.lastWorkoutDate).toBe('2026-09-10');
    expect(result.lastWorkoutDaysAgo).toBe(5);
    expect(formatLastWorkoutLabel('2026-09-15', '2026-09-15')).toBe('Hoje');
    expect(formatLastWorkoutLabel('2026-09-14', '2026-09-15')).toBe('Ontem');
    expect(formatLastWorkoutLabel('2026-09-06', '2026-09-15')).toBe('9 dias');
    expect(formatLastWorkoutLabel(null, '2026-09-15')).toBe('Nunca');
  });

  it('sequência conta sessões programadas consecutivas realizadas, não dias corridos', () => {
    const streak = calculateStreak([
      classified('2026-09-01', 'done'),
      classified('2026-09-03', 'done'),
      classified('2026-09-05', 'done'),
      classified('2026-09-20', 'scheduled'),
    ]);
    expect(streak).toBe(3);
  });

  it('sequência zera no primeiro miss mais recente', () => {
    const streak = calculateStreak([
      classified('2026-09-01', 'done'),
      classified('2026-09-03', 'done'),
      classified('2026-09-05', 'skipped'),
    ]);
    expect(streak).toBe(0);
    expect(consecutiveMisses([
      classified('2026-09-03', 'done'),
      classified('2026-09-05', 'skipped'),
      classified('2026-09-08', 'scheduled'),
    ])).toBe(2);
  });
});

describe('evolução vs período anterior', () => {
  it('evolução ↑', () => {
    expect(getEvolutionTrend(90, 70)).toBe('up');
  });

  it('evolução →', () => {
    expect(getEvolutionTrend(72, 70)).toBe('stable');
  });

  it('evolução ↓', () => {
    expect(getEvolutionTrend(50, 80)).toBe('down');
  });

  it('comparação período anterior no analytics', () => {
    const result = buildHistoryAnalytics({
      periodDays: 30,
      personalName: 'Ricardo Mota',
      now: new Date(2026, 8, 15),
      patients: [
        {
          identity: identity(),
          sessions: [
            { session: session({ id: 'p1', scheduledDate: '2026-08-01', status: 'skipped' }), exercises: [] },
            { session: session({ id: 'p2', scheduledDate: '2026-08-05', status: 'skipped' }), exercises: [] },
            { session: session({ id: 'c1', scheduledDate: '2026-09-01', status: 'done' }), exercises: [] },
            { session: session({ id: 'c2', scheduledDate: '2026-09-08', status: 'done' }), exercises: [] },
          ],
        },
      ],
    });
    expect(result.patients[0].previousAdherence.percent).toBe(0);
    expect(result.patients[0].adherence.percent).toBe(100);
    expect(result.patients[0].evolution).toBe('up');
    expect(result.kpis.adherenceDelta).toBe(100);
  });
});

describe('paciente sem histórico, atenção, tabela', () => {
  it('paciente sem histórico fica Sem dados e não vira crítico', () => {
    const result = metricsFromSessions([]);
    expect(result.status).toBe('sem-dados');
    expect(result.attention).toBeNull();
    expect(result.adherence.percent).toBeNull();
  });

  it('atenção necessária por adesão crítica e misses consecutivos', () => {
    const result = metricsFromSessions([
      { session: session({ id: '1', scheduledDate: '2026-09-01', status: 'skipped' }), exercises: [] },
      { session: session({ id: '2', scheduledDate: '2026-09-05', status: 'skipped' }), exercises: [] },
      { session: session({ id: '3', scheduledDate: '2026-09-10', status: 'scheduled' }), exercises: [] },
    ]);
    expect(result.status).toBe('critica');
    expect(result.attention?.severity).toBe('alta');
    expect(result.consecutiveMisses).toBeGreaterThanOrEqual(2);
  });

  it('ordenação da tabela: crítico antes de excelente, depois nome', () => {
    const rows = sortHistoryPatients([
      { status: 'excelente', adherence: { percent: 95, done: 1, missed: 0, expected: 1 }, name: 'Zoe' },
      { status: 'critica', adherence: { percent: 10, done: 0, missed: 1, expected: 1 }, name: 'Ana' },
      { status: 'critica', adherence: { percent: 20, done: 1, missed: 4, expected: 5 }, name: 'Bruno' },
      { status: 'sem-dados', adherence: { percent: null, done: 0, missed: 0, expected: 0 }, name: 'Carla' },
    ] as HistoryPatientMetrics[]);
    expect(rows.map((item) => item.name)).toEqual(['Ana', 'Bruno', 'Zoe', 'Carla']);
  });

  it('busca por paciente ignora acento e caixa', () => {
    const rows = [
      { name: 'José Fernando', status: 'boa' },
      { name: 'Maria Santos', status: 'excelente' },
    ] as HistoryPatientMetrics[];
    const found = filterHistoryPatients(rows, 'todos', 'jose');
    expect(found.map((item) => item.name)).toEqual(['José Fernando']);
    expect(filterHistoryPatients(rows, 'excelente', '').map((item) => item.name)).toEqual([
      'Maria Santos',
    ]);
  });
});

describe('carteira agregada', () => {
  it('KPIs usam dados reais e ignoram futuras/inativas', () => {
    const result = buildHistoryAnalytics({
      periodDays: 30,
      personalName: 'Ricardo Mota',
      now: new Date(2026, 8, 15),
      patients: [
        {
          identity: identity('Ana'),
          sessions: [
            { session: session({ id: 'a1', scheduledDate: '2026-09-01', status: 'done' }), exercises: [] },
            { session: session({ id: 'a2', scheduledDate: '2026-09-20', status: 'scheduled' }), exercises: [] },
          ],
        },
        {
          identity: { ...identity('Bruno'), patientUserId: 'uid_2', pacienteId: 'pac-2' },
          sessions: [
            { session: session({ id: 'b1', scheduledDate: '2026-09-02', status: 'skipped' }), exercises: [] },
            {
              session: session({
                id: 'b2',
                scheduledDate: '2026-09-03',
                status: 'scheduled',
                active: false,
              }),
              exercises: [],
            },
          ],
        },
      ],
    });
    expect(result.kpis.doneCount).toBe(1);
    expect(result.kpis.missedCount).toBe(1);
    expect(result.kpis.adherencePercent).toBe(50);
    expect(result.distribution.excelente).toBe(1);
    expect(result.distribution.critica).toBe(1);
    expect(result.chart.length).toBeGreaterThan(0);
  });
});
