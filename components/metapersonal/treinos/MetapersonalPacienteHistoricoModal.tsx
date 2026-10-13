'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers,
  Loader2,
  Play,
  Target,
  X,
} from 'lucide-react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import { gymMediaBelongsToPatient, type ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';
import { formatTrainingSeriesSummary } from '@/lib/personal/trainingExerciseSeries';
import { isTrainingSessionActive } from '@/lib/personal/trainingSessionActive';
import {
  STATS_PERIOD_OPTIONS,
  type StatsPeriodDays,
  type TrainingStatsDataset,
} from '@/lib/personal/trainingStats';
import { sessionLookupIds } from '@/lib/metapersonal/treinosCoverage';
import { exerciseGymMediaService } from '@/services/exerciseGymMediaService';
import { PersonalTrainingStatsService } from '@/services/personalTrainingStatsService';
import { trainingSessionService } from '@/services/trainingSessionService';
import type { PacienteCompleto } from '@/types/obesidade';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';

type Props = {
  open: boolean;
  paciente: PacienteCompleto;
  onClose: () => void;
};

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

function toLocalKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
}

function startOfWeek(anchor: Date): Date {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function patientName(paciente: PacienteCompleto): string {
  return paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
}

function mediaUserIds(paciente: PacienteCompleto): string[] {
  const ids: string[] = [];
  const userId = String(paciente.userId || '').trim();
  const docId = String(paciente.id || '').trim();
  if (userId) ids.push(userId);
  if (docId && !ids.includes(docId)) ids.push(docId);
  return ids;
}

function daySessions(sessions: TrainingSession[], dateKey: string): TrainingSession[] {
  return sessions.filter((session) => session.scheduledDate === dateKey);
}

function dayProgress(
  sessions: TrainingSession[],
  exercisesBySession: Record<string, TrainingSessionExercise[]>,
  dateKey: string
): { done: number; total: number; percent: number | null } {
  let done = 0;
  let total = 0;
  for (const session of daySessions(sessions, dateKey)) {
    const rows = session.id ? exercisesBySession[session.id] || [] : [];
    total += rows.length;
    done += rows.filter((exercise) => exercise.status === 'done').length;
  }
  if (total === 0) return { done: 0, total: 0, percent: null };
  return { done, total, percent: Math.round((done / total) * 100) };
}

function statusMark(status: TrainingSessionExercise['status']): { label: string; className: string } {
  if (status === 'done') return { label: 'Feito', className: 'bg-emerald-500 text-white' };
  if (status === 'skipped') return { label: 'Pulou', className: 'bg-red-500 text-white' };
  return { label: 'Não feito', className: 'bg-gray-200 text-gray-600' };
}

function patientAge(paciente: PacienteCompleto): number | null {
  const raw = paciente.dadosIdentificacao?.dataNascimento as unknown;
  let date: Date | null = null;
  if (raw instanceof Date) date = raw;
  else if (typeof raw === 'string' || typeof raw === 'number') {
    const parsed = new Date(raw);
    date = Number.isNaN(parsed.getTime()) ? null : parsed;
  } else if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: unknown }).toDate === 'function') {
    date = (raw as { toDate: () => Date }).toDate();
  } else if (raw && typeof raw === 'object' && 'seconds' in raw) {
    date = new Date(Number((raw as { seconds: number }).seconds) * 1000);
  }
  if (!date || Number.isNaN(date.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - date.getFullYear();
  if (hoje.getMonth() < date.getMonth() || (hoje.getMonth() === date.getMonth() && hoje.getDate() < date.getDate())) {
    idade -= 1;
  }
  return idade > 0 ? idade : null;
}

function sessionPresentation(
  session: TrainingSession,
  rows: TrainingSessionExercise[]
): { label: string; className: string } {
  if (session.status === 'done') return { label: 'Concluída', className: 'bg-emerald-50 text-emerald-700' };
  if (session.status === 'skipped') return { label: 'Pulada', className: 'bg-red-50 text-red-600' };
  const done = rows.filter((exercise) => exercise.status === 'done').length;
  if (rows.length > 0 && done > 0 && done < rows.length) {
    return { label: 'Parcial', className: 'bg-orange-50 text-orange-700' };
  }
  return { label: 'Não concluída', className: 'bg-gray-100 text-gray-600' };
}

function ExerciseThumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-300">
        <Dumbbell className="h-5 w-5" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      className="h-12 w-12 shrink-0 rounded-xl bg-gray-50 object-contain"
    />
  );
}

