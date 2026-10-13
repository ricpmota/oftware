'use client';

import { useMemo } from 'react';
import { Calendar, Play, CheckCircle2, PlayCircle, Circle, MessageSquare } from 'lucide-react';
import { Schedule, ScheduleItem, ProgressMap } from '@/types/videoLibrary';
import { getVideoProgress } from '@/utils/videoProgress';
import CourseScheduleView from '@/components/oftpay/courseSchedule/CourseScheduleView';
import {
  WEEKDAY_NAMES,
  calculateItemProgress,
  formatMinutes,
  formatTime,
  groupDaysByWeek,
} from '@/components/oftreview/scheduleMetrics';

interface ScheduleCalendarProps {
  schedule: Schedule | null;
  progressMap: ProgressMap;
  onItemClick: (item: ScheduleItem) => void;
  onlyFuture?: boolean; // Mostrar apenas dias futuros
  onlyUncompleted?: boolean; // Mostrar apenas itens não concluídos
  onOnlyFutureChange?: (checked: boolean) => void;
  onOnlyUncompletedChange?: (checked: boolean) => void;
  onCommentsClick?: (videoId: string, videoName: string) => void;
  videos?: Array<{ videoId: string; name: string }>;
  /** Cronograma do curso OftPay. A variante default permanece no /oftreview. */
  variant?: 'default' | 'course';
  /** Só estilo: destaca a aula que está no player. */
  selectedVideoId?: string | null;
  /** Expandido sem vídeo; compacto com o player aberto. */
  presentation?: 'expanded' | 'compact';
}

/**
 * Componente de calendário do cronograma
 */
