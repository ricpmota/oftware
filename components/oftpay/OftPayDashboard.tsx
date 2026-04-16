'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { groupVideosBySubject } from '@/utils/videoLibraryUtils';
import { calculateProgressStats, exportProgress, importProgress } from '@/utils/videoProgress';
import { loadPlannersFromFirestore, getFavoritePlannerId } from '@/utils/plannerFirestore';
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
  } else {
    if (progress) {
      watchedSeconds = progress.watchedSeconds;
      if (progress.duration && progress.duration > 0) totalSeconds = progress.duration;
    }
  }
  return { watchedSeconds, totalSeconds };
}

/** Percentual de progresso de um item (0–100). */
function getItemProgressPercent(item: ScheduleItem, progressMap: ProgressMap): number {
  const { watchedSeconds, totalSeconds } = getItemWatchedAndTotal(item, progressMap);
  if (totalSeconds <= 0) return 0;
  return (watchedSeconds / totalSeconds) * 100;
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

interface OftPayDashboardProps {
  courseId: string;
  videos: CourseVideoItem[];
  schedule: Schedule | null;
  progressMap: ProgressMap;
  onProgressChange?: (progressMap: ProgressMap) => void;
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

export default function OftPayDashboard({
  courseId,
  videos,
  schedule,
  progressMap,
  onProgressChange,
}: OftPayDashboardProps) {
  const libraryId = `oftpay_${courseId}`;
  const [dashboardFilter, setDashboardFilter] = useState<'total' | string>('total');
  const [allPlanners, setAllPlanners] = useState<PlannerSettings[]>([]);
  const [favoritePlannerId, setFavoritePlannerId] = useState<string | null>(null);

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
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadPlanners();
    });
    return () => unsub();
  }, [loadPlanners]);

  /** Inicia o Dashboard com o planejamento favorito, quando disponível. */
  useEffect(() => {
    if (!favoritePlannerId || allPlanners.length === 0) return;
    const favoriteExists = allPlanners.some((p) => p.id === favoritePlannerId);
    if (favoriteExists) {
      setDashboardFilter(favoritePlannerId);
    }
  }, [favoritePlannerId, allPlanners]);

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

  const dashboardBasicStats = useMemo(() => {
    const totalVideos = dashboardVideos.length;
    const totalBytes = dashboardVideos.reduce((sum, v) => sum + ((v as CourseVideoItem & { sizeBytes?: number }).sizeBytes ?? 0), 0);
    return {
      totalVideos,
      totalGB: totalBytes / (1024 * 1024 * 1024),
    };
  }, [dashboardVideos]);

  const progressStats = useMemo(() => {
    return calculateProgressStats(
      dashboardVideos.map((v) => ({
        videoId: v.videoId,
        duration: v.duration != null && v.duration > 0 ? v.duration : (progressMap[v.videoId]?.duration ?? 0),
      })),
      progressMap
    );
  }, [dashboardVideos, progressMap]);

  // Real vs Previsto por HORAS de vídeo: Previsto = horas planejadas até hoje / total de horas; Real = horas assistidas / total de horas.
  const ganttChartData = useMemo(() => {
    if (!schedule || schedule.days.length === 0) return null;
    const dashboardVideoIds = new Set(dashboardVideos.map((v) => v.videoId));
    const { days } = getDaysInScope(schedule, dashboardVideoIds);
    if (days.length === 0) return null;

    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

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

    const previstoPercent = totalPlannedSeconds > 0 ? (expectedSecondsByToday / totalPlannedSeconds) * 100 : 0;
    const realPercent = totalPlannedSeconds > 0 ? (totalWatchedSeconds / totalPlannedSeconds) * 100 : 0;

    const totalHours = totalPlannedSeconds / 3600;
    const expectedHoursByToday = expectedSecondsByToday / 3600;
    const watchedHours = totalWatchedSeconds / 3600;

    return {
      bars: [
        { tipo: 'Real', valor: Math.min(100, Math.max(0, realPercent)) },
        { tipo: 'Previsto', valor: Math.min(100, Math.max(0, previstoPercent)) },
      ],
      todayPosition: previstoPercent,
      totalHours,
      expectedHoursByToday,
      watchedHours,
    };
  }, [schedule, dashboardVideos, progressMap]);

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

  return (
    <div className="p-2 md:p-4 space-y-3 md:space-y-4 min-w-0 max-w-full overflow-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 md:p-4 min-w-0">
        <div className="flex flex-col gap-2 mb-2 md:mb-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm md:text-base font-semibold text-gray-900 shrink-0">Dashboard</h2>
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 min-w-0">
            <select
              value={dashboardFilter}
              onChange={(e) => setDashboardFilter(e.target.value)}
              className="min-w-0 max-w-full px-2 py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none flex-1 md:flex-none md:max-w-[10rem]"
            >
              <option value="total">Total</option>
              {allPlanners.map((planner) => (
                <option key={planner.id} value={planner.id ?? ''}>
                  {planner.name || `Planejamento ${(planner.id ?? '').substring(0, 8)}`}
                </option>
              ))}
            </select>
            <button
              onClick={handleExportProgress}
              className="p-1.5 md:px-2.5 md:py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 shrink-0"
              title="Exportar Progresso"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={handleImportProgress}
              className="p-1.5 md:px-2.5 md:py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 shrink-0"
              title="Importar Progresso"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button
              onClick={handleResetProgress}
              className="p-1.5 md:px-2.5 md:py-1 text-xs bg-white text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center gap-1 shrink-0"
              title="Resetar Progresso"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Resetar</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 truncate">Total de Vídeos</p>
            <p className="text-lg md:text-xl font-bold text-blue-600 tabular-nums">{dashboardBasicStats.totalVideos}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 truncate">Assistidos</p>
            <p className="text-lg md:text-xl font-bold text-green-600 tabular-nums">
              {progressStats.watchedHoursPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 truncate">
              Horas Totais {progressStats.hasPartialData && '(parcial)'}
            </p>
            <p className="text-lg md:text-xl font-bold text-indigo-600 tabular-nums">{progressStats.totalHours.toFixed(1)}h</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] md:text-xs text-gray-600 mb-0.5 truncate">Horas Assistidas</p>
            <p className="text-lg md:text-xl font-bold text-purple-600 tabular-nums">
              {progressStats.watchedHours.toFixed(1)}h ({progressStats.watchedHoursPercentage.toFixed(1)}%)
            </p>
          </div>
        </div>

        {dashboardBasicStats.totalGB > 0 && (
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-blue-200">
            <p className="text-[10px] md:text-xs text-gray-600">
              Tamanho total: <span className="font-semibold">{dashboardBasicStats.totalGB.toFixed(2)} GB</span>
            </p>
          </div>
        )}
      </div>

      {ganttChartData && ganttChartData.bars && ganttChartData.bars.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 min-w-0 overflow-hidden">
          <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-1">Progresso Real vs Previsto (por horas de vídeo)</h3>
          <p className="text-[10px] md:text-xs text-gray-500 mb-2 md:mb-3">
            {ganttChartData.watchedHours.toFixed(1)}h assistidas · Previsto até hoje: {ganttChartData.expectedHoursByToday.toFixed(1)}h de {ganttChartData.totalHours.toFixed(1)}h total
          </p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart
              data={ganttChartData.bars}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                type="category"
                dataKey="tipo"
                tick={{ fontSize: 12, fontWeight: 500 }}
                width={70}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ fontSize: 11 }}
              />
              <ReferenceLine
                x={ganttChartData.todayPosition}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: '#f59e0b' }}
              />
              <Bar dataKey="valor" radius={[0, 8, 8, 0]}>
                {ganttChartData.bars.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.tipo === 'Real' ? '#ef4444' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4 min-w-0 overflow-hidden">
        <h3 className="text-xs md:text-sm font-semibold text-gray-900 mb-2 md:mb-3">Andamento por Assunto</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {dashboardGroupedVideosOrdered.map(([subject, subjectVideos]) => {
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
            const percentage =
              subjectVideos.length > 0 ? (watchedCount / subjectVideos.length) * 100 : 0;
            const hoursTotal = subjectProgress.total / 3600;
            const hoursWatched = subjectProgress.watched / 3600;
            const hoursPercentage = hoursTotal > 0 ? (hoursWatched / hoursTotal) * 100 : 0;

            return (
              <div key={subject} className="border border-gray-200 rounded-lg p-2.5 md:p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5 md:mb-2 min-w-0">
                  <h4 className="text-xs md:text-sm font-medium text-gray-900 truncate">{subject}</h4>
                  <span className="text-[10px] md:text-xs text-gray-500 shrink-0">{subjectVideos.length} vídeos</span>
                </div>
                <div className="space-y-1.5">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Vídeos assistidos</span>
                      <span className="font-medium text-gray-700">
                        {watchedCount}/{subjectVideos.length} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  {hoursTotal > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">Tempo assistido</span>
                        <span className="font-medium text-gray-700">
                          {hoursWatched.toFixed(1)}h / {hoursTotal.toFixed(1)}h ({hoursPercentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${hoursPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
