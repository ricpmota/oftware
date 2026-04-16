/**
 * Utilitários para planejador de estudo
 */

import { StudyDay, PlannerStats, PerSubjectStat, PlanInput } from '@/types/videoLibrary';
import { VideoFile } from '@/types/videoLibrary';
import { ProgressMap } from '@/types/videoLibrary';

/**
 * Estima duração de um vídeo baseado no tamanho do arquivo
 * Fórmula aproximada: ~1 MB = 1 minuto (para vídeo comprimido)
 * @param sizeBytes Tamanho do arquivo em bytes
 * @returns Duração estimada em segundos
 */
export function estimateDurationSeconds(sizeBytes: number): number {
  // Assumir ~1 MB por minuto para vídeo comprimido
  // Ajustar conforme necessário
  const bytesPerMinute = 1024 * 1024; // 1 MB
  const estimatedMinutes = sizeBytes / bytesPerMinute;
  return estimatedMinutes * 60; // converter para segundos
}

/**
 * Constrói lista de dias de estudo válidos no intervalo
 * @param startDateISO Data de início (YYYY-MM-DD)
 * @param endDateISO Data de fim (YYYY-MM-DD)
 * @param allowedWeekdays Array de dias da semana permitidos [0..6] onde 0=Domingo, 6=Sábado
 * @param hoursPerWeekday Horas por dia da semana { 0: 4, 1: 1, ... } (opcional)
 * @returns Array de StudyDay
 */
export function buildStudyDays(
  startDateISO: string,
  endDateISO: string,
  allowedWeekdays: number[],
  hoursPerWeekday?: { [weekday: number]: number }
): StudyDay[] {
  const studyDays: StudyDay[] = [];
  
  // Parsear datas sem timezone (usar UTC para evitar problemas de timezone)
  const [startYear, startMonth, startDay] = startDateISO.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateISO.split('-').map(Number);
  
  const start = new Date(Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0, 0));
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay, 23, 59, 59, 999));
  
  const current = new Date(start);
  
  while (current <= end) {
    // Usar getUTCDay() para obter o dia da semana correto (0=Domingo, 6=Sábado)
    const weekday = current.getUTCDay();
    
    if (allowedWeekdays.includes(weekday)) {
      // Formatar data como YYYY-MM-DD usando UTC
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      const dateISO = `${year}-${month}-${day}`;
      
      const studyDay: StudyDay = {
        dateISO,
        weekday,
      };
      
      // Adicionar hoursCapacity se hoursPerWeekday fornecido
      if (hoursPerWeekday && hoursPerWeekday[weekday] !== undefined) {
        studyDay.hoursCapacity = hoursPerWeekday[weekday];
      }
      
      studyDays.push(studyDay);
    }
    
    // Avançar para o próximo dia (usando UTC)
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  // Verificar se o primeiro dia de estudo corresponde à data de início
  // Se não, pode haver um problema de timezone ou interpretação da data
  if (studyDays.length > 0) {
    const firstStudyDay = studyDays[0];
    const firstStudyDayDate = new Date(Date.UTC(
      parseInt(firstStudyDay.dateISO.split('-')[0]),
      parseInt(firstStudyDay.dateISO.split('-')[1]) - 1,
      parseInt(firstStudyDay.dateISO.split('-')[2])
    ));
    
    // Se o primeiro dia de estudo é anterior à data de início, há um problema
    if (firstStudyDayDate < start) {
      console.warn('Aviso: O primeiro dia de estudo é anterior à data de início. Verifique a configuração.');
    }
  }
  
  return studyDays;
}

/**
 * Calcula capacidade total de estudo
 * @param studyDays Array de dias de estudo (com hoursCapacity se disponível)
 * @param hoursPerWeekday Horas por dia da semana { 0: 4, 1: 1, ... } (opcional, se não fornecido usa média)
 * @returns Capacidade total em minutos
 */
export function computeCapacity(
  studyDays: StudyDay[],
  hoursPerWeekday?: { [weekday: number]: number }
): number {
  if (hoursPerWeekday && Object.keys(hoursPerWeekday).length > 0) {
    // Calcular capacidade considerando horas diferentes por dia
    return studyDays.reduce((total, day) => {
      const hours = hoursPerWeekday[day.weekday] || 0;
      return total + (hours * 60); // converter para minutos
    }, 0);
  }
  
  // Fallback: usar média se hoursPerWeekday não fornecido (compatibilidade)
  // Calcular média das horas
  if (studyDays.length === 0) return 0;
  const avgHours = studyDays.reduce((sum, day) => {
    const hours = day.hoursCapacity || (hoursPerWeekday ? (hoursPerWeekday[day.weekday] || 0) : 0);
    return sum + hours;
  }, 0) / studyDays.length;
  return studyDays.length * avgHours * 60;
}

