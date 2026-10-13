/**
 * Converte WorkoutPlanDraft → datas + payloads no contrato do Criar (trainingSessions).
 *
 * Modelo igual à aba Criar:
 * - Um nome (ex.: Costas) + dias da semana (seg+qui) + N semanas = uma série (recurrenceGroupId).
 * - Outro nome (ex.: Peito) + outros dias (ter+sex) = outra série.
 *
 * Variantes upper_A/upper_B (e lower/push/pull) viram a mesma série, com os exercícios
 * da primeira ocorrência e todos os weekdays do grupo.
 */

import type { ReviewedWorkoutPlanDraft } from '@/types/reviewedWorkoutPlanDraft';
import type { TrainingWeekday, WorkoutPlanDraft } from '@/types/workoutPlanDraft';
import type { TrainingSessionExercise } from '@/types/trainingSession';
import { serializeTrainingPrescription } from '@/lib/personal/trainingExerciseSeries';
import { labelWeekday } from '@/lib/trainingEngine/draftLabels';

const WEEKDAY_TO_JS: Record<TrainingWeekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const WEEKDAY_LABELS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Próxima ocorrência do weekday (inclui hoje se for o dia). */
export function nextDateForWeekday(from: Date, weekday: TrainingWeekday): Date {
  const target = WEEKDAY_TO_JS[weekday];
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const delta = (target - start.getDay() + 7) % 7;
  return addDays(start, delta);
}

/**
 * Chave de série no calendário (Criar).
 * upper_A + upper_B → mesma série; full_body_A ≠ full_body_B.
 */
export function seriesKeyFromFocus(focus: string | null | undefined): string {
  if (!focus) return 'treino';
  if (focus === 'upper' || focus.startsWith('upper_')) return 'upper';
  if (focus === 'lower' || focus.startsWith('lower_')) return 'lower';
  if (focus === 'push' || focus.startsWith('push_')) return 'push';
  if (focus === 'pull' || focus.startsWith('pull_')) return 'pull';
  return focus;
}

/** Nome curto para gravar no Criar (como “Costas”, “Peito”, “Superior”). */
export function labelSessionFocus(focus: string | null | undefined): string {
  if (!focus) return 'Treino';
  const key = seriesKeyFromFocus(focus);
  const map: Record<string, string> = {
    full_body_A: 'Corpo inteiro A',
    full_body_B: 'Corpo inteiro B',
    full_body_C: 'Corpo inteiro C',
    upper: 'Superior',
    upper_A: 'Superior',
    upper_B: 'Superior',
    lower: 'Inferior',
    lower_A: 'Inferior',
    lower_B: 'Inferior',
    push: 'Push',
    push_B: 'Push',
    pull: 'Pull',
    pull_B: 'Pull',
    alternating_A: 'Treino A',
    alternating_B: 'Treino B',
  };
  if (map[focus]) return map[focus];
  if (map[key]) return map[key];
  if (focus.startsWith('full_body')) return 'Corpo inteiro';
  if (focus.startsWith('upper')) return 'Superior';
  if (focus.startsWith('lower')) return 'Inferior';
  if (focus.startsWith('push')) return 'Push';
  if (focus.startsWith('pull')) return 'Pull';
  return focus.replace(/_/g, ' ');
}

export type MaterializedSessionPlan = {
  /** Chave estável da série (para overrides de título e recurrenceGroupId). */
  seriesKey: string;
  /** dayIndex da primeira sessão do grupo (legado / compat). */
  dayIndex: number;
  dayIndexes: number[];
  title: string;
  focus: string;
  weekday: TrainingWeekday | null;
  /** Dias da semana JS (0=dom) em que este treino se repete. */
  weekdaysJs: number[];
  weekdays: (TrainingWeekday | null)[];
  dates: string[];
  exercises: Omit<TrainingSessionExercise, 'order' | 'id'>[];
};

function mapExercises(
  session: WorkoutPlanDraft['sessions'][number]
): Omit<TrainingSessionExercise, 'order' | 'id'>[] {
  return session.exercises.map((ex) => {
    const gifUrl = ex.sourceId
      ? `/api/exercisedb/image?exerciseId=${encodeURIComponent(ex.sourceId)}&resolution=360`
      : undefined;
    return {
      source: 'exercisedb' as const,
      exerciseId: ex.sourceId || ex.exerciseId,
      name: ex.exerciseName,
      bodyPart: ex.primaryMuscles[0] || '',
      target: ex.primaryMuscles[0] || '',
      equipment: ex.equipment[0] || '',
      // Ponte mínima: o draft ainda usa sets + faixa de reps. Não inventamos carga.
      // Semântica anterior: um único `reps` operacional = max da faixa (ou min, ou 10).
      prescription: serializeTrainingPrescription({
        sets: ex.sets,
        reps: ex.repetitionRange.max || ex.repetitionRange.min || 10,
        restSec: ex.restSeconds,
      }),
      ...(gifUrl ? { gifUrl } : {}),
    };
  });
}

