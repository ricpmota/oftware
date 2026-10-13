/**
 * Analytics de leitura da carteira do personal (Histórico & Estatísticas).
 * Reutiliza getSessionCompletionState / shouldCountSessionInStats.
 * Não inventa métricas e não mistura trainingSessionExecutions.
 */

import {
  addDaysYmd,
  getSessionCompletionState,
  statsPeriodRange,
  toLocalYYYYMMDD,
  type SessionCompletionState,
} from '@/lib/personal/trainingStats';
import {
  isTrainingSessionActive,
  shouldCountSessionInStats,
} from '@/lib/personal/trainingSessionActive';
import {
  mondayYYYYMMDD,
  weekRangeFromMonday,
  weekdayFromDateStr,
} from '@/lib/metapersonal/treinosWeek';
import { TREINOS_WEEKDAYS, TREINOS_WEEKDAY_LABELS } from '@/components/metapersonal/treinos/treinosCentral.types';
import type { TreinosWeekday } from '@/components/metapersonal/treinos/treinosCentral.types';
import type { TrainingSession, TrainingSessionExercise } from '@/types/trainingSession';
import {
  HISTORY_ATTENTION_THRESHOLDS,
  HISTORY_CONSISTENCY_STATUSES,
  HISTORY_EVOLUTION_SIGNIFICANT_POINTS,
  HISTORY_LAST_7_DAYS,
  HISTORY_PERFORMANCE_THRESHOLDS,
  HISTORY_STREAK_LOOKBACK_DAYS,
  type HistoryPeriodDays,
} from '@/lib/metapersonal/historicoThresholds';

export type HistoryPerformanceStatus =
  | 'excelente'
  | 'boa'
  | 'atencao'
  | 'critica'
  | 'sem-dados';

export type HistoryEvolutionTrend = 'up' | 'stable' | 'down' | 'unavailable';

export type HistorySessionKind = 'done' | 'missed' | 'scheduled' | 'inactive';

export type HistoryAttentionSeverity = 'alta' | 'media';

export type HistoryTableFilter =
  | 'todos'
  | 'excelente'
  | 'boa'
  | 'atencao'
  | 'critica'
  | 'sem-treino-recente';

export type HistoryChartMetric = 'adherence' | 'done';

export type HistorySessionInput = {
  session: TrainingSession;
  exercises: TrainingSessionExercise[];
};

export type ClassifiedHistorySession = {
  sessionId: string;
  scheduledDate: string;
  title: string;
  completion: SessionCompletionState;
  kind: HistorySessionKind;
  /** Entra no denominador de adesão (passado devido, ativo ou já terminal). */
  due: boolean;
  active: boolean;
  patientNotes?: string;
  trainerNotes?: string;
  completedAtIso: string | null;
};

export type HistoryAdherence = {
  done: number;
  missed: number;
  expected: number;
  percent: number | null;
};

export type HistoryWeekDayCell = {
  weekday: TreinosWeekday;
  label: string;
  date: string;
  kind: HistorySessionKind | 'empty';
  title: string | null;
};

export type HistoryNoteItem = {
  kind: 'patient' | 'trainer';
  date: string;
  title: string;
  text: string;
};

export type HistoryTimelineItem = {
  sessionId: string;
  scheduledDate: string;
  title: string;
  kind: HistorySessionKind;
};

export type HistoryAttentionItem = {
  patientKey: string;
  name: string;
  severity: HistoryAttentionSeverity;
  reasons: string[];
};

export type HistoryChartPoint = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  adherencePercent: number | null;
  done: number;
  expected: number;
};

export type HistoryPatientMetrics = {
  patientKey: string;
  patientUserId: string;
  pacienteId: string;
  name: string;
  photoUrl: string | null;
  personalName: string;
  adherence: HistoryAdherence;
  previousAdherence: HistoryAdherence;
  last7Days: { done: number; expected: number };
  streak: number | null;
  evolution: HistoryEvolutionTrend;
  evolutionDelta: number | null;
  lastWorkoutDate: string | null;
  lastWorkoutDaysAgo: number | null;
  lastWorkoutTime: string | null;
  status: HistoryPerformanceStatus;
  attention: HistoryAttentionItem | null;
  week: HistoryWeekDayCell[];
  insights: string[];
  notes: HistoryNoteItem[];
  timeline: HistoryTimelineItem[];
  consecutiveMisses: number;
};

