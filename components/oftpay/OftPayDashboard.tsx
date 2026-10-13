'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  LineChart,
  Minus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { groupVideosBySubject } from '@/utils/videoLibraryUtils';
import { calculateProgressStats, exportProgress, importProgress } from '@/utils/videoProgress';
import { loadPlannersFromFirestore, getFavoritePlannerId } from '@/utils/plannerFirestore';
import { loadScheduleFromFirestore } from '@/utils/scheduleFirestore';
import { displaySubjectName, getSubjectVisual } from '@/utils/oftreviewSubjectVisuals';
import type { PlannerSettings, Schedule, ScheduleDay, ScheduleItem, ProgressMap } from '@/types/videoLibrary';
import type { CourseVideoItem } from './CoursePlayer';

/** Retorna segundos assistidos e duração total do item (parte ou vídeo inteiro). Mesma lógica do calendário. */
function getItemWatchedAndTotal(item: ScheduleItem, progressMap: ProgressMap): { watchedSeconds: number; totalSeconds: number } {
  const progress = progressMap[item.videoId];
  let watchedSeconds = 0;
  let totalSeconds = item.durationSec || 0;
  if (item.isPart && item.part) {
    const startSec = item.part.startSec;
    const endSec = item.part.endSec;
    totalSeconds = endSec - startSec;
    if (progress) {
      watchedSeconds = Math.max(0, Math.min(progress.watchedSeconds - startSec, totalSeconds));
    }
  } else if (progress) {
    watchedSeconds = progress.watchedSeconds;
    if (progress.duration && progress.duration > 0) totalSeconds = progress.duration;
  }
  return { watchedSeconds, totalSeconds };
}

/** Dias do cronograma no escopo (Total = todos os vídeos; Planejamento = vídeos dos assuntos selecionados). */
function getDaysInScope(
  schedule: Schedule,
  dashboardVideoIds: Set<string>
): { days: ScheduleDay[]; totalDays: number } {
  const days = schedule.days.filter(
    (d) => d.items.length > 0 && d.items.some((item) => dashboardVideoIds.has(item.videoId))
  );
  return { days, totalDays: days.length };
}

const PROGRESS_STORAGE_KEY_PREFIX = 'oftpay_progress_';
const MONTHS_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_LONG = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type SubjectFilter = 'all' | 'active' | 'idle' | 'done';

type EvolutionPoint = {
  t: number;
  fullLabel: string;
  previsto: number;
  realizado: number | null;
  showReal: boolean;
};

