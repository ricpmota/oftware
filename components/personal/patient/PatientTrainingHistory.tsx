'use client';

import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Printer,
  X,
} from 'lucide-react';
import { SessionExerciseExecutionDetail } from '@/components/personal/stats/SessionExerciseExecutionDetail';
import { WorkoutSequencePreview } from '@/components/personal/WorkoutSequencePreview';
import {
  translateEquipment,
  translateExerciseName,
  translateTarget,
} from '@/data/exerciseTranslations';
import {
  formatTrainingSeriesSummary,
  getEffectiveRestSec,
} from '@/lib/personal/trainingExerciseSeries';
import type { TrainingExerciseExecution } from '@/lib/personal/trainingExecutionSeries';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

const WEEKDAY_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

type HistoryProgress = { doneCount: number; totalCount: number; percent: number };

export type PatientTrainingHistoryProps = {
  loading: boolean;
  sessions: TrainingSession[];
  sessionsInRange: TrainingSession[];
  periodLabel: string;
  view: 'mes' | 'semana';
  onViewChange: (view: 'mes' | 'semana') => void;
  selectedDay: Date | null;
  onSelectDay: (date: Date | null) => void;
  weekAnchor: Date;
  onChangeWeek: (date: Date) => void;
  monthAnchor: Date;
  onChangeMonth: (date: Date) => void;
  selectedSession: TrainingSession | null;
  exercises: TrainingSessionExercise[];
  executions: Record<string, TrainingExerciseExecution>;
  progress: HistoryProgress;
  nextExercise: TrainingSessionExercise | null;
  showAllExercises: boolean;
  onToggleAllExercises: () => void;
  onOpenSession: (session: TrainingSession) => void;
  onClearSelection: () => void;
  onPrint: () => void;
  printing: boolean;
};

function parseSessionDate(rawDate: string): Date {
  const [year, month, day] = rawDate.split('-').map(Number);
  if (!year || !month || !day) return new Date(rawDate);
  return new Date(year, month - 1, day);
}

function toLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(anchor: Date): Date {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function statusView(status: TrainingSession['status']) {
  if (status === 'done') {
    return {
      label: 'Feito',
      bar: 'bg-[#4CCB7A]',
      badge: 'border-[#4CCB7A]/40 bg-[#12382c] text-[#4CCB7A]',
    };
  }
  if (status === 'skipped') {
    return {
      label: 'Pulou',
      bar: 'bg-red-400',
      badge: 'border-red-400/35 bg-red-950/50 text-red-300',
    };
  }
  return {
    label: 'Agendado',
    bar: 'bg-[#7E9BBF]',
    badge: 'border-[#315072] bg-[#1B3658] text-[#A5BAD3]',
  };
}

function formatSessionDay(rawDate: string): { day: string; month: string; full: string } {
  const date = parseSessionDate(rawDate);
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month,
    full: date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
}

function PeriodCalendar({
  view,
  selectedDay,
  onSelectDay,
  weekAnchor,
  onChangeWeek,
  monthAnchor,
  onChangeMonth,
  markedDates,
}: {
  view: 'mes' | 'semana';
  selectedDay: Date | null;
  onSelectDay: (date: Date | null) => void;
  weekAnchor: Date;
  onChangeWeek: (date: Date) => void;
  monthAnchor: Date;
  onChangeMonth: (date: Date) => void;
  markedDates: Set<string>;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const shiftWeek = (direction: -1 | 1) => {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + direction * 7);
    onChangeWeek(next);
    onSelectDay(null);
  };

  const shiftMonth = (direction: -1 | 1) => {
    const next = new Date(monthAnchor);
    next.setMonth(next.getMonth() + direction);
    onChangeMonth(next);
    onSelectDay(null);
  };

  const weekStart = startOfWeek(weekAnchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return day;
  });
  const weekEnd = weekDays[6];

  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];

  const title =
    view === 'semana'
      ? `${weekStart.toLocaleDateString('pt-BR')} – ${weekEnd.toLocaleDateString('pt-BR')}`
      : monthAnchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const renderDay = (day: Date) => {
    const key = toLocalKey(day);
    const selected = selectedDay ? sameDay(day, selectedDay) : false;
    const isToday = sameDay(day, today);
    const marked = markedDates.has(key);
    return (
      <button
        key={key}
        type="button"
        onClick={() => onSelectDay(day)}
        aria-pressed={selected}
        className={`flex min-w-0 flex-col items-center justify-center rounded-xl border py-1.5 text-[13px] font-semibold tabular-nums ${
          selected
            ? 'border-[#4CCB7A] bg-[#12382c] text-[#4CCB7A]'
            : isToday
              ? 'border-[#315072] bg-[#1B3658] text-white'
              : 'border-transparent bg-transparent text-[#A5BAD3]'
        }`}
      >
        <span>{day.getDate()}</span>
        <span className={`mt-0.5 h-1 w-1 rounded-full ${marked ? 'bg-[#4CCB7A]' : 'bg-transparent'}`} aria-hidden />
      </button>
    );
  };

  return (
    <div className="rounded-[18px] border border-[#315072] bg-[#11294B] px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (view === 'semana' ? shiftWeek(-1) : shiftMonth(-1))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#315072] text-[#A5BAD3]"
          aria-label="Período anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-white">{title}</p>
        <button
          type="button"
          onClick={() => (view === 'semana' ? shiftWeek(1) : shiftMonth(1))}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#315072] text-[#A5BAD3]"
          aria-label="Próximo período"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT.map((letter, index) => (
          <span key={`${letter}-${index}`} className="text-center text-[10px] font-semibold text-[#7E9BBF]">
            {letter}
          </span>
        ))}
        {view === 'semana'
          ? weekDays.map(renderDay)
          : monthCells.map((day, index) =>
              day ? (
                renderDay(day)
              ) : (
                <span key={`empty-${index}`} aria-hidden />
              )
            )}
      </div>
      {selectedDay ? (
        <button
          type="button"
          onClick={() => onSelectDay(null)}
          className="mt-2 w-full text-center text-xs font-medium text-[#A5BAD3]"
        >
          Ver {view === 'semana' ? 'a semana' : 'o mês'}
        </button>
      ) : null}
    </div>
  );
}