export function MetapersonalPacienteHistoricoModal({ open, paciente, onClose }: Props) {
  const [portalReady, setPortalReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [exercisesBySession, setExercisesBySession] = useState<Record<string, TrainingSessionExercise[]>>({});
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [mediaByExercise, setMediaByExercise] = useState<Record<string, ExerciseGymMedia | null>>({});
  const [video, setVideo] = useState<ExerciseGymMedia | null>(null);
  const [view, setView] = useState<'mes' | 'semana'>('semana');
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(() => new Date());
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriodDays>(90);
  const [stats, setStats] = useState<TrainingStatsDataset | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [collapsedSessions, setCollapsedSessions] = useState<{ key: string; ids: string[] }>({ key: '', ids: [] });

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (video) {
        setVideo(null);
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, video]);

  useEffect(() => {
    if (!open) return;
    const signal = { cancelled: false };
    setLoading(true);
    setSessions([]);
    setExercisesBySession({});
    setMediaByExercise({});
    setVideo(null);
    setSelectedDay(new Date());
    setWeekAnchor(new Date());
    setMonthAnchor(new Date());
    void (async () => {
      const end = new Date();
      const start = addDays(end, -365);
      const startDate = toLocalKey(start);
      const endDate = toLocalKey(end);
      const byId = new Map<string, TrainingSession>();
      for (const lookupId of sessionLookupIds(paciente)) {
        if (signal.cancelled) return;
        try {
          const found = await trainingSessionService.getPatientSessionsInDateRange(lookupId, startDate, endDate);
          for (const session of found) {
            if (session.id && isTrainingSessionActive(session)) byId.set(session.id, session);
          }
        } catch {
          /* tenta o próximo identificador */
        }
      }
      if (signal.cancelled) return;
      setSessions(Array.from(byId.values()));
      setLoading(false);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open, paciente]);

  useEffect(() => {
    if (!open) return;
    const signal = { cancelled: false };
    setLoadingStats(true);
    void (async () => {
      let chosen: TrainingStatsDataset | null = null;
      for (const lookupId of sessionLookupIds(paciente)) {
        if (signal.cancelled) return;
        try {
          const dataset = await PersonalTrainingStatsService.loadDataset(lookupId, statsPeriod);
          if (!chosen || dataset.completion.programmed > chosen.completion.programmed) chosen = dataset;
          if (dataset.completion.programmed > 0) break;
        } catch {
          /* tenta o próximo identificador */
        }
      }
      if (signal.cancelled) return;
      setStats(chosen);
      setLoadingStats(false);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open, paciente, statsPeriod]);

  const visibleRange = useMemo(() => {
    if (view === 'semana') {
      const start = startOfWeek(weekAnchor);
      return { startDate: toLocalKey(start), endDate: toLocalKey(addDays(start, 6)) };
    }
    const year = monthAnchor.getFullYear();
    const month = monthAnchor.getMonth();
    const last = new Date(year, month + 1, 0).getDate();
    return {
      startDate: toLocalKey(new Date(year, month, 1)),
      endDate: toLocalKey(new Date(year, month, last)),
    };
  }, [view, weekAnchor, monthAnchor]);

  useEffect(() => {
    if (!open) return;
    const missing = sessions.filter(
      (session) =>
        session.id &&
        session.scheduledDate >= visibleRange.startDate &&
        session.scheduledDate <= visibleRange.endDate &&
        !Object.prototype.hasOwnProperty.call(exercisesBySession, session.id)
    );
    if (missing.length === 0) return;
    const signal = { cancelled: false };
    setLoadingExercises(true);
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (session) => {
          const id = session.id as string;
          try {
            const rows = await trainingSessionService.getSessionExercises(id);
            return [id, rows] as const;
          } catch {
            return [id, [] as TrainingSessionExercise[]] as const;
          }
        })
      );
      if (signal.cancelled) return;
      setExercisesBySession((prev) => {
        const next = { ...prev };
        for (const [id, rows] of entries) next[id] = rows;
        return next;
      });
      setLoadingExercises(false);
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open, sessions, visibleRange.startDate, visibleRange.endDate, exercisesBySession]);

  const visibleExerciseIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) {
      if (!session.id) continue;
      if (session.scheduledDate < visibleRange.startDate || session.scheduledDate > visibleRange.endDate) continue;
      for (const exercise of exercisesBySession[session.id] || []) {
        const exerciseId = String(exercise.exerciseId || '').trim();
        if (exerciseId) ids.add(exerciseId);
      }
    }
    return Array.from(ids);
  }, [sessions, exercisesBySession, visibleRange.startDate, visibleRange.endDate]);

  useEffect(() => {
    if (!open) return;
    const userIds = mediaUserIds(paciente);
    const missing = visibleExerciseIds.filter(
      (id) => !Object.prototype.hasOwnProperty.call(mediaByExercise, id)
    );
    if (userIds.length === 0 || missing.length === 0) return;
    const signal = { cancelled: false };
    void (async () => {
      const entries = await Promise.all(
        missing.map(async (exerciseId) => {
          for (const userId of userIds) {
            try {
              const media = await exerciseGymMediaService.get(userId, exerciseId);
              if (media && gymMediaBelongsToPatient(media, paciente)) return [exerciseId, media] as const;
            } catch {
              /* tenta o próximo identificador */
            }
          }
          return [exerciseId, null] as const;
        })
      );
      if (signal.cancelled) return;
      setMediaByExercise((prev) => {
        const next = { ...prev };
        for (const [id, media] of entries) next[id] = media;
        return next;
      });
    })();
    return () => {
      signal.cancelled = true;
    };
  }, [open, paciente, visibleExerciseIds, mediaByExercise]);

  if (!open || !portalReady) return null;

  const today = new Date();
  const selectedKey = selectedDay ? toLocalKey(selectedDay) : toLocalKey(today);
  const selectedSessions = daySessions(sessions, selectedKey);
  const selectedProgress = dayProgress(sessions, exercisesBySession, selectedKey);
  const weekStart = startOfWeek(weekAnchor);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthCells: Array<Date | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ];
  const calendarTitle =
    view === 'semana'
      ? `${weekDays[0].toLocaleDateString('pt-BR')} – ${weekDays[6].toLocaleDateString('pt-BR')}`
      : monthAnchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const renderDay = (day: Date) => {
    const key = toLocalKey(day);
    const selected = selectedDay ? sameDay(day, selectedDay) : false;
    const isToday = sameDay(day, today);
    const progress = dayProgress(sessions, exercisesBySession, key);
    const hasWorkout = daySessions(sessions, key).length > 0;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelectedDay(day)}
        aria-pressed={selected}
        className={`flex min-h-[4.25rem] flex-col items-center justify-center rounded-xl border px-1 py-1.5 text-sm font-semibold tabular-nums ${
          selected
            ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
            : isToday
              ? 'border-emerald-200 bg-white text-emerald-700'
              : hasWorkout
                ? 'border-gray-200 bg-white text-gray-800 hover:border-emerald-300'
                : 'border-transparent bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        <span>{day.getDate()}</span>
        {progress.percent != null ? (
          <span className={`mt-0.5 text-[10px] font-bold ${progress.percent > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {progress.percent}%
          </span>
        ) : hasWorkout ? (
          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        ) : (
          <span className="mt-1 h-1.5 w-1.5" aria-hidden />
        )}
      </button>
    );
  };

  const rate =
    stats?.completion.completionRatePercent == null
      ? '—'
      : `${Math.round(stats.completion.completionRatePercent)}%`;
  const maxWeek = Math.max(1, ...(stats?.weeklyCompleted || []).map((week) => week.completed));
  const age = patientAge(paciente);
  const seriesRatio = stats && stats.series.total > 0 ? Math.round((stats.series.done / stats.series.total) * 100) : 0;
  const selectedDateLabel = selectedDay
    ? selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Dia';
  const sessionExpanded = (sessionId: string) =>
    collapsedSessions.key !== selectedKey || !collapsedSessions.ids.includes(sessionId);
  const toggleSession = (sessionId: string) => {
    setCollapsedSessions((prev) => {
      const ids = prev.key === selectedKey ? prev.ids : [];
      return {
        key: selectedKey,
        ids: ids.includes(sessionId) ? ids.filter((id) => id !== sessionId) : [...ids, sessionId],
      };
    });
  };
  const shiftCalendar = (direction: -1 | 1) => {
    if (view === 'semana') setWeekAnchor(addDays(weekAnchor, direction * 7));
    else setMonthAnchor(new Date(year, month + direction, 1));
  };
  const renderDesktopDay = (day: Date) => {
    const key = toLocalKey(day);
    const selected = selectedDay ? sameDay(day, selectedDay) : false;
    const isToday = sameDay(day, today);
    const progress = dayProgress(sessions, exercisesBySession, key);
    const hasWorkout = daySessions(sessions, key).length > 0;
    const tone = !hasWorkout
      ? 'empty'
      : progress.percent == null || progress.percent === 0
        ? 'open'
        : progress.percent >= 100
          ? 'done'
          : 'partial';
    const toneClass =
      tone === 'done'
        ? 'border-transparent bg-emerald-50 text-emerald-800'
        : tone === 'partial'
          ? 'border-transparent bg-orange-50 text-orange-800'
          : tone === 'open'
            ? 'border-transparent bg-gray-50 text-gray-500'
            : 'border-transparent bg-white text-gray-700 hover:bg-gray-50';
    const dot =
      tone === 'done' ? 'bg-emerald-500' : tone === 'partial' ? 'bg-orange-400' : tone === 'open' ? 'bg-gray-300' : '';
    return (
      <button
        key={key}
        type="button"
        onClick={() => setSelectedDay(day)}
        aria-pressed={selected}
        className={`flex min-h-[3.15rem] flex-col items-center justify-center rounded-xl border px-1 py-1 text-sm font-semibold tabular-nums ${
          selected ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : toneClass
        } ${!selected && isToday ? 'ring-1 ring-emerald-200' : ''}`}
      >
        <span>{day.getDate()}</span>
        {dot ? <span className={`mt-1 h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden /> : <span className="mt-1 h-1.5 w-1.5" aria-hidden />}
      </button>
    );
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 lg:hidden" role="dialog" aria-modal="true" aria-label="Histórico do paciente">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Histórico</h2>
              <p className="mt-0.5 truncate text-sm text-gray-500">{patientName(paciente)}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-white px-5 py-4">
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Estatísticas do treino</h3>
                  <p className="mt-0.5 text-xs text-gray-500">Conclusão das sessões e das séries no período.</p>
                </div>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                  {STATS_PERIOD_OPTIONS.map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setStatsPeriod(days)}
                      className={`h-8 rounded-md px-3 text-xs font-semibold ${
                        statsPeriod === days ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      {days} dias
                    </button>
                  ))}
                </div>
              </div>
              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : !stats || stats.completion.programmed === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Ainda não há treinos suficientes neste período.</p>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { label: 'Concluídos', value: String(stats.completion.completed) },
                      { label: 'Taxa', value: rate },
                      { label: 'Séries feitas', value: stats.series.total > 0 ? String(stats.series.done) : '—' },
                      { label: 'Sessões', value: String(stats.completion.programmed) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {stats.completion.skipped} pulados · {stats.completion.scheduled} ainda sem conclusão
                    {stats.series.total > 0 ? ` · ${stats.series.done} de ${stats.series.total} séries` : ''}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-700">Treinos concluídos por semana</p>
                    <div className="mt-2 flex h-28 items-end gap-2">
                      {stats.weeklyCompleted.map((week) => {
                        const height = week.completed <= 0 ? 0 : (week.completed / maxWeek) * 100;
                        return (
                          <div key={`${week.startDate}-${week.endDate}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                            <p className="mb-1 text-center text-xs font-semibold tabular-nums text-gray-700">{week.completed}</p>
                            <div className="flex min-h-0 flex-1 items-end">
                              <div className="w-full rounded-t-md bg-emerald-500" style={{ height: `${height}%` }} />
                            </div>
                            <p className="mt-1 text-center text-[10px] leading-tight text-gray-500">{week.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">Treinos por dia</h3>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setView('semana')}
                    className={`h-8 rounded-md px-3 text-xs font-semibold ${view === 'semana' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
                  >
                    Semana
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('mes')}
                    className={`h-8 rounded-md px-3 text-xs font-semibold ${view === 'mes' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
                  >
                    Mês
                  </button>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (view === 'semana') setWeekAnchor(addDays(weekAnchor, -7));
                    else setMonthAnchor(new Date(year, month - 1, 1));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                  aria-label="Período anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-gray-900">{calendarTitle}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (view === 'semana') setWeekAnchor(addDays(weekAnchor, 7));
                    else setMonthAnchor(new Date(year, month + 1, 1));
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                  aria-label="Próximo período"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <span key={label} className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </span>
                ))}
                {view === 'semana'
                  ? weekDays.map(renderDay)
                  : monthCells.map((day, index) => (day ? renderDay(day) : <span key={`empty-${index}`} aria-hidden />))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400">A porcentagem é a parte dos exercícios do dia marcada como feita.</p>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold capitalize text-gray-900">
                    {selectedDay
                      ? selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
                      : 'Dia'}
                  </h3>
                  {selectedProgress.percent != null ? (
                    <p className="mt-0.5 text-xs text-gray-500">
                      {selectedProgress.percent}% treinado · {selectedProgress.done} de {selectedProgress.total} exercícios
                    </p>
                  ) : null}
                </div>
                {selectedProgress.percent != null ? (
                  <span className="rounded-full bg-orange-50 px-2.5 py-1 text-sm font-bold tabular-nums text-orange-700">
                    {selectedProgress.percent}%
                  </span>
                ) : null}
              </div>
              {selectedProgress.percent != null ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedProgress.percent}%` }} />
                </div>
              ) : null}

              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : selectedSessions.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">Nenhum treino neste dia.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedSessions.map((session) => {
                    const rows = session.id ? exercisesBySession[session.id] || [] : [];
                    return (
                      <article key={session.id || session.scheduledDate} className="rounded-xl border border-gray-200">
                        <div className="border-b border-gray-100 px-3 py-2.5">
                          <p className="font-semibold text-gray-900">{session.title || 'Treino'}</p>
                          <p className="text-xs text-gray-500">
                            {session.status === 'done' ? 'Sessão feita' : session.status === 'skipped' ? 'Sessão pulada' : 'Sessão agendada'}
                          </p>
                        </div>
                        {loadingExercises && rows.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-gray-500">Carregando exercícios…</p>
                        ) : rows.length === 0 ? (
                          <p className="px-3 py-3 text-xs text-gray-500">Nenhum exercício neste treino.</p>
                        ) : (
                          <ul>
                            {rows.map((exercise, index) => {
                              const mark = statusMark(exercise.status);
                              const exerciseId = String(exercise.exerciseId || '').trim();
                              const media = exerciseId ? mediaByExercise[exerciseId] : null;
                              const hasVideo = media?.kind === 'video' && Boolean(media.url);
                              return (
                                <li key={exercise.id || `${exerciseId}-${index}`} className={index > 0 ? 'border-t border-gray-100' : ''}>
                                  <button
                                    type="button"
                                    disabled={!hasVideo}
                                    onClick={() => {
                                      if (hasVideo && media) setVideo(media);
                                    }}
                                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                                      hasVideo ? 'hover:bg-emerald-50' : 'cursor-default'
                                    }`}
                                  >
                                    <span
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${mark.className}`}
                                      title={mark.label}
                                    >
                                      {exercise.status === 'done' ? '✓' : exercise.status === 'skipped' ? '✗' : '—'}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-medium text-gray-900">
                                        {translateExerciseName(exercise.name)}
                                      </span>
                                      <span className="block text-xs text-gray-500">
                                        {mark.label}
                                        {exercise.prescription ? ` · ${formatTrainingSeriesSummary(exercise.prescription)}` : ''}
                                      </span>
                                    </span>
                                    {hasVideo ? (
                                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white">
                                        <Play className="h-3 w-3" />
                                        Vídeo
                                      </span>
                                    ) : null}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <div className="fixed inset-0 z-[120] hidden items-center justify-center p-4 lg:flex" role="dialog" aria-modal="true" aria-label="Histórico de treinamento">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
        <div className="relative z-10 flex max-h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.16)]">
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-100 px-6 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Dumbbell className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold tracking-tight text-gray-900">Histórico de treinamento</h2>
                <p className="truncate text-sm text-gray-500">
                  {patientName(paciente)}
                  {age != null ? ` · ${age} anos` : ''}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <div className="inline-flex rounded-xl bg-gray-100 p-1">
                {STATS_PERIOD_OPTIONS.map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setStatsPeriod(days)}
                    className={`h-9 rounded-lg px-3.5 text-sm font-semibold ${
                      statsPeriod === days ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
              <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,0.48fr)_minmax(0,0.52fr)]">
            <div className="min-h-0 space-y-4 overflow-y-auto border-r border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Visão geral</h3>
                <p className="mt-0.5 text-xs text-gray-500">Conclusão das sessões e das séries no período.</p>
              </div>
              {loadingStats ? (
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-[108px] animate-pulse rounded-2xl bg-gray-50" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <article className="rounded-2xl bg-emerald-50 px-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-emerald-600">
                      <Target className="h-4 w-4" />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold text-emerald-800">Adesão</p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{stats ? rate : '—'}</p>
                  </article>
                  <article className="rounded-2xl bg-blue-50 px-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-blue-600">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold text-blue-800">Concluídos</p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{stats ? stats.completion.completed : '—'}</p>
                    <p className="text-[11px] text-blue-700/80">
                      {stats && stats.completion.programmed > 0 ? `de ${stats.completion.programmed} programadas` : 'no período'}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-violet-50 px-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-violet-600">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold text-violet-800">Sessões</p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900">{stats ? stats.completion.programmed : '—'}</p>
                    <p className="text-[11px] text-violet-700/80">programadas</p>
                  </article>
                  <article className="rounded-2xl bg-orange-50 px-3 py-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-orange-600">
                      <Layers className="h-4 w-4" />
                    </span>
                    <p className="mt-2 text-[11px] font-semibold text-orange-800">Séries feitas</p>
                    <p className="text-2xl font-bold tabular-nums text-gray-900">
                      {stats && stats.series.total > 0 ? stats.series.done : '—'}
                    </p>
                    <p className="text-[11px] text-orange-700/80">
                      {stats && stats.series.total > 0 ? `de ${stats.series.total} previstas` : 'sem séries no período'}
                    </p>
                    {stats && stats.series.total > 0 ? (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
                        <div className="h-full rounded-full bg-orange-400" style={{ width: `${seriesRatio}%` }} />
                      </div>
                    ) : null}
                  </article>
                </div>
              )}
              {!loadingStats && (!stats || stats.completion.programmed === 0) ? (
                <p className="text-sm text-gray-500">Ainda não há treinos suficientes neste período.</p>
              ) : null}

              <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Evolução semanal</h3>
                <p className="mt-0.5 text-xs text-gray-500">Treinos concluídos por semana</p>
                {loadingStats ? (
                  <div className="mt-4 flex h-36 items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                  </div>
                ) : (
                  <div className="relative mt-4 h-40">
                    <div className="pointer-events-none absolute inset-x-0 top-5 bottom-6 flex flex-col justify-between">
                      <span className="border-t border-gray-100" />
                      <span className="border-t border-gray-100" />
                      <span className="border-t border-gray-100" />
                      <span className="border-t border-gray-100" />
                    </div>
                    <div className="relative flex h-full items-end gap-3">
                      {(stats?.weeklyCompleted || []).map((week) => {
                        const height = week.completed <= 0 ? 0 : (week.completed / maxWeek) * 100;
                        return (
                          <div key={`${week.startDate}-${week.endDate}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                            <p className="mb-1 text-center text-xs font-semibold tabular-nums text-gray-700">{week.completed}</p>
                            <div className="flex min-h-0 flex-1 items-end">
                              <div className="w-full rounded-t-lg bg-emerald-500" style={{ height: `${height}%` }} />
                            </div>
                            <p className="mt-2 text-center text-[10px] leading-tight text-gray-500">{week.label}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">Calendário de treinos</h3>
                  <div className="inline-flex rounded-xl bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setView('semana')}
                      className={`h-8 rounded-lg px-3 text-xs font-semibold ${view === 'semana' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setView('mes')}
                      className={`h-8 rounded-lg px-3 text-xs font-semibold ${view === 'mes' ? 'bg-emerald-500 text-white' : 'text-gray-600'}`}
                    >
                      Mês
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => shiftCalendar(-1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                    aria-label="Período anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="min-w-0 truncate text-center text-sm font-semibold capitalize text-gray-900">{calendarTitle}</p>
                  <button
                    type="button"
                    onClick={() => shiftCalendar(1)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50"
                    aria-label="Próximo período"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </span>
                  ))}
                  {view === 'semana'
                    ? weekDays.map(renderDesktopDay)
                    : monthCells.map((day, index) => (day ? renderDesktopDay(day) : <span key={`desk-empty-${index}`} aria-hidden />))}
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  Verde é dia com exercícios feitos. Laranja é parcial. Cinza tem treino sem conclusão. Dia sem treino não conta como falta.
                </p>
              </section>
            </div>

            <div className="min-h-0 overflow-y-auto px-6 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold capitalize text-gray-900">{selectedDateLabel}</h3>
                  {selectedProgress.percent != null ? (
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedProgress.percent}% treinado · {selectedProgress.done} de {selectedProgress.total} exercícios
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-500">Selecione um dia com treino para ver os exercícios.</p>
                  )}
                </div>
                {selectedProgress.percent != null ? (
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${
                      selectedProgress.percent >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {selectedProgress.percent}%
                  </span>
                ) : null}
              </div>
              {selectedProgress.percent != null ? (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${selectedProgress.percent}%` }} />
                </div>
              ) : (
                <div className="mt-3 h-2 rounded-full bg-gray-100" />
              )}

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                </div>
              ) : selectedSessions.length === 0 ? (
                <p className="mt-8 text-sm text-gray-500">Nenhum treino neste dia.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {selectedSessions.map((session) => {
                    const rows = session.id ? exercisesBySession[session.id] || [] : [];
                    const sessionId = session.id || session.scheduledDate;
                    const openSession = sessionExpanded(sessionId);
                    const badge = sessionPresentation(session, rows);
                    return (
                      <article key={sessionId} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <button
                          type="button"
                          onClick={() => toggleSession(sessionId)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left"
                          aria-expanded={openSession}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <Dumbbell className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-gray-900">{session.title || 'Treino'}</span>
                            <span className="block text-xs text-gray-500">
                              {rows.length} exercício{rows.length === 1 ? '' : 's'}
                            </span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${openSession ? 'rotate-180' : ''}`} />
                        </button>
                        {openSession ? (
                          loadingExercises && rows.length === 0 ? (
                            <p className="border-t border-gray-100 px-4 py-4 text-xs text-gray-500">Carregando exercícios…</p>
                          ) : rows.length === 0 ? (
                            <p className="border-t border-gray-100 px-4 py-4 text-xs text-gray-500">Nenhum exercício neste treino.</p>
                          ) : (
                            <ul className="border-t border-gray-100">
                              {rows.map((exercise, index) => {
                                const mark = statusMark(exercise.status);
                                const exerciseId = String(exercise.exerciseId || '').trim();
                                const media = exerciseId ? mediaByExercise[exerciseId] : null;
                                const hasVideo = media?.kind === 'video' && Boolean(media.url);
                                return (
                                  <li
                                    key={exercise.id || `${exerciseId}-${index}`}
                                    className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-gray-50' : ''}`}
                                  >
                                    <span
                                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${mark.className}`}
                                      title={mark.label}
                                    >
                                      {exercise.status === 'done' ? <Check className="h-3.5 w-3.5" /> : exercise.status === 'skipped' ? '✗' : '—'}
                                    </span>
                                    <ExerciseThumb src={exercise.gifUrl} />
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-gray-900">
                                        {translateExerciseName(exercise.name)}
                                      </span>
                                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                                        {exercise.prescription ? formatTrainingSeriesSummary(exercise.prescription) : 'Sem prescrição'}
                                      </span>
                                    </span>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                        exercise.status === 'done'
                                          ? 'bg-emerald-50 text-emerald-700'
                                          : exercise.status === 'skipped'
                                            ? 'bg-red-50 text-red-600'
                                            : 'bg-gray-100 text-gray-500'
                                      }`}
                                    >
                                      {mark.label}
                                    </span>
                                    {hasVideo ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (media) setVideo(media);
                                        }}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
                                      >
                                        <Play className="h-3 w-3" />
                                        Vídeo
                                      </button>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {video ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-6"
          onClick={() => setVideo(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vídeo do paciente"
        >
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <video src={video.url} controls autoPlay playsInline className="max-h-[80vh] w-full rounded-xl bg-black" />
          </div>
        </div>
      ) : null}
    </>,
    document.body
  );
}