export type HistoryKpis = {
  adherencePercent: number | null;
  adherenceDelta: number | null;
  doneCount: number;
  missedCount: number;
  attentionCount: number;
  consistencyPercent: number | null;
  consistencyDelta: number | null;
};

export type HistoryAnalyticsResult = {
  periodDays: HistoryPeriodDays;
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  loadStartDate: string;
  loadEndDate: string;
  today: string;
  kpis: HistoryKpis;
  attention: HistoryAttentionItem[];
  chart: HistoryChartPoint[];
  distribution: Record<HistoryPerformanceStatus, number>;
  patients: HistoryPatientMetrics[];
};

export type HistoryPatientIdentity = {
  pacienteId: string;
  patientUserId: string;
  name: string;
  photoUrl?: string | null;
};

function minYmd(a: string, b: string): string {
  return a <= b ? a : b;
}

function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

export function previousPeriodRange(
  currentStartDate: string,
  days: number
): { startDate: string; endDate: string } {
  const endDate = addDaysYmd(currentStartDate, -1);
  const startDate = addDaysYmd(endDate, -(Math.max(1, days) - 1));
  return { startDate, endDate };
}

export function historyLoadWindow(
  periodDays: number,
  now: Date = new Date()
): {
  today: string;
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  week: { startDate: string; endDate: string };
  last7: { startDate: string; endDate: string };
  loadStartDate: string;
  loadEndDate: string;
} {
  const today = toLocalYYYYMMDD(now);
  const current = statsPeriodRange(periodDays, now);
  const previous = previousPeriodRange(current.startDate, periodDays);
  const week = weekRangeFromMonday(mondayYYYYMMDD(now));
  const last7 = {
    startDate: addDaysYmd(today, -(HISTORY_LAST_7_DAYS - 1)),
    endDate: today,
  };
  const lookbackStart = addDaysYmd(today, -(HISTORY_STREAK_LOOKBACK_DAYS - 1));
  return {
    today,
    current,
    previous,
    week: { startDate: week.startDate, endDate: week.endDate },
    last7,
    loadStartDate: minYmd(
      minYmd(previous.startDate, lookbackStart),
      minYmd(week.startDate, last7.startDate)
    ),
    loadEndDate: maxYmd(current.endDate, week.endDate),
  };
}

function parseCompletedAt(value: Date | string | undefined | null): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  const looksLikeMidnightOnly =
    parsed.getHours() === 0 &&
    parsed.getMinutes() === 0 &&
    parsed.getSeconds() === 0 &&
    parsed.getMilliseconds() === 0 &&
    !text.includes('T');
  if (looksLikeMidnightOnly) return null;
  return parsed;
}

export function latestCompletionTimestamp(
  exercises: Array<Pick<TrainingSessionExercise, 'status' | 'completedAt'>>
): string | null {
  let latest: Date | null = null;
  for (const exercise of exercises) {
    if (exercise.status !== 'done') continue;
    const parsed = parseCompletedAt(exercise.completedAt);
    if (!parsed) continue;
    if (!latest || parsed.getTime() > latest.getTime()) latest = parsed;
  }
  return latest ? latest.toISOString() : null;
}

export function formatTimeHm(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    return null;
  }
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  const from = new Date(fy, (fm || 1) - 1, fd || 1);
  const to = new Date(ty, (tm || 1) - 1, td || 1);
  return Math.round((to.getTime() - from.getTime()) / 86400000);
}