export function PatientTrainingHistory({
  loading,
  sessions,
  sessionsInRange,
  periodLabel,
  view,
  onViewChange,
  selectedDay,
  onSelectDay,
  weekAnchor,
  onChangeWeek,
  monthAnchor,
  onChangeMonth,
  selectedSession,
  exercises,
  executions,
  progress,
  nextExercise,
  showAllExercises,
  onToggleAllExercises,
  onOpenSession,
  onClearSelection,
  onPrint,
  printing,
}: PatientTrainingHistoryProps) {
  const doneCount = sessions.filter((session) => session.status === 'done').length;
  const skippedCount = sessions.filter((session) => session.status === 'skipped').length;
  const markedDates = new Set(sessionsInRange.map((session) => session.scheduledDate));

  return (
    <div className="space-y-3 overflow-x-hidden">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12382c]">
          <History className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">Histórico de treinos</h2>
          <p className="text-xs leading-snug text-[#A5BAD3]">Acompanhe suas sessões e sua evolução.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-full border border-[#315072] bg-[#11294B] p-1">
        {([
          ['semana', 'Semana'],
          ['mes', 'Mês'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={`rounded-full py-2 text-sm font-semibold ${
              view === id ? 'bg-[#4CCB7A] text-[#091D3C]' : 'text-[#A5BAD3]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <PeriodCalendar
        view={view}
        selectedDay={selectedDay}
        onSelectDay={onSelectDay}
        weekAnchor={weekAnchor}
        onChangeWeek={onChangeWeek}
        monthAnchor={monthAnchor}
        onChangeMonth={onChangeMonth}
        markedDates={markedDates}
      />

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Registros', value: sessions.length },
          { label: 'Feitos', value: doneCount },
          { label: 'Pulados', value: skippedCount },
        ].map((item) => (
          <div key={item.label} className="min-w-0 rounded-[18px] border border-[#315072] bg-[#11294B] px-2 py-2.5 text-center">
            <p className="text-lg font-semibold leading-none text-white">{item.value}</p>
            <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-wide text-[#A5BAD3]">{item.label}</p>
          </div>
        ))}
      </div>
      <p className="px-1 text-xs capitalize text-[#A5BAD3]">{periodLabel}</p>

      {loading ? (
        <div className="flex justify-center rounded-[18px] border border-[#315072] bg-[#11294B] py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#4CCB7A]" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-[18px] border border-[#315072] bg-[#11294B] px-4 py-8 text-center">
          <CalendarCheck className="mx-auto h-6 w-6 text-[#4CCB7A]" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-white">Nenhum treino neste período</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A5BAD3]">
            Selecione outro período para consultar seu histórico.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const when = formatSessionDay(session.scheduledDate);
            const status = statusView(session.status);
            return (
              <button
                key={session.id || `${session.scheduledDate}-${session.title}`}
                type="button"
                onClick={() => onOpenSession(session)}
                className="flex w-full min-w-0 gap-2 text-left"
              >
                <span className="flex w-11 shrink-0 flex-col items-center pt-2">
                  <span className="text-base font-bold leading-none text-white">{when.day}</span>
                  <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#A5BAD3]">
                    {when.month}
                  </span>
                  <span className="mt-1 w-px flex-1 bg-[#315072]" aria-hidden />
                </span>
                <span className="mb-1 flex min-w-0 flex-1 items-stretch overflow-hidden rounded-[18px] border border-[#315072] bg-[#11294B]">
                  <span className={`w-1 shrink-0 ${status.bar}`} aria-hidden />
                  <span className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold leading-snug text-white">
                        {session.title}
                      </span>
                      <span className={`mt-1 inline-flex max-w-full rounded-full border px-2 py-0.5 text-[11px] font-semibold ${status.badge}`}>
                        {status.label}
                      </span>
                      {session.patientNotes ? (
                        <span className="mt-1 block whitespace-pre-wrap break-words text-xs leading-relaxed text-[#A5BAD3]">
                          {session.patientNotes}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#A5BAD3]" aria-hidden />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div data-historico-detail className="scroll-mt-4 space-y-3 pt-1">
        {!selectedSession ? (
          <p className="px-1 text-center text-xs text-[#A5BAD3]">Toque em um treino para ver os detalhes.</p>
        ) : (
          <>
            <section className="relative rounded-[18px] border border-[#315072] bg-[#11294B] p-4">
              <button
                type="button"
                onClick={onClearSelection}
                className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#315072] text-[#A5BAD3]"
                aria-label="Limpar seleção"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="break-words pr-10 text-lg font-semibold text-white">{selectedSession.title}</h3>
              <p className="mt-1 text-sm capitalize text-[#A5BAD3]">{formatSessionDay(selectedSession.scheduledDate).full}</p>
              <span className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusView(selectedSession.status).badge}`}>
                {statusView(selectedSession.status).label}
              </span>
              <p className="mt-3 text-sm text-[#A5BAD3]">
                {progress.totalCount} exercícios • {progress.percent}%
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#1B3658]">
                <div
                  className="h-full rounded-full bg-[#4CCB7A]"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <button
                type="button"
                onClick={onPrint}
                disabled={printing || exercises.length === 0}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#315072] bg-[#1B3658] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                Imprimir treino
              </button>
            </section>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-white">Próximo exercício</h3>
              {exercises.length === 0 ? (
                <p className="rounded-[18px] border border-[#315072] bg-[#11294B] px-4 py-4 text-sm text-[#A5BAD3]">
                  Carregando exercícios...
                </p>
              ) : !nextExercise ? (
                <p className="rounded-[18px] border border-[#315072] bg-[#11294B] px-4 py-4 text-center text-sm text-white">
                  Treino concluído
                </p>
              ) : (
                <div className="flex gap-3 rounded-[18px] border border-[#315072] bg-[#11294B] p-3">
                  {nextExercise.gifUrl ? (
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#1B3658]">
                      <img
                        src={nextExercise.gifUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-white">{translateExerciseName(nextExercise.name)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full border border-[#4CCB7A]/35 bg-[#12382c] px-2 py-0.5 text-[11px] text-[#4CCB7A]">
                        {translateTarget(nextExercise.target)}
                      </span>
                      {nextExercise.equipment && nextExercise.equipment !== 'body weight' ? (
                        <span className="rounded-full border border-[#315072] px-2 py-0.5 text-[11px] text-[#A5BAD3]">
                          {translateEquipment(nextExercise.equipment)}
                        </span>
                      ) : null}
                    </div>
                    {nextExercise.prescription ? (
                      <p className="mt-1 break-words text-xs text-[#A5BAD3]">
                        {formatTrainingSeriesSummary(nextExercise.prescription)}
                        {` • ${getEffectiveRestSec(nextExercise.prescription)}s descanso`}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-[18px] border border-[#315072] bg-[#11294B]">
              <button
                type="button"
                onClick={onToggleAllExercises}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-semibold text-white"
              >
                <span>Ver todos os exercícios</span>
                <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${showAllExercises ? 'rotate-90' : ''}`} />
              </button>
              {showAllExercises ? (
                <div className="border-t border-[#315072]">
                  {exercises.map((exercise, index) => (
                    <div
                      key={exercise.id ?? index}
                      className={`flex items-start gap-3 px-4 py-3 ${index > 0 ? 'border-t border-[#315072]' : ''} ${
                        exercise.status === 'done'
                          ? 'border-l-2 border-l-[#4CCB7A]'
                          : exercise.status === 'skipped'
                            ? 'border-l-2 border-l-red-400'
                            : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      {exercise.gifUrl ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#1B3658]">
                          <img
                            src={exercise.gifUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-semibold text-white">{translateExerciseName(exercise.name)}</p>
                        <p className="text-xs text-[#A5BAD3]">{formatTrainingSeriesSummary(exercise.prescription)}</p>
                        <WorkoutSequencePreview
                          exercise={exercise}
                          hostExecution={exercise.id ? executions[exercise.id] || null : null}
                          intercalationExecutions={executions}
                        />
                        {(exercise.prescription?.intercalations || []).length === 0 ? (
                          <SessionExerciseExecutionDetail
                            execution={exercise.id ? executions[exercise.id] || null : null}
                          />
                        ) : null}
                      </div>
                      {exercise.status === 'done' || exercise.status === 'skipped' ? (
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            exercise.status === 'done' ? 'bg-[#12382c] text-[#4CCB7A]' : 'bg-red-950/50 text-red-300'
                          }`}
                        >
                          {exercise.status === 'done' ? 'Feito' : 'Pulei'}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