export default function ScheduleCalendar({
  schedule,
  progressMap,
  onItemClick,
  onlyFuture = false,
  onlyUncompleted = false,
  onOnlyFutureChange,
  onOnlyUncompletedChange,
  onCommentsClick,
  videos = [],
  variant = 'default',
  selectedVideoId = null,
  presentation = 'expanded',
}: ScheduleCalendarProps) {
  // Calcular progresso de cada dia e aplicar filtros
  const daysWithProgress = useMemo(() => {
    if (!schedule) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return schedule.days
      .map(day => {
        let watchedMinutes = 0;
        let filteredItems = day.items;
        
        // Filtrar itens se necessário
        if (onlyUncompleted) {
          filteredItems = day.items.filter(item => {
            const itemProgress = calculateItemProgress(item, progressMap);
            return itemProgress.status !== 'watched';
          });
        }
        
        // Calcular progresso apenas dos itens visíveis
        filteredItems.forEach(item => {
          const itemProgress = calculateItemProgress(item, progressMap);
          watchedMinutes += itemProgress.watchedMinutes;
        });
        
        const progressPercent = day.plannedMinutes > 0 
          ? (watchedMinutes / day.plannedMinutes) * 100 
          : 0;
        
        return {
          ...day,
          items: filteredItems, // Usar itens filtrados
          watchedMinutes,
          progressPercent,
        };
      })
      .filter(day => {
        // Filtrar dias futuros se necessário
        if (onlyFuture) {
          const [year, month, dayNum] = day.dateISO.split('-').map(Number);
          const dayDate = new Date(Date.UTC(year, month - 1, dayNum));
          dayDate.setUTCHours(0, 0, 0, 0);
          return dayDate >= today;
        }
        return true;
      })
      .filter(day => {
        // Remover dias sem itens após filtrar
        return day.items.length > 0;
      });
  }, [schedule, progressMap, onlyFuture, onlyUncompleted]);
  
  // Agrupar por semana
  const weeks = useMemo(() => {
    return groupDaysByWeek(daysWithProgress);
  }, [daysWithProgress]);

  if (!schedule) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-sm text-gray-600 mb-4">
          Nenhum cronograma disponível. Selecione um planejamento na aba "Planejador".
        </p>
      </div>
    );
  }
  
  /**
   * Renderiza badge de status de item
   */
  const renderItemStatus = (item: ScheduleItem) => {
    const itemProgress = calculateItemProgress(item, progressMap);
    
    switch (itemProgress.status) {
      case 'watched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
            <CheckCircle2 className="w-3 h-3" />
            Concluído
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            <PlayCircle className="w-3 h-3" />
            {Math.round(itemProgress.progressPercent)}%
          </span>
        );
      case 'not_started':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded">
            <Circle className="w-3 h-3" />
            Não iniciado
          </span>
        );
    }
  };
  
  /**
   * Formata data para exibição
   * Usa UTC para evitar problemas de timezone
   */
  const formatDate = (dateISO: string) => {
    const [year, month, day] = dateISO.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
  };
  
  if (variant === 'course') {
    return (
      <CourseScheduleView
        weeks={weeks}
        progressMap={progressMap}
        videos={videos}
        onItemClick={onItemClick}
        selectedVideoId={selectedVideoId}
        presentation={presentation}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Cronograma de Estudo</h2>
          <p className="text-xs text-gray-500 mt-1">
            Gerado em {new Date(schedule.generatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filtros */}
          {onOnlyFutureChange && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyFuture}
                onChange={(e) => onOnlyFutureChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">Apenas futuros</span>
            </label>
          )}
          {onOnlyUncompletedChange && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyUncompleted}
                onChange={(e) => onOnlyUncompletedChange(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-xs font-medium text-gray-700">Apenas não concluídos</span>
            </label>
          )}
        </div>
      </div>
      
      {/* Semanas */}
      {weeks.map((week, weekIndex) => (
        <div key={week.weekStart.toISOString()} className="space-y-3">
          {/* Cabeçalho da semana */}
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">
              Semana {weekIndex + 1}
            </h3>
            <span className="text-xs text-gray-500">
              ({formatDate(week.days[0].dateISO)} - {formatDate(week.days[week.days.length - 1].dateISO)})
            </span>
          </div>
          
          {/* Dias da semana */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {week.days.map((day) => (
              <div
                key={day.dateISO}
                className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
              >
                {/* Cabeçalho do dia */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {WEEKDAY_NAMES[day.weekday]}, {formatDate(day.dateISO)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Progresso do dia */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">
                        Planejado: {formatMinutes(day.plannedMinutes)}
                      </span>
                      <span className="text-gray-600">
                        Capacidade: {formatMinutes(day.capacityMinutes)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (day.plannedMinutes / day.capacityMinutes) * 100)}%` }}
                      />
                    </div>
                    {day.progressPercent > 0 && (
                      <div className="flex items-center justify-between text-xs mt-1">
                        <span className="text-gray-600">
                          Assistido: {formatMinutes(day.watchedMinutes)}
                        </span>
                        <span className="text-blue-600 font-medium">
                          {day.progressPercent.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Itens do dia */}
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {day.items.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">Nenhum item</p>
                  ) : (
                    day.items.map((item) => {
                      const itemProgress = calculateItemProgress(item, progressMap);
                      const progress = getVideoProgress(item.videoId, progressMap);
                      const itemName = item.isPart && item.part
                        ? `${item.name} (Parte ${item.part.partNumber}/${item.part.totalParts})`
                        : item.name;
                      
                      return (
                        <div
                          key={item.itemId}
                          onClick={() => onItemClick(item)}
                          className="p-2 bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 cursor-pointer transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <p className="text-xs font-medium text-gray-900 truncate group-hover:text-blue-700">
                                  {itemName}
                                </p>
                                {item.estimatedDuration && (
                                  <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                    estimado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600">{item.subject}</span>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500">{formatMinutes(item.plannedMinutes)}</span>
                              </div>
                              {/* Barra de progresso do item */}
                              {itemProgress.totalDuration > 0 && (
                                <div className="mb-1.5 space-y-0.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">
                                      {formatTime(itemProgress.watchedSeconds)} / {formatTime(itemProgress.totalDuration)}
                                    </span>
                                    <span className="text-gray-600">
                                      {Math.round(itemProgress.percent)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-600 h-1.5 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, itemProgress.percent)}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {/* Comentários */}
                              {progress?.comments && (
                                <div className="mt-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-1.5">
                                  <div className="flex items-start gap-1">
                                    <MessageSquare className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                                    <span className="line-clamp-2">{progress.comments}</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                {renderItemStatus(item)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Botão de comentários */}
                              {onCommentsClick && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const video = videos.find(v => v.videoId === item.videoId);
                                    const videoName = video?.name || item.name;
                                    onCommentsClick(item.videoId, videoName);
                                  }}
                                  className={`p-1 rounded transition-colors opacity-0 group-hover:opacity-100 ${
                                    progress?.comments
                                      ? 'text-blue-600 hover:bg-blue-100'
                                      : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                                  }`}
                                  title={progress?.comments ? 'Editar comentários' : 'Adicionar comentários'}
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onItemClick(item);
                                }}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Assistir"
                              >
                                <Play className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Mensagem quando não há semanas */}
      {weeks.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Nenhum dia de estudo no cronograma.</p>
        </div>
      )}
    </div>
  );
}