/**
 * Calcula carga total de vídeos (tempo necessário)
 * @param videos Array de vídeos
 * @param progressMap Mapa de progresso
 * @param selectedSubjects Assuntos selecionados
 * @returns Estatísticas calculadas
 */
export function computeLoad(
  videos: VideoFile[],
  progressMap: ProgressMap,
  selectedSubjects: string[]
): {
  totalLoadMinutes: number;
  perSubjectStats: PerSubjectStat[];
} {
  // Filtrar vídeos dos assuntos selecionados
  const selectedVideos = videos.filter(v => selectedSubjects.includes(v.subject));
  
  const subjectMap = new Map<string, {
    videos: VideoFile[];
    totalSeconds: number;
    watchedSeconds: number;
  }>();
  
  // Processar cada vídeo
  selectedVideos.forEach(video => {
    const subject = video.subject;
    
    if (!subjectMap.has(subject)) {
      subjectMap.set(subject, {
        videos: [],
        totalSeconds: 0,
        watchedSeconds: 0,
      });
    }
    
    const subjectData = subjectMap.get(subject)!;
    subjectData.videos.push(video);
    
    // Obter duração - priorizar video.duration (salvo no Firestore), depois progressMap, depois estimativa
    const progress = progressMap[video.videoId];
    let durationSeconds = 0;
    
    // 1. Primeiro tentar usar duração salva no vídeo (do Firestore)
    if (video.duration !== null && video.duration !== undefined && video.duration > 0) {
      durationSeconds = video.duration;
    }
    // 2. Se não tiver, usar do progressMap
    else if (progress && progress.duration !== null && progress.duration > 0) {
      durationSeconds = progress.duration;
    }
    // 3. Por último, estimar baseado no tamanho
    else {
      durationSeconds = estimateDurationSeconds(video.sizeBytes);
    }
    
    subjectData.totalSeconds += durationSeconds;
    
    // Adicionar segundos assistidos
    if (progress && progress.watchedSeconds > 0) {
      subjectData.watchedSeconds += Math.min(progress.watchedSeconds, durationSeconds);
    }
  });
  
  // Converter para PerSubjectStat
  const perSubjectStats: PerSubjectStat[] = Array.from(subjectMap.entries()).map(([subject, data]) => {
    const totalMinutes = data.totalSeconds / 60;
    const watchedMinutes = data.watchedSeconds / 60;
    const watchedPercent = totalMinutes > 0 ? (watchedMinutes / totalMinutes) * 100 : 0;
    
    return {
      subject,
      videoCount: data.videos.length,
      totalMinutes,
      watchedMinutes,
      watchedPercent,
    };
  });
  
  // Calcular carga total
  const totalLoadMinutes = perSubjectStats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
  
  return {
    totalLoadMinutes,
    perSubjectStats,
  };
}

/**
 * Calcula estatísticas completas do planejador
 */
export function calculatePlannerStats(
  studyDays: StudyDay[],
  hoursPerWeekday: { [weekday: number]: number },
  videos: VideoFile[],
  progressMap: ProgressMap,
  selectedSubjects: string[]
): PlannerStats {
  const totalCapacityMinutes = computeCapacity(studyDays, hoursPerWeekday);
  const { totalLoadMinutes, perSubjectStats } = computeLoad(videos, progressMap, selectedSubjects);
  
  const excessMinutes = totalCapacityMinutes - totalLoadMinutes;
  const coveragePercent = totalLoadMinutes > 0 
    ? Math.min(100, Math.max(0, (totalCapacityMinutes / totalLoadMinutes) * 100))
    : 0;
  
  return {
    studyDaysCount: studyDays.length,
    totalCapacityMinutes,
    totalLoadMinutes,
    perSubjectStats,
    coveragePercent,
    excessMinutes,
  };
}

/**
 * Gera input para criação do plano (Etapa 4)
 */
export function generatePlanInput(
  studyDays: StudyDay[],
  hoursPerWeekday: { [weekday: number]: number },
  videos: VideoFile[],
  selectedSubjects: string[],
  subjectOrder: string[],
  plannerId?: string
): PlanInput {
  const selectedVideos = videos.filter(v => selectedSubjects.includes(v.subject));
  const selectedVideoIds = selectedVideos.map(v => v.videoId);
  
  return {
    studyDays,
    hoursPerWeekday,
    selectedVideoIds,
    selectedSubjects,
    subjectOrder,
    plannerId,
  };
}