export function classifyHistorySession(
  session: Pick<TrainingSession, 'id' | 'status' | 'active' | 'scheduledDate' | 'title' | 'patientNotes' | 'trainerNotes'>,
  exercises: Array<Pick<TrainingSessionExercise, 'status' | 'completedAt'>>,
  today: string
): ClassifiedHistorySession {
  const completion = getSessionCompletionState(session, exercises);
  const active = isTrainingSessionActive(session);
  const counted = shouldCountSessionInStats(session, completion);
  let kind: HistorySessionKind = 'scheduled';
  let due = false;

  if (!counted) {
    kind = 'inactive';
  } else if (completion === 'done') {
    kind = 'done';
    due = session.scheduledDate <= today;
  } else if (completion === 'skipped') {
    if (session.scheduledDate <= today) {
      kind = 'missed';
      due = true;
    } else {
      kind = 'scheduled';
    }
  } else if (session.scheduledDate < today) {
    kind = 'missed';
    due = true;
  } else {
    kind = 'scheduled';
  }

  return {
    sessionId: session.id || '',
    scheduledDate: session.scheduledDate,
    title: session.title,
    completion,
    kind,
    due,
    active,
    patientNotes: session.patientNotes?.trim() || undefined,
    trainerNotes: session.trainerNotes?.trim() || undefined,
    completedAtIso: completion === 'done' ? latestCompletionTimestamp(exercises) : null,
  };
}

export function inDateRange(
  scheduledDate: string,
  startDate: string,
  endDate: string
): boolean {
  return scheduledDate >= startDate && scheduledDate <= endDate;
}

export function calculateAdherence(
  sessions: Array<Pick<ClassifiedHistorySession, 'due' | 'kind'>>
): HistoryAdherence {
  const due = sessions.filter((item) => item.due);
  const done = due.filter((item) => item.kind === 'done').length;
  const missed = due.filter((item) => item.kind === 'missed').length;
  const expected = done + missed;
  return {
    done,
    missed,
    expected,
    percent: expected > 0 ? (done / expected) * 100 : null,
  };
}

export function getPatientPerformanceStatus(
  adherencePercent: number | null
): HistoryPerformanceStatus {
  if (adherencePercent == null) return 'sem-dados';
  if (adherencePercent >= HISTORY_PERFORMANCE_THRESHOLDS.excelenteMin) return 'excelente';
  if (adherencePercent >= HISTORY_PERFORMANCE_THRESHOLDS.boaMin) return 'boa';
  if (adherencePercent >= HISTORY_PERFORMANCE_THRESHOLDS.atencaoMin) return 'atencao';
  return 'critica';
}

export function getEvolutionTrend(
  currentPercent: number | null,
  previousPercent: number | null,
  significantPoints = HISTORY_EVOLUTION_SIGNIFICANT_POINTS
): HistoryEvolutionTrend {
  if (currentPercent == null || previousPercent == null) return 'unavailable';
  const delta = currentPercent - previousPercent;
  if (Math.abs(delta) < significantPoints) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

export function calculateStreak(
  sessions: Array<Pick<ClassifiedHistorySession, 'due' | 'kind' | 'scheduledDate' | 'sessionId'>>
): number | null {
  const due = sessions
    .filter((item) => item.due)
    .sort((a, b) => {
      const byDate = b.scheduledDate.localeCompare(a.scheduledDate);
      if (byDate !== 0) return byDate;
      return b.sessionId.localeCompare(a.sessionId);
    });
  if (due.length === 0) return null;
  let streak = 0;
  for (const item of due) {
    if (item.kind !== 'done') break;
    streak += 1;
  }
  return streak;
}

export function consecutiveMisses(
  sessions: Array<Pick<ClassifiedHistorySession, 'due' | 'kind' | 'scheduledDate' | 'sessionId'>>
): number {
  const due = sessions
    .filter((item) => item.due)
    .sort((a, b) => {
      const byDate = b.scheduledDate.localeCompare(a.scheduledDate);
      if (byDate !== 0) return byDate;
      return b.sessionId.localeCompare(a.sessionId);
    });
  let count = 0;
  for (const item of due) {
    if (item.kind !== 'missed') break;
    count += 1;
  }
  return count;
}

export function lastCompletedSession(
  sessions: Array<Pick<ClassifiedHistorySession, 'kind' | 'scheduledDate' | 'completedAtIso'>>
): { scheduledDate: string; completedAtIso: string | null } | null {
  const done = sessions
    .filter((item) => item.kind === 'done')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const first = done[0];
  if (!first) return null;
  return { scheduledDate: first.scheduledDate, completedAtIso: first.completedAtIso };
}

export function formatLastWorkoutLabel(
  lastDate: string | null,
  today: string
): string {
  if (!lastDate) return 'Nunca';
  const days = daysBetween(lastDate, today);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return `${days} dias`;
}

export function formatDayMonth(ymd: string): string {
  const [, m, d] = ymd.split('-');
  if (!m || !d) return ymd;
  return `${d}/${m}`;
}

function percentDelta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  return current - previous;
}