export function buildMaterializedSessionsFromDraft(params: {
  draft: WorkoutPlanDraft;
  weeksCount?: number;
  startFrom?: Date;
  /**
   * Sobrescreve título por seriesKey (preferido) ou dayIndex (legado).
   */
  titleOverrides?: Record<string | number, string>;
}): MaterializedSessionPlan[] {
  const weeksCount = Math.max(1, Math.min(12, params.weeksCount ?? 4));
  const startFrom = params.startFrom ?? new Date();
  const sessions = params.draft.sessions || [];
  const overrides = params.titleOverrides || {};

  type Acc = {
    seriesKey: string;
    dayIndexes: number[];
    focus: string;
    weekdays: (TrainingWeekday | null)[];
    weekdaysJs: number[];
    exercises: Omit<TrainingSessionExercise, 'order' | 'id'>[];
  };

  const order: string[] = [];
  const byKey = new Map<string, Acc>();

  for (const session of sessions) {
    const seriesKey = seriesKeyFromFocus(session.focus);
    const weekday = session.weekday;
    const base =
      weekday != null
        ? nextDateForWeekday(startFrom, weekday)
        : addDays(
            new Date(startFrom.getFullYear(), startFrom.getMonth(), startFrom.getDate()),
            session.dayIndex
          );
    const jsDay = weekday != null ? WEEKDAY_TO_JS[weekday] : base.getDay();

    const existing = byKey.get(seriesKey);
    if (!existing) {
      order.push(seriesKey);
      byKey.set(seriesKey, {
        seriesKey,
        dayIndexes: [session.dayIndex],
        focus: session.focus,
        weekdays: [weekday],
        weekdaysJs: [jsDay],
        exercises: mapExercises(session),
      });
    } else {
      existing.dayIndexes.push(session.dayIndex);
      existing.weekdays.push(weekday);
      if (!existing.weekdaysJs.includes(jsDay)) {
        existing.weekdaysJs.push(jsDay);
      }
    }
  }

  return order.map((key) => {
    const acc = byKey.get(key)!;
    const dates: string[] = [];
    const startDay = new Date(
      startFrom.getFullYear(),
      startFrom.getMonth(),
      startFrom.getDate()
    );

    for (let w = 0; w < weeksCount; w++) {
      for (const jsDay of acc.weekdaysJs) {
        const weekOrigin = addDays(startDay, w * 7);
        const delta = (jsDay - weekOrigin.getDay() + 7) % 7;
        dates.push(toLocalYYYYMMDD(addDays(weekOrigin, delta)));
      }
    }
    dates.sort();
    const uniqueDates = [...new Set(dates)];

    const override =
      overrides[acc.seriesKey]?.trim() ||
      overrides[acc.dayIndexes[0]]?.trim() ||
      '';
    const title = override || labelSessionFocus(acc.focus);

    return {
      seriesKey: acc.seriesKey,
      dayIndex: acc.dayIndexes[0],
      dayIndexes: acc.dayIndexes,
      title,
      focus: acc.focus,
      weekday: acc.weekdays[0] ?? null,
      weekdaysJs: acc.weekdaysJs,
      weekdays: acc.weekdays,
      dates: uniqueDates,
      exercises: acc.exercises,
    };
  });
}

export function countMaterializedSessionDocs(plans: MaterializedSessionPlan[]): number {
  return plans.reduce((acc, p) => acc + p.dates.length, 0);
}

export function getDraftWorkingPlan(reviewed: ReviewedWorkoutPlanDraft): WorkoutPlanDraft {
  return reviewed.workingDraft || reviewed.baseDraft;
}

export function describeSessionSchedule(plan: MaterializedSessionPlan): string {
  const dayNames = plan.weekdaysJs
    .slice()
    .sort((a, b) => a - b)
    .map((d) => WEEKDAY_LABELS[d])
    .filter(Boolean);
  const daysLabel =
    dayNames.length > 0
      ? dayNames.join(' e ')
      : labelWeekday(plan.weekday) || 'Dia variável';
  const weeks = Math.max(
    1,
    Math.round(plan.dates.length / Math.max(1, plan.weekdaysJs.length))
  );
  return `${daysLabel} · ${weeks} semana${weeks === 1 ? '' : 's'} · ${plan.dates.length} no calendário`;
}