function localTodayISO(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function parseISOUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function toISOFromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function addDaysISO(iso: string, days: number): string {
  return toISOFromUTC(parseISOUTC(iso) + days * 86400000);
}

function daysBetween(a: string, b: string): number {
  return Math.round((parseISOUTC(b) - parseISOUTC(a)) / 86400000);
}

function formatClock(totalMinutes: number): string {
  const abs = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function formatDelta(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return '0 min';
  const sign = rounded > 0 ? '+' : '-';
  const abs = Math.abs(rounded);
  if (abs < 60) return `${sign}${abs} min`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h ${m}min`;
}

function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function formatLongDate(iso: string): string {
  return new Date(parseISOUTC(iso)).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatMonthYear(iso: string): string {
  const [y, m] = iso.split('-').map(Number);
  return `${MONTHS_LONG[(m || 1) - 1]} ${y}`;
}

function monthEnds(startISO: string, endISO: string): string[] {
  const ends: string[] = [];
  let y = Number(startISO.slice(0, 4));
  let m = Number(startISO.slice(5, 7));
  const endY = Number(endISO.slice(0, 4));
  const endM = Number(endISO.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    const next = m === 12 ? Date.UTC(y + 1, 0, 1) : Date.UTC(y, m, 1);
    const endMs = next - 86400000;
    const iso = toISOFromUTC(endMs);
    ends.push(iso < startISO ? startISO : iso > endISO ? endISO : iso);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return ends;
}

function monthTickTimes(minISO: string, maxISO: string): number[] {
  const ticks: number[] = [];
  let y = Number(minISO.slice(0, 4));
  let m = Number(minISO.slice(5, 7));
  const endY = Number(maxISO.slice(0, 4));
  const endM = Number(maxISO.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    ticks.push(Date.UTC(y, m - 1, 1));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return ticks;
}

/**
 * Série do previsto acumulado a partir dos dias do cronograma.
 * O realizado entra só no ponto de hoje.
 */
function buildEvolutionSeries(
  days: ScheduleDay[],
  videoIds: Set<string>,
  progressMap: ProgressMap,
  watchedHours: number,
  todayISO: string
): EvolutionPoint[] {
  const perDay: { iso: string; seconds: number }[] = [];
  for (const day of days) {
    let seconds = 0;
    for (const item of day.items) {
      if (!videoIds.has(item.videoId)) continue;
      seconds += getItemWatchedAndTotal(item, progressMap).totalSeconds;
    }
    if (seconds > 0) perDay.push({ iso: day.dateISO, seconds });
  }
  perDay.sort((a, b) => a.iso.localeCompare(b.iso));
  if (perDay.length === 0) return [];

  const startISO = perDay[0].iso;
  const endISO = perDay[perDay.length - 1].iso;
  const span = daysBetween(startISO, endISO);
  const cumAt = (iso: string) => {
    let seconds = 0;
    for (const row of perDay) {
      if (row.iso > iso) break;
      seconds += row.seconds;
    }
    return seconds / 3600;
  };

  const grain: 'day' | 'week' | 'month' = span <= 35 ? 'day' : span <= 120 ? 'week' : 'month';
  const anchors: { iso: string; today: boolean }[] = [];
  if (grain === 'day') {
    let cursor = startISO;
    while (cursor <= endISO) {
      anchors.push({ iso: cursor, today: cursor === todayISO });
      cursor = addDaysISO(cursor, 1);
    }
  } else if (grain === 'week') {
    let cursor = startISO;
    while (cursor <= endISO) {
      const weekEnd = addDaysISO(cursor, 6);
      const iso = weekEnd > endISO ? endISO : weekEnd;
      anchors.push({ iso, today: false });
      if (iso === endISO) break;
      cursor = addDaysISO(iso, 1);
    }
  } else {
    for (const iso of monthEnds(startISO, endISO)) anchors.push({ iso, today: false });
  }

  if (!anchors.some((anchor) => anchor.iso === todayISO)) {
    anchors.push({ iso: todayISO, today: true });
  }
  anchors.sort((a, b) => a.iso.localeCompare(b.iso));

  const unique: { iso: string; today: boolean }[] = [];
  for (const anchor of anchors) {
    const prev = unique[unique.length - 1];
    if (prev && prev.iso === anchor.iso) {
      prev.today = prev.today || anchor.today || anchor.iso === todayISO;
      continue;
    }
    unique.push({ iso: anchor.iso, today: anchor.today || anchor.iso === todayISO });
  }

  return unique.map((anchor) => {
    const monthPoint = grain === 'month' && anchor.iso !== todayISO;
    return {
      t: parseISOUTC(anchor.iso),
      fullLabel: monthPoint ? formatMonthYear(anchor.iso) : formatLongDate(anchor.iso),
      previsto: cumAt(anchor.iso),
      realizado: anchor.iso === todayISO ? watchedHours : null,
      showReal: anchor.iso === todayISO,
    };
  });
}

function paceSpoken(minutes: number): string {
  const rounded = Math.round(minutes);
  const abs = Math.abs(rounded);
  if (rounded === 0) return 'Você está exatamente no ritmo planejado.';
  const amount = abs < 60 ? `${abs} ${abs === 1 ? 'minuto' : 'minutos'}` : formatClock(abs);
  if (rounded < 0) return `Você está ${amount} atrasado em relação ao seu planejamento.`;
  return `Você está ${amount} adiantado em relação ao seu planejamento.`;
}

function subjectStudyState(
  subjectVideos: Array<{ videoId: string }>,
  progressMap: ProgressMap
): 'active' | 'idle' | 'done' {
  let concluded = 0;
  let anySeconds = false;
  for (const video of subjectVideos) {
    const progress = progressMap[video.videoId];
    if (progress?.watched) concluded += 1;
    if ((progress?.watchedSeconds || 0) > 0) anySeconds = true;
  }
  if (subjectVideos.length > 0 && concluded === subjectVideos.length) return 'done';
  if (anySeconds || concluded > 0) return 'active';
  return 'idle';
}

interface OftPayDashboardProps {
  courseId: string;
  videos: CourseVideoItem[];
  schedule: Schedule | null;
  schedulesByPlanner?: Record<string, Schedule> | null;
  progressMap: ProgressMap;
  onProgressChange?: (progressMap: ProgressMap) => void;
  preloadedPlanners?: PlannerSettings[];
  preloadedFavoriteId?: string | null;
}

/** Converte CourseVideoItem para o formato esperado por groupVideosBySubject */
function toVideoFileLike(v: CourseVideoItem) {
  return {
    name: v.name,
    subject: v.subject || 'Geral',
    videoId: v.videoId,
    folderPath: v.subject || 'Geral',
    webkitRelativePath: `${v.subject || 'Geral'}/${v.name}`,
    sizeBytes: 0,
    duration: v.duration ?? undefined,
  };
}

function ProgressRing({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = 15;
  const c = 2 * Math.PI * r;
  const dash = (p / 100) * c;
  return (
    <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" className="stroke-gray-200" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        className="stroke-blue-600"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c - dash}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function RealizedDot(props: { cx?: number; cy?: number; payload?: EvolutionPoint }) {
  const { cx, cy, payload } = props;
  if (!payload?.showReal || cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="#2563eb" fillOpacity={0.16} />
      <circle cx={cx} cy={cy} r={4.5} fill="#2563eb" stroke="#ffffff" strokeWidth={2} />
    </g>
  );
}

export default function OftPayDashboard({
  courseId,
  videos,
  schedule,
  schedulesByPlanner = null,
  progressMap,
  onProgressChange,
  preloadedPlanners,
  preloadedFavoriteId = null,
}: OftPayDashboardProps) {
  const libraryId = `oftpay_${courseId}`;
  const [dashboardFilter, setDashboardFilter] = useState<'total' | string>('total');
  const [allPlanners, setAllPlanners] = useState<PlannerSettings[]>([]);
  const [favoritePlannerId, setFavoritePlannerId] = useState<string | null>(null);
  const [scheduleCache, setScheduleCache] = useState<Record<string, Schedule | null>>({});
  const scheduleCacheRef = useRef(scheduleCache);
  scheduleCacheRef.current = scheduleCache;
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');

  const loadPlanners = useCallback(async () => {
    try {
      const [list, favId] = await Promise.all([
        loadPlannersFromFirestore(libraryId),
        getFavoritePlannerId(libraryId),
      ]);
      setAllPlanners(list);
      setFavoritePlannerId(favId);
    } catch (e) {
      console.error('Erro ao carregar planejamentos no Dashboard:', e);
    }
  }, [libraryId]);

  useEffect(() => {
    if (preloadedPlanners) {
      setAllPlanners(preloadedPlanners);
      setFavoritePlannerId(preloadedFavoriteId);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadPlanners();
    });
    return () => unsub();
  }, [loadPlanners, preloadedPlanners, preloadedFavoriteId]);

  /** Inicia o Dashboard com o planejamento favorito, quando disponível. */
  useEffect(() => {
    if (!favoritePlannerId || allPlanners.length === 0) return;
    const favoriteExists = allPlanners.some((p) => p.id === favoritePlannerId);
    if (favoriteExists) {
      setDashboardFilter(favoritePlannerId);
    }
  }, [favoritePlannerId, allPlanners]);

  useEffect(() => {
    if (dashboardFilter === 'total') return;
    if (schedule?.plannerId === dashboardFilter) return;
    if (schedulesByPlanner?.[dashboardFilter]) return;
    if (Object.prototype.hasOwnProperty.call(scheduleCacheRef.current, dashboardFilter)) return;
    let cancelled = false;
    const plannerId = dashboardFilter;
    loadScheduleFromFirestore(libraryId, plannerId).then((loaded) => {
      if (cancelled) return;
      setScheduleCache((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, plannerId)) return prev;
        return { ...prev, [plannerId]: loaded };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [dashboardFilter, schedule, schedulesByPlanner, libraryId]);

  const activeSchedule = useMemo(() => {
    if (dashboardFilter === 'total') return schedule;
    if (schedule?.plannerId === dashboardFilter) return schedule;
    const bundled = schedulesByPlanner?.[dashboardFilter];
    if (bundled) return bundled;
    if (Object.prototype.hasOwnProperty.call(scheduleCache, dashboardFilter)) {
      return scheduleCache[dashboardFilter];
    }
    return null;
  }, [dashboardFilter, schedule, schedulesByPlanner, scheduleCache]);

  const waitingSchedule =
    dashboardFilter !== 'total' &&
    activeSchedule == null &&
    schedule?.plannerId !== dashboardFilter &&
    !schedulesByPlanner?.[dashboardFilter] &&
    !Object.prototype.hasOwnProperty.call(scheduleCache, dashboardFilter);

  const dashboardVideos = useMemo(() => {
    if (dashboardFilter !== 'total') {
      const planner = allPlanners.find((p) => p.id === dashboardFilter);
      if (planner) {
        return videos.filter((v) => planner.selectedSubjects?.includes(v.subject));
      }
    }
    return videos;
  }, [videos, dashboardFilter, allPlanners]);

  const dashboardFilteredVideos = useMemo(() => dashboardVideos, [dashboardVideos]);

  const dashboardGroupedVideos = useMemo(() => {
    const asFileLike = dashboardFilteredVideos.map(toVideoFileLike);
    return groupVideosBySubject(asFileLike as Parameters<typeof groupVideosBySubject>[0]);
  }, [dashboardFilteredVideos]);

  /** Entradas (assunto, vídeos) na ordem do planejamento selecionado (subjectOrder), ou ordem do Map se Total */
  const dashboardGroupedVideosOrdered = useMemo(() => {
    const entries = Array.from(dashboardGroupedVideos.entries());
    if (dashboardFilter === 'total') return entries;
    const planner = allPlanners.find((p) => p.id === dashboardFilter);
    if (!planner?.subjectOrder?.length) return entries;
    const order = planner.subjectOrder;
    return entries.sort(([subjectA], [subjectB]) => {
      const idxA = order.indexOf(subjectA);
      const idxB = order.indexOf(subjectB);
      if (idxA === -1 && idxB === -1) return subjectA.localeCompare(subjectB);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });
  }, [dashboardGroupedVideos, dashboardFilter, allPlanners]);

  const progressStats = useMemo(() => {
    return calculateProgressStats(
      dashboardVideos.map((v) => ({
        videoId: v.videoId,
        duration: v.duration != null && v.duration > 0 ? v.duration : (progressMap[v.videoId]?.duration ?? 0),
      })),
      progressMap
    );
  }, [dashboardVideos, progressMap]);

  const watchedHoursPercentage = useMemo(() => {
    if (!Number.isFinite(progressStats.totalHours) || progressStats.totalHours <= 0) return 0;
    const value = (progressStats.watchedHours / progressStats.totalHours) * 100;
    return Number.isFinite(value) ? value : 0;
  }, [progressStats.totalHours, progressStats.watchedHours]);

  const lessonPercentage = progressStats.total > 0 ? (progressStats.watched / progressStats.total) * 100 : 0;

  const pace = useMemo(() => {
    if (!activeSchedule || activeSchedule.days.length === 0) return null;
    const todayISO = localTodayISO();
    const dashboardVideoIds = new Set(dashboardVideos.map((v) => v.videoId));
    const { days } = getDaysInScope(activeSchedule, dashboardVideoIds);
    if (days.length === 0) return null;

    let totalPlannedSeconds = 0;
    let expectedSecondsByToday = 0;
    let totalWatchedSeconds = 0;
    days.forEach((day) => {
      const itemsInScope = day.items.filter((item) => dashboardVideoIds.has(item.videoId));
      const isDayPassed = day.dateISO <= todayISO;
      itemsInScope.forEach((item) => {
        const { watchedSeconds, totalSeconds } = getItemWatchedAndTotal(item, progressMap);
        totalPlannedSeconds += totalSeconds;
        if (isDayPassed) expectedSecondsByToday += totalSeconds;
        totalWatchedSeconds += watchedSeconds;
      });
    });

    const expectedHoursByToday = expectedSecondsByToday / 3600;
    const watchedHours = totalWatchedSeconds / 3600;
    const expectedMinutes = Math.round(expectedHoursByToday * 60);
    const watchedMinutes = Math.round(watchedHours * 60);
    return {
      days,
      dashboardVideoIds,
      todayISO,
      expectedHoursByToday,
      watchedHours,
      totalHours: totalPlannedSeconds / 3600,
      differenceMinutes: watchedMinutes - expectedMinutes,
      expectedMinutes,
      watchedMinutes,
    };
  }, [activeSchedule, dashboardVideos, progressMap]);

  const evolution = useMemo(() => {
    if (!pace) return [];
    return buildEvolutionSeries(
      pace.days,
      pace.dashboardVideoIds,
      progressMap,
      pace.watchedHours,
      pace.todayISO
    );
  }, [pace, progressMap]);

  const axisTicks = useMemo(() => {
    if (evolution.length === 0) return [];
    const minISO = toISOFromUTC(evolution[0].t);
    const maxISO = toISOFromUTC(evolution[evolution.length - 1].t);
    if (daysBetween(minISO, maxISO) <= 35) {
      const step = Math.max(1, Math.ceil(evolution.length / 6));
      return evolution.filter((_, index) => index % step === 0).map((point) => point.t);
    }
    const minT = evolution[0].t;
    const maxT = evolution[evolution.length - 1].t;
    const ticks = monthTickTimes(minISO, maxISO).map((tick) => Math.min(maxT, Math.max(minT, tick)));
    return [...new Set(ticks)];
  }, [evolution]);

  const yMax = useMemo(() => {
    const peak = evolution.reduce((max, point) => Math.max(max, point.previsto, point.realizado ?? 0), 0);
    return peak <= 0 ? 1 : peak * 1.08;
  }, [evolution]);

  const handleExportProgress = useCallback(() => {
    try {
      const json = exportProgress(progressMap);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oftpay-progress-${courseId}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      alert('Progresso exportado com sucesso!');
    } catch (e) {
      console.error('Erro ao exportar progresso:', e);
      alert('Erro ao exportar progresso.');
    }
  }, [progressMap, courseId]);

  const handleImportProgress = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = importProgress(event.target?.result as string);
          if (imported) {
            onProgressChange?.(imported);
            alert('Progresso importado com sucesso!');
          } else {
            alert('Arquivo inválido. Verifique o formato.');
          }
        } catch (err) {
          console.error('Erro ao importar progresso:', err);
          alert('Erro ao importar progresso. Verifique se o arquivo é válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [onProgressChange]);

  const handleResetProgress = useCallback(() => {
    if (!confirm('Tem certeza que deseja resetar todo o progresso deste curso? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      localStorage.removeItem(PROGRESS_STORAGE_KEY_PREFIX + courseId);
      onProgressChange?.({});
      alert('Progresso resetado com sucesso!');
    } catch (e) {
      console.error('Erro ao resetar progresso:', e);
      onProgressChange?.({});
      alert('Progresso resetado.');
    }
  }, [courseId, onProgressChange]);

  const filteredSubjects = dashboardGroupedVideosOrdered.filter(([subject, subjectVideos]) => {
    if (subjectFilter === 'all') return true;
    return subjectStudyState(subjectVideos, progressMap) === subjectFilter;
  });

  const paceTone = !pace
    ? 'neutral'
    : pace.differenceMinutes > 0
      ? 'ahead'
      : pace.differenceMinutes < 0
        ? 'behind'
        : 'even';

  const barScale = pace ? Math.max(pace.expectedMinutes, pace.watchedMinutes, 1) : 1;
  const noPlanners = allPlanners.length === 0 && dashboardFilter === 'total';

  return (
    <div className="min-w-0 space-y-4 md:space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LineChart className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 md:text-xl">Dashboard</h2>
            <p className="mt-0.5 text-sm text-gray-500">
              Acompanhe sua evolução e veja se está no ritmo do seu planejamento.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <select
            value={dashboardFilter}
            onChange={(e) => setDashboardFilter(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:w-auto sm:min-w-[12rem]"
            aria-label="Planejamento"
          >
            <option value="total">Total</option>
            {allPlanners.map((planner) => (
              <option key={planner.id} value={planner.id ?? ''}>
                {planner.name || `Planejamento ${(planner.id ?? '').substring(0, 8)}`}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportProgress}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              title="Exportar Progresso"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar
            </button>
            <button
              type="button"
              onClick={handleImportProgress}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              title="Importar Progresso"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar
            </button>
            <button
              type="button"
              onClick={handleResetProgress}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-sm hover:bg-red-50"
              title="Resetar Progresso"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Resetar
            </button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <article className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4">
          <div className="flex items-start gap-2.5">
            <ProgressRing percent={watchedHoursPercentage} />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Progresso do curso</p>
              <p className="mt-1 truncate text-[clamp(1.15rem,2.4vw,1.7rem)] font-extrabold leading-none tabular-nums text-gray-900">
                {formatPercent(watchedHoursPercentage)}
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">do conteúdo em horas</p>
              <p className="text-[11px] text-gray-400">
                {progressStats.watched} de {progressStats.total} aulas concluídas
              </p>
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Clock className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Tempo estudado</p>
              <p className="mt-1 truncate text-[clamp(1.15rem,2.4vw,1.7rem)] font-extrabold leading-none tabular-nums text-gray-900">
                {formatClock(progressStats.watchedHours * 60)}
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                de {formatClock(progressStats.totalHours * 60)}
              </p>
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4">
          <div className="flex items-start gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Aulas concluídas</p>
              <p className="mt-1 truncate text-[clamp(1.15rem,2.4vw,1.7rem)] font-extrabold leading-none tabular-nums text-gray-900">
                {progressStats.watched} / {progressStats.total}
              </p>
              <p className="mt-1.5 text-[11px] text-gray-500">{formatPercent(lessonPercentage)} das aulas</p>
            </div>
          </div>
        </article>

        <article className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-3 shadow-sm transition hover:shadow-md sm:p-4">
          <div className="flex items-start gap-2.5">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                paceTone === 'ahead'
                  ? 'bg-green-50 text-green-600'
                  : paceTone === 'behind'
                    ? 'bg-red-50 text-red-600'
                    : paceTone === 'even'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-gray-100 text-gray-400'
              }`}
            >
              {paceTone === 'ahead' ? (
                <TrendingUp className="h-4 w-4" aria-hidden />
              ) : paceTone === 'behind' ? (
                <TrendingDown className="h-4 w-4" aria-hidden />
              ) : (
                <Minus className="h-4 w-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Ritmo de estudo</p>
              {pace ? (
                <>
                  <p
                    className={`mt-1 truncate text-[clamp(1.15rem,2.4vw,1.7rem)] font-extrabold leading-none tabular-nums ${
                      paceTone === 'ahead' ? 'text-green-600' : paceTone === 'behind' ? 'text-red-600' : 'text-blue-600'
                    }`}
                  >
                    {formatDelta(pace.differenceMinutes)}
                  </p>
                  <p
                    className={`mt-1.5 text-[11px] font-semibold ${
                      paceTone === 'ahead' ? 'text-green-600' : paceTone === 'behind' ? 'text-red-600' : 'text-blue-600'
                    }`}
                  >
                    {paceTone === 'ahead' ? 'Adiantado' : paceTone === 'behind' ? 'Atrasado' : 'No previsto'}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Previsto: {formatClock(pace.expectedMinutes)} · Realizado: {formatClock(pace.watchedMinutes)}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[clamp(1.15rem,2.4vw,1.7rem)] font-extrabold leading-none text-gray-300">—</p>
                  <p className="mt-1.5 text-[11px] leading-snug text-gray-500">
                    {waitingSchedule
                      ? 'Carregando cronograma…'
                      : noPlanners
                        ? 'Selecione ou crie um planejamento para acompanhar sua evolução.'
                        : 'Gere um cronograma para comparar seu ritmo de estudo.'}
                  </p>
                </>
              )}
            </div>
          </div>
        </article>
      </section>

      {noPlanners ? (
        <EmptyPanel
          title="Nenhum planejamento selecionado"
          body="Selecione ou crie um planejamento para acompanhar sua evolução."
        />
      ) : !pace ? (
        <EmptyPanel
          title={waitingSchedule ? 'Carregando cronograma…' : 'Ainda não há cronograma para comparar seu ritmo.'}
          body={waitingSchedule ? 'Buscando o cronograma deste planejamento.' : 'Gere um cronograma no planejador para ver o previsto e o realizado.'}
        />
      ) : (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(240px,3fr)] lg:items-stretch">
          <article className="min-w-0 overflow-hidden rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">Evolução do estudo</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comparação entre o tempo previsto no planejamento e o progresso realizado até hoje.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <LegendPill color="#2563eb" label="Realizado" />
                <LegendPill color="#93c5fd" label="Previsto" />
                <LegendPill color="#fb923c" label="Hoje" />
              </div>
            </div>
            {evolution.length === 0 ? (
              <p className="mt-8 text-sm text-gray-500">Não há horas planejadas nestes dias para desenhar a evolução.</p>
            ) : (
            <div className="mt-4 h-56 min-w-0 sm:h-64 lg:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolution} margin={{ top: 18, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="oftreviewPrevisto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="t"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    ticks={axisTicks}
                    tickFormatter={(value: number) => formatAxisTick(value, evolution)}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={12}
                  />
                  <YAxis
                    width={40}
                    domain={[0, yMax]}
                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value: number) => (value >= 10 ? `${Math.round(value)}h` : `${value.toFixed(0)}h`)}
                  />
                  <Tooltip
                    cursor={{ stroke: 'rgba(37,99,235,0.18)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const point = payload[0].payload as EvolutionPoint;
                      return (
                        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                          <p className="text-gray-500">{point.fullLabel}</p>
                          <p className="mt-1 flex items-center gap-1.5 font-semibold tabular-nums text-gray-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                            Previsto {formatClock(point.previsto * 60)}
                          </p>
                          {point.showReal ? (
                            <p className="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums text-gray-800">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                              Realizado {formatClock((point.realizado ?? 0) * 60)}
                            </p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="previsto"
                    name="Previsto"
                    stroke="#93c5fd"
                    strokeWidth={2}
                    fill="url(#oftreviewPrevisto)"
                    dot={false}
                    activeDot={{ r: 3, fill: '#93c5fd' }}
                  />
                  <Line
                    type="linear"
                    dataKey="realizado"
                    name="Realizado"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={RealizedDot}
                    activeDot={false}
                    connectNulls={false}
                    legendType="none"
                  />
                  <ReferenceLine
                    x={parseISOUTC(pace.todayISO)}
                    stroke="#fb923c"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{ value: 'Hoje', position: 'insideTopRight', fill: '#ea580c', fontSize: 11 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            )}
            <p className="mt-2 text-[11px] text-gray-400">
              A linha é o previsto acumulado do cronograma. O ponto azul é só o realizado de hoje — não há histórico para as datas anteriores.
            </p>
          </article>

          <article className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-sm font-semibold text-gray-900">Sua situação hoje</h3>
            <p className="mt-1 text-sm text-gray-500">Com base no tempo previsto até a data atual.</p>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Tempo previsto até hoje</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-gray-900">{formatClock(pace.expectedMinutes)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Tempo realizado</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-blue-600">{formatClock(pace.watchedMinutes)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">Diferença</dt>
                <dd
                  className={`mt-0.5 text-xl font-extrabold tabular-nums ${
                    paceTone === 'ahead' ? 'text-green-600' : paceTone === 'behind' ? 'text-red-600' : 'text-blue-600'
                  }`}
                >
                  {formatDelta(pace.differenceMinutes)}
                </dd>
              </div>
            </dl>
            <div className="mt-4 space-y-2">
              <CompareBar label="Previsto" width={(pace.expectedMinutes / barScale) * 100} className="bg-blue-200" />
              <CompareBar label="Realizado" width={(pace.watchedMinutes / barScale) * 100} className="bg-blue-600" />
            </div>
            <div
              className={`mt-4 flex items-start gap-2 rounded-2xl px-3 py-2.5 text-sm ${
                paceTone === 'ahead'
                  ? 'bg-green-50 text-green-800'
                  : paceTone === 'behind'
                    ? 'bg-red-50 text-red-800'
                    : 'bg-blue-50 text-blue-800'
              }`}
            >
              {paceTone === 'behind' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              )}
              <p>{paceSpoken(pace.differenceMinutes)}</p>
            </div>
          </article>
        </section>
      )}

      <section className="min-w-0 rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">Andamento por assunto</h3>
            <p className="mt-1 text-sm text-gray-500">Veja seu progresso em cada tema do Oftreview.</p>
          </div>
          <div className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
            {(
              [
                ['all', 'Todos os assuntos'],
                ['active', 'Em andamento'],
                ['idle', 'Não iniciados'],
                ['done', 'Concluídos'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={subjectFilter === id}
                onClick={() => setSubjectFilter(id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                  subjectFilter === id ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filteredSubjects.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">Nenhum assunto neste filtro.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredSubjects.map(([subject, subjectVideos]) => {
              const visual = getSubjectVisual(subject);
              const subjectProgress = subjectVideos.reduce(
                (acc, v) => {
                  const videoDuration =
                    v.duration != null && v.duration > 0
                      ? v.duration
                      : (progressMap[v.videoId]?.duration ?? 0);
                  const progress = progressMap[v.videoId];
                  acc.total += videoDuration;
                  acc.watched += progress?.watched ? videoDuration : progress?.watchedSeconds || 0;
                  return acc;
                },
                { total: 0, watched: 0 }
              );
              const watchedCount = subjectVideos.filter((v) => progressMap[v.videoId]?.watched).length;
              const lessonPct = subjectVideos.length > 0 ? (watchedCount / subjectVideos.length) * 100 : 0;
              const hoursTotal = subjectProgress.total / 3600;
              const hoursWatched = subjectProgress.watched / 3600;
              const hoursPct = hoursTotal > 0 ? (hoursWatched / hoursTotal) * 100 : 0;
              return (
                <article key={subject} className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-3">
                  <span className={`absolute inset-x-0 top-0 h-[3px] ${visual.stripeClass}`} />
                  <div className="flex items-start gap-2.5">
                    <img
                      src={visual.iconSrc}
                      alt=""
                      className="h-11 w-11 shrink-0 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-3 text-sm font-semibold leading-snug text-gray-900">
                          {displaySubjectName(subject)}
                        </h4>
                        <span className="shrink-0 text-[11px] text-gray-400">{subjectVideos.length} vídeos</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-gray-700">{watchedCount} / {subjectVideos.length} aulas</span>
                      <span className="tabular-nums text-gray-500">{formatPercent(lessonPct)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${Math.min(100, lessonPct)}%` }} />
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-medium text-gray-700">
                        {formatClock(hoursWatched * 60)} / {formatClock(hoursTotal * 60)}
                      </span>
                      <span className="tabular-nums text-gray-500">{formatPercent(hoursPct)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, hoursPct)}%` }} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function formatAxisTick(value: number, points: EvolutionPoint[]): string {
  const date = new Date(value);
  const month = MONTHS_SHORT[date.getUTCMonth()];
  const minYear = new Date(points[0]?.t ?? value).getUTCFullYear();
  const maxYear = new Date(points[points.length - 1]?.t ?? value).getUTCFullYear();
  if (minYear !== maxYear && date.getUTCMonth() === 0) return `${month} ${String(date.getUTCFullYear()).slice(2)}`;
  if (daysBetween(toISOFromUTC(points[0]?.t ?? value), toISOFromUTC(points[points.length - 1]?.t ?? value)) <= 35) {
    return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
  }
  return month;
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function CompareBar({ label, width, className }: { label: string; width: number; className: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className={`h-full rounded-full ${className}`} style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[20px] border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
      <LineChart className="mb-3 h-8 w-8 text-gray-300" aria-hidden />
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 max-w-md text-sm text-gray-500">{body}</p>
    </div>
  );
}