export function roundPercent(value: number | null): number | null {
  if (value == null) return null;
  return Math.round(value);
}

export function buildWeekCells(
  sessions: ClassifiedHistorySession[],
  weekStart: string,
  weekEnd: string
): HistoryWeekDayCell[] {
  const byDate = new Map<string, ClassifiedHistorySession[]>();
  for (const session of sessions) {
    if (!inDateRange(session.scheduledDate, weekStart, weekEnd)) continue;
    const list = byDate.get(session.scheduledDate) ?? [];
    list.push(session);
    byDate.set(session.scheduledDate, list);
  }
  return TREINOS_WEEKDAYS.map((weekday) => {
    const offset = TREINOS_WEEKDAYS.indexOf(weekday);
    const date = addDaysYmd(weekStart, offset);
    const daySessions = byDate.get(date) ?? [];
    const ranked = [...daySessions].sort((a, b) => {
      const rank = (kind: HistorySessionKind) =>
        kind === 'done' ? 0 : kind === 'missed' ? 1 : kind === 'scheduled' ? 2 : 3;
      return rank(a.kind) - rank(b.kind);
    });
    const primary = ranked[0];
    return {
      weekday,
      label: TREINOS_WEEKDAY_LABELS[weekday].short,
      date,
      kind: primary?.kind ?? 'empty',
      title: primary?.title ?? null,
    };
  });
}

export function buildPatientInsights(input: {
  adherence: HistoryAdherence;
  previousAdherence: HistoryAdherence;
  streak: number | null;
  consecutiveMisses: number;
  lastWorkoutDaysAgo: number | null;
  lastWorkoutDate: string | null;
}): string[] {
  const insights: string[] = [];
  if (input.adherence.expected > 0) {
    insights.push(
      `Realizou ${input.adherence.done} dos ${input.adherence.expected} treinos programados no período.`
    );
  }
  const delta = percentDelta(input.adherence.percent, input.previousAdherence.percent);
  if (delta != null) {
    const rounded = Math.round(Math.abs(delta));
    if (rounded > 0) {
      insights.push(
        delta > 0
          ? `Adesão aumentou ${rounded}% em relação ao período anterior.`
          : `Adesão caiu ${rounded}% em relação ao período anterior.`
      );
    }
  }
  if (input.streak && input.streak > 0) {
    insights.push(
      input.streak === 1
        ? '1 sessão consecutiva realizada.'
        : `${input.streak} sessões consecutivas realizadas.`
    );
  }
  if (input.consecutiveMisses >= 2) {
    insights.push(
      `${input.consecutiveMisses} treinos consecutivos não realizados.`
    );
  }
  if (input.lastWorkoutDate && input.lastWorkoutDaysAgo != null && input.lastWorkoutDaysAgo > 0) {
    insights.push(
      input.lastWorkoutDaysAgo === 1
        ? 'Está há 1 dia sem realizar um treino.'
        : `Está há ${input.lastWorkoutDaysAgo} dias sem realizar um treino.`
    );
  }
  if (!input.lastWorkoutDate && input.adherence.expected > 0) {
    insights.push('Nenhum treino realizado no histórico carregado.');
  }
  return insights.slice(0, 4);
}

export function buildRecentNotes(sessions: ClassifiedHistorySession[]): HistoryNoteItem[] {
  const items: HistoryNoteItem[] = [];
  const sorted = [...sessions].sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  for (const session of sorted) {
    if (session.patientNotes) {
      items.push({
        kind: 'patient',
        date: session.scheduledDate,
        title: session.title,
        text: session.patientNotes,
      });
    }
    if (session.trainerNotes) {
      items.push({
        kind: 'trainer',
        date: session.scheduledDate,
        title: session.title,
        text: session.trainerNotes,
      });
    }
  }
  return items.slice(0, 6);
}

export function buildTimeline(
  sessions: ClassifiedHistorySession[],
  startDate: string,
  endDate: string
): HistoryTimelineItem[] {
  return sessions
    .filter((item) => inDateRange(item.scheduledDate, startDate, endDate) && item.kind !== 'inactive')
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    .map((item) => ({
      sessionId: item.sessionId,
      scheduledDate: item.scheduledDate,
      title: item.title,
      kind: item.kind,
    }));
}

function attentionReasons(input: {
  status: HistoryPerformanceStatus;
  adherence: HistoryAdherence;
  previousAdherence: HistoryAdherence;
  consecutiveMisses: number;
  lastWorkoutDaysAgo: number | null;
  lastWorkoutDate: string | null;
}): { severity: HistoryAttentionSeverity; reasons: string[] } | null {
  if (input.status === 'sem-dados') return null;
  const reasons: string[] = [];
  let high = false;
  let medium = false;

  if (input.adherence.percent != null && input.adherence.percent < HISTORY_ATTENTION_THRESHOLDS.criticalAdherence) {
    high = true;
    reasons.push(`Adesão ${Math.round(input.adherence.percent)}%`);
  } else if (
    input.adherence.percent != null &&
    input.adherence.percent < HISTORY_ATTENTION_THRESHOLDS.warningAdherence
  ) {
    medium = true;
    reasons.push(`Adesão ${Math.round(input.adherence.percent)}%`);
  }

  if (input.consecutiveMisses >= HISTORY_ATTENTION_THRESHOLDS.consecutiveMissesHigh) {
    high = true;
    reasons.push(
      `${input.consecutiveMisses} treinos consecutivos não realizados`
    );
  }

  if (
    input.lastWorkoutDaysAgo != null &&
    input.lastWorkoutDaysAgo >= HISTORY_ATTENTION_THRESHOLDS.daysWithoutTrainingHigh &&
    input.adherence.expected > 0
  ) {
    high = true;
    reasons.push(`Último treino há ${input.lastWorkoutDaysAgo} dias`);
  } else if (!input.lastWorkoutDate && input.adherence.expected > 0) {
    high = true;
    reasons.push('Nenhum treino realizado');
  }

  const drop = percentDelta(input.adherence.percent, input.previousAdherence.percent);
  if (drop != null && drop <= -HISTORY_ATTENTION_THRESHOLDS.dropSignificantPoints) {
    medium = true;
    reasons.push(`Adesão caiu ${Math.round(Math.abs(drop))}%`);
  }

  if (!high && !medium) return null;
  const unique = Array.from(new Set(reasons));
  return {
    severity: high ? 'alta' : 'media',
    reasons: unique,
  };
}

export function buildPatientMetrics(input: {
  identity: HistoryPatientIdentity;
  personalName: string;
  sessions: ClassifiedHistorySession[];
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  last7: { startDate: string; endDate: string };
  week: { startDate: string; endDate: string };
  today: string;
}): HistoryPatientMetrics {
  const currentSessions = input.sessions.filter((item) =>
    inDateRange(item.scheduledDate, input.current.startDate, input.current.endDate)
  );
  const previousSessions = input.sessions.filter((item) =>
    inDateRange(item.scheduledDate, input.previous.startDate, input.previous.endDate)
  );
  const last7Sessions = input.sessions.filter((item) =>
    inDateRange(item.scheduledDate, input.last7.startDate, input.last7.endDate)
  );
  const adherence = calculateAdherence(currentSessions);
  const previousAdherence = calculateAdherence(previousSessions);
  const last7 = calculateAdherence(last7Sessions);
  const status = getPatientPerformanceStatus(adherence.percent);
  const streak = calculateStreak(input.sessions);
  const misses = consecutiveMisses(input.sessions);
  const last = lastCompletedSession(input.sessions);
  const lastWorkoutDaysAgo = last ? daysBetween(last.scheduledDate, input.today) : null;
  const evolution = getEvolutionTrend(adherence.percent, previousAdherence.percent);
  const attentionData = attentionReasons({
    status,
    adherence,
    previousAdherence,
    consecutiveMisses: misses,
    lastWorkoutDaysAgo,
    lastWorkoutDate: last?.scheduledDate ?? null,
  });

  return {
    patientKey: input.identity.patientUserId || input.identity.pacienteId,
    patientUserId: input.identity.patientUserId,
    pacienteId: input.identity.pacienteId,
    name: input.identity.name,
    photoUrl: input.identity.photoUrl ?? null,
    personalName: input.personalName,
    adherence,
    previousAdherence,
    last7Days: { done: last7.done, expected: last7.expected },
    streak,
    evolution,
    evolutionDelta: percentDelta(adherence.percent, previousAdherence.percent),
    lastWorkoutDate: last?.scheduledDate ?? null,
    lastWorkoutDaysAgo,
    lastWorkoutTime: formatTimeHm(last?.completedAtIso ?? null),
    status,
    attention: attentionData
      ? {
          patientKey: input.identity.patientUserId || input.identity.pacienteId,
          name: input.identity.name,
          severity: attentionData.severity,
          reasons: attentionData.reasons,
        }
      : null,
    week: buildWeekCells(input.sessions, input.week.startDate, input.week.endDate),
    insights: buildPatientInsights({
      adherence,
      previousAdherence,
      streak,
      consecutiveMisses: misses,
      lastWorkoutDaysAgo,
      lastWorkoutDate: last?.scheduledDate ?? null,
    }),
    notes: buildRecentNotes(input.sessions),
    timeline: buildTimeline(input.sessions, input.current.startDate, input.week.endDate),
    consecutiveMisses: misses,
  };
}

function startOfMonth(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function addMonthsYmd(ymd: string, months: number): string {
  const [y, m] = ymd.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1 + months, 1);
  return toLocalYYYYMMDD(date).slice(0, 8) + '01';
}

function monthEnd(ymd: string): string {
  const next = addMonthsYmd(ymd, 1);
  return addDaysYmd(next, -1);
}

function weekStartOnOrBefore(ymd: string): string {
  const weekday = weekdayFromDateStr(ymd);
  if (!weekday) return ymd;
  const offset = TREINOS_WEEKDAYS.indexOf(weekday);
  return addDaysYmd(ymd, -offset);
}

export function buildAdherenceChart(
  sessions: ClassifiedHistorySession[],
  periodDays: HistoryPeriodDays,
  startDate: string,
  endDate: string
): HistoryChartPoint[] {
  const points: HistoryChartPoint[] = [];
  if (periodDays <= 7) {
    let cursor = startDate;
    while (cursor <= endDate) {
      const daySessions = sessions.filter((item) => item.scheduledDate === cursor);
      const adherence = calculateAdherence(daySessions);
      points.push({
        key: cursor,
        label: formatDayMonth(cursor),
        startDate: cursor,
        endDate: cursor,
        adherencePercent: roundPercent(adherence.percent),
        done: adherence.done,
        expected: adherence.expected,
      });
      cursor = addDaysYmd(cursor, 1);
    }
    return points;
  }

  if (periodDays <= 90) {
    let cursor = weekStartOnOrBefore(startDate);
    let index = 1;
    while (cursor <= endDate) {
      const weekEnd = addDaysYmd(cursor, 6);
      const rangeStart = maxYmd(cursor, startDate);
      const rangeEnd = minYmd(weekEnd, endDate);
      const weekSessions = sessions.filter((item) =>
        inDateRange(item.scheduledDate, rangeStart, rangeEnd)
      );
      const adherence = calculateAdherence(weekSessions);
      points.push({
        key: cursor,
        label: `S${index}`,
        startDate: rangeStart,
        endDate: rangeEnd,
        adherencePercent: roundPercent(adherence.percent),
        done: adherence.done,
        expected: adherence.expected,
      });
      cursor = addDaysYmd(cursor, 7);
      index += 1;
    }
    return points;
  }

  let cursor = startOfMonth(startDate);
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  while (cursor <= endDate) {
    const rangeStart = maxYmd(cursor, startDate);
    const rangeEnd = minYmd(monthEnd(cursor), endDate);
    const monthSessions = sessions.filter((item) =>
      inDateRange(item.scheduledDate, rangeStart, rangeEnd)
    );
    const adherence = calculateAdherence(monthSessions);
    const monthIndex = Number(cursor.slice(5, 7)) - 1;
    points.push({
      key: cursor,
      label: monthNames[monthIndex] || cursor.slice(5, 7),
      startDate: rangeStart,
      endDate: rangeEnd,
      adherencePercent: roundPercent(adherence.percent),
      done: adherence.done,
      expected: adherence.expected,
    });
    cursor = addMonthsYmd(cursor, 1);
  }
  return points;
}

const STATUS_SORT: Record<HistoryPerformanceStatus, number> = {
  critica: 0,
  atencao: 1,
  boa: 2,
  excelente: 3,
  'sem-dados': 4,
};

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterHistoryPatients(
  patients: HistoryPatientMetrics[],
  filter: HistoryTableFilter,
  search: string
): HistoryPatientMetrics[] {
  const q = normalizeSearch(search);
  return patients.filter((patient) => {
    if (q && !normalizeSearch(patient.name).includes(q)) return false;
    if (filter === 'todos') return true;
    if (filter === 'sem-treino-recente') {
      return (
        patient.lastWorkoutDate == null ||
        (patient.lastWorkoutDaysAgo != null &&
          patient.lastWorkoutDaysAgo >= HISTORY_ATTENTION_THRESHOLDS.daysWithoutTrainingHigh)
      );
    }
    return patient.status === filter;
  });
}

export function sortHistoryPatients(
  patients: HistoryPatientMetrics[]
): HistoryPatientMetrics[] {
  return [...patients].sort((a, b) => {
    const byStatus = STATUS_SORT[a.status] - STATUS_SORT[b.status];
    if (byStatus !== 0) return byStatus;
    const aPct = a.adherence.percent ?? 101;
    const bPct = b.adherence.percent ?? 101;
    if (aPct !== bPct) return aPct - bPct;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function emptyDistribution(): Record<HistoryPerformanceStatus, number> {
  return {
    excelente: 0,
    boa: 0,
    atencao: 0,
    critica: 0,
    'sem-dados': 0,
  };
}

export function buildHistoryAnalytics(input: {
  periodDays: HistoryPeriodDays;
  personalName: string;
  patients: Array<{
    identity: HistoryPatientIdentity;
    sessions: HistorySessionInput[];
  }>;
  now?: Date;
}): HistoryAnalyticsResult {
  const now = input.now ?? new Date();
  const window = historyLoadWindow(input.periodDays, now);
  const classifiedByPatient = input.patients.map((patient) => {
    const classified = patient.sessions.map((item) =>
      classifyHistorySession(item.session, item.exercises, window.today)
    );
    return buildPatientMetrics({
      identity: patient.identity,
      personalName: input.personalName,
      sessions: classified,
      current: window.current,
      previous: window.previous,
      last7: window.last7,
      week: window.week,
      today: window.today,
    });
  });

  const patients = sortHistoryPatients(classifiedByPatient);
  const distribution = emptyDistribution();
  for (const patient of patients) {
    distribution[patient.status] += 1;
  }

  const currentDue = patients.reduce(
    (acc, patient) => {
      acc.done += patient.adherence.done;
      acc.missed += patient.adherence.missed;
      return acc;
    },
    { done: 0, missed: 0 }
  );
  const previousDue = patients.reduce(
    (acc, patient) => {
      acc.done += patient.previousAdherence.done;
      acc.missed += patient.previousAdherence.missed;
      return acc;
    },
    { done: 0, missed: 0 }
  );
  const currentExpected = currentDue.done + currentDue.missed;
  const previousExpected = previousDue.done + previousDue.missed;
  const adherencePercent = currentExpected > 0 ? (currentDue.done / currentExpected) * 100 : null;
  const previousAdherencePercent =
    previousExpected > 0 ? (previousDue.done / previousExpected) * 100 : null;

  const withData = patients.filter((item) => item.status !== 'sem-dados');
  const consistent = withData.filter((item) =>
    (HISTORY_CONSISTENCY_STATUSES as readonly string[]).includes(item.status)
  );
  const previousWithData = patients.filter((item) => item.previousAdherence.percent != null);
  const previousConsistent = previousWithData.filter((item) => {
    const status = getPatientPerformanceStatus(item.previousAdherence.percent);
    return (HISTORY_CONSISTENCY_STATUSES as readonly string[]).includes(status);
  });
  const consistencyPercent =
    withData.length > 0 ? (consistent.length / withData.length) * 100 : null;
  const previousConsistency =
    previousWithData.length > 0
      ? (previousConsistent.length / previousWithData.length) * 100
      : null;

  const attention = patients
    .map((item) => item.attention)
    .filter((item): item is HistoryAttentionItem => Boolean(item))
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'alta' ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const allCurrentSessions = input.patients.flatMap((patient) =>
    patient.sessions
      .map((item) => classifyHistorySession(item.session, item.exercises, window.today))
      .filter((item) =>
        inDateRange(item.scheduledDate, window.current.startDate, window.current.endDate)
      )
  );

  return {
    periodDays: input.periodDays,
    startDate: window.current.startDate,
    endDate: window.current.endDate,
    previousStartDate: window.previous.startDate,
    previousEndDate: window.previous.endDate,
    loadStartDate: window.loadStartDate,
    loadEndDate: window.loadEndDate,
    today: window.today,
    kpis: {
      adherencePercent: roundPercent(adherencePercent),
      adherenceDelta: roundPercent(percentDelta(adherencePercent, previousAdherencePercent)),
      doneCount: currentDue.done,
      missedCount: currentDue.missed,
      attentionCount: attention.length,
      consistencyPercent: roundPercent(consistencyPercent),
      consistencyDelta: roundPercent(percentDelta(consistencyPercent, previousConsistency)),
    },
    attention,
    chart: buildAdherenceChart(
      allCurrentSessions,
      input.periodDays,
      window.current.startDate,
      window.current.endDate
    ),
    distribution,
    patients,
  };
}

export function emptyHistoryAnalytics(
  periodDays: HistoryPeriodDays,
  now: Date = new Date()
): HistoryAnalyticsResult {
  return buildHistoryAnalytics({
    periodDays,
    personalName: '',
    patients: [],
    now,
  });
}

export function historyStatusLabel(status: HistoryPerformanceStatus): string {
  switch (status) {
    case 'excelente':
      return 'Excelente';
    case 'boa':
      return 'Boa';
    case 'atencao':
      return 'Atenção';
    case 'critica':
      return 'Crítico';
    default:
      return 'Sem dados';
  }
}

export function historyKindLabel(kind: HistorySessionKind | 'empty'): string {
  switch (kind) {
    case 'done':
      return 'Realizado';
    case 'missed':
      return 'Não realizado';
    case 'scheduled':
      return 'Programado';
    case 'inactive':
      return 'Desativado';
    default:
      return '—';
  }
}
