/**
 * Gerador de cronograma de estudo (ETAPA 4)
 * 
 * Distribui vídeos pelos dias de estudo de forma balanceada por tempo,
 * respeitando a ordem dos assuntos e a capacidade diária.
 */

import { PlanInput, Schedule, ScheduleDay, ScheduleItem, ScheduleSettings, SchedulePart } from '@/types/videoLibrary';
import { VideoFile } from '@/types/videoLibrary';
import { naturalSortBy } from '@/utils/naturalSort';

const SCHEDULE_VERSION = '1.0';

/**
 * Ordena vídeos dentro de um assunto: primeiro por folderPath, depois por name
 */
function sortVideosInSubject(videos: VideoFile[]): VideoFile[] {
  return naturalSortBy(videos, (video) => {
    // Primeiro ordenar por folderPath, depois por name
    const folderPath = video.folderPath || '';
    const name = video.name || '';
    return `${folderPath}/${name}`;
  });
}

/**
 * Calcula duração de um vídeo em segundos (prioriza video.duration, depois progressMap, depois estima)
 */
function getVideoDuration(video: VideoFile, progressMap: { [videoId: string]: { duration?: number | null } }): number {
  // 1. Primeiro tentar usar duração salva no vídeo (do Firestore)
  if (video.duration !== null && video.duration !== undefined && video.duration > 0) {
    return video.duration;
  }
  
  // 2. Se não tiver, usar do progressMap
  const progress = progressMap[video.videoId];
  if (progress?.duration && progress.duration > 0) {
    return progress.duration;
  }
  
  // 3. Por último, estimar baseado no tamanho (fallback simples)
  const bytesPerMinute = 1024 * 1024; // 1 MB por minuto
  const estimatedMinutes = video.sizeBytes / bytesPerMinute;
  return estimatedMinutes * 60;
}

/**
 * Divide um vídeo longo em partes
 */
function splitVideoIntoParts(
  video: VideoFile,
  durationSec: number,
  capacityMinutes: number
): ScheduleItem[] {
  const capacitySec = capacityMinutes * 60;
  const totalParts = Math.ceil(durationSec / capacitySec);
  
  const parts: ScheduleItem[] = [];
  
  for (let i = 0; i < totalParts; i++) {
    const startSec = i * capacitySec;
    const endSec = Math.min((i + 1) * capacitySec, durationSec);
    const partDurationSec = endSec - startSec;
    
    const part: SchedulePart = {
      partNumber: i + 1,
      totalParts,
      startSec,
      endSec,
      durationSec: partDurationSec,
    };
    
    parts.push({
      videoId: video.videoId,
      itemId: `${video.videoId}_part_${i + 1}`,
      isPart: true,
      part,
      subject: video.subject,
      name: video.name,
      folderPath: video.folderPath,
      durationSec: partDurationSec,
      estimatedDuration: false, // Assumimos que duration já foi carregada se estamos dividindo
      plannedMinutes: partDurationSec / 60,
    });
  }
  
  return parts;
}

/**
 * Gera cronograma sequencial por assunto (modo padrão)
 */
function generateSequentialSchedule(
  studyDays: { dateISO: string; weekday: number; hoursCapacity?: number }[],
  videosBySubject: Map<string, VideoFile[]>,
  subjectOrder: string[],
  hoursPerWeekday: { [weekday: number]: number },
  progressMap: { [videoId: string]: { duration?: number | null } },
  splitLongVideos: boolean
): ScheduleDay[] {
  // Garantir que os dias estão ordenados por data (do mais antigo para o mais recente)
  const sortedDays = [...studyDays].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  
  const scheduleDays: ScheduleDay[] = sortedDays.map(day => ({
    dateISO: day.dateISO,
    weekday: day.weekday,
    capacityMinutes: (day.hoursCapacity || hoursPerWeekday[day.weekday] || 0) * 60,
    items: [],
    plannedMinutes: 0,
    watchedMinutes: 0,
    progressPercent: 0,
  }));
  
  let currentDayIndex = 0;
  
  // Processar assuntos na ordem especificada
  for (const subject of subjectOrder) {
    const subjectVideos = videosBySubject.get(subject);
    if (!subjectVideos || subjectVideos.length === 0) continue;
    
    // Ordenar vídeos do assunto
    const sortedVideos = sortVideosInSubject(subjectVideos);
    
    // Processar cada vídeo do assunto
    for (const video of sortedVideos) {
      const durationSec = getVideoDuration(video, progressMap);
      const durationMinutes = durationSec / 60;
      const capacityMinutes = scheduleDays[currentDayIndex].capacityMinutes;
      
      if (splitLongVideos && durationMinutes > capacityMinutes) {
        // Dividir vídeo em partes
        const parts = splitVideoIntoParts(video, durationSec, capacityMinutes);
        
        // Alocar primeira parte no dia atual
        scheduleDays[currentDayIndex].items.push(parts[0]);
        scheduleDays[currentDayIndex].plannedMinutes += parts[0].plannedMinutes;
        
        // Alocar partes restantes nos próximos dias
        for (let i = 1; i < parts.length; i++) {
          // Avançar para próximo dia disponível (sem wrap-around - se acabaram os dias, parar)
          if (currentDayIndex + 1 >= scheduleDays.length) {
            console.warn(`Vídeo "${video.name}" não cabe completamente no período. Partes restantes não foram alocadas.`);
            break;
          }
          currentDayIndex = currentDayIndex + 1;
          scheduleDays[currentDayIndex].items.push(parts[i]);
          scheduleDays[currentDayIndex].plannedMinutes += parts[i].plannedMinutes;
        }
      } else {
        // Vídeo cabe no dia atual
        const remainingCapacity = capacityMinutes - scheduleDays[currentDayIndex].plannedMinutes;
        
        if (durationMinutes <= remainingCapacity) {
          // Cabe no dia atual
          scheduleDays[currentDayIndex].items.push({
            videoId: video.videoId,
            itemId: video.videoId,
            isPart: false,
            subject: video.subject,
            name: video.name,
            folderPath: video.folderPath,
            durationSec,
            estimatedDuration: !progressMap[video.videoId]?.duration,
            plannedMinutes: durationMinutes,
          });
          scheduleDays[currentDayIndex].plannedMinutes += durationMinutes;
        } else {
          // Não cabe, ir para próximo dia (sem wrap-around - se acabaram os dias, parar)
          if (currentDayIndex + 1 >= scheduleDays.length) {
            console.warn(`Vídeo "${video.name}" não cabe no período restante. Vídeo não foi alocado.`);
            break;
          }
          currentDayIndex = currentDayIndex + 1;
          scheduleDays[currentDayIndex].items.push({
            videoId: video.videoId,
            itemId: video.videoId,
            isPart: false,
            subject: video.subject,
            name: video.name,
            folderPath: video.folderPath,
            durationSec,
            estimatedDuration: !progressMap[video.videoId]?.duration,
            plannedMinutes: durationMinutes,
          });
          scheduleDays[currentDayIndex].plannedMinutes += durationMinutes;
        }
      }
      
      // Avançar para próximo dia se o dia atual está cheio (sem wrap-around)
      if (scheduleDays[currentDayIndex].plannedMinutes >= scheduleDays[currentDayIndex].capacityMinutes * 0.95) {
        if (currentDayIndex + 1 >= scheduleDays.length) {
          // Fim do período - parar de alocar
          break;
        }
        currentDayIndex = currentDayIndex + 1;
      }
    }
  }
  
  return scheduleDays;
}

/**
 * Gera cronograma intercalando assuntos (round-robin)
 */
function generateInterleavedSchedule(
  studyDays: { dateISO: string; weekday: number; hoursCapacity?: number }[],
  videosBySubject: Map<string, VideoFile[]>,
  subjectOrder: string[],
  hoursPerWeekday: { [weekday: number]: number },
  progressMap: { [videoId: string]: { duration?: number | null } },
  splitLongVideos: boolean
): ScheduleDay[] {
  // Garantir que os dias estão ordenados por data (do mais antigo para o mais recente)
  const sortedDays = [...studyDays].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  
  const scheduleDays: ScheduleDay[] = sortedDays.map(day => ({
    dateISO: day.dateISO,
    weekday: day.weekday,
    capacityMinutes: (day.hoursCapacity || hoursPerWeekday[day.weekday] || 0) * 60,
    items: [],
    plannedMinutes: 0,
    watchedMinutes: 0,
    progressPercent: 0,
  }));
  
  let currentDayIndex = 0;
  
  // Preparar filas de vídeos por assunto
  const videoQueues: Map<string, VideoFile[]> = new Map();
  for (const subject of subjectOrder) {
    const subjectVideos = videosBySubject.get(subject);
    if (subjectVideos && subjectVideos.length > 0) {
      videoQueues.set(subject, sortVideosInSubject([...subjectVideos]));
    }
  }
  
  // Round-robin: alternar entre assuntos até esgotar todos
  let hasVideos = true;
  while (hasVideos) {
    hasVideos = false;
    
    for (const subject of subjectOrder) {
      const queue = videoQueues.get(subject);
      if (!queue || queue.length === 0) continue;
      
      hasVideos = true;
      const video = queue.shift()!;
      const durationSec = getVideoDuration(video, progressMap);
      const durationMinutes = durationSec / 60;
      const capacityMinutes = scheduleDays[currentDayIndex].capacityMinutes;
      
      if (splitLongVideos && durationMinutes > capacityMinutes) {
        // Dividir vídeo em partes
        const parts = splitVideoIntoParts(video, durationSec, capacityMinutes);
        
        // Alocar primeira parte no dia atual
        scheduleDays[currentDayIndex].items.push(parts[0]);
        scheduleDays[currentDayIndex].plannedMinutes += parts[0].plannedMinutes;
        
        // Alocar partes restantes nos próximos dias
        for (let i = 1; i < parts.length; i++) {
          // Avançar para próximo dia disponível (sem wrap-around - se acabaram os dias, parar)
          if (currentDayIndex + 1 >= scheduleDays.length) {
            console.warn(`Vídeo "${video.name}" não cabe completamente no período. Partes restantes não foram alocadas.`);
            break;
          }
          currentDayIndex = currentDayIndex + 1;
          scheduleDays[currentDayIndex].items.push(parts[i]);
          scheduleDays[currentDayIndex].plannedMinutes += parts[i].plannedMinutes;
        }
      } else {
        // Vídeo cabe no dia atual
        const remainingCapacity = capacityMinutes - scheduleDays[currentDayIndex].plannedMinutes;
        
        if (durationMinutes <= remainingCapacity) {
          scheduleDays[currentDayIndex].items.push({
            videoId: video.videoId,
            itemId: video.videoId,
            isPart: false,
            subject: video.subject,
            name: video.name,
            folderPath: video.folderPath,
            durationSec,
            estimatedDuration: !progressMap[video.videoId]?.duration,
            plannedMinutes: durationMinutes,
          });
          scheduleDays[currentDayIndex].plannedMinutes += durationMinutes;
        } else {
          // Não cabe, ir para próximo dia (sem wrap-around - se acabaram os dias, parar)
          if (currentDayIndex + 1 >= scheduleDays.length) {
            console.warn(`Vídeo "${video.name}" não cabe no período restante. Vídeo não foi alocado.`);
            // Remover vídeo da fila para evitar loop infinito
            break;
          }
          currentDayIndex = currentDayIndex + 1;
          scheduleDays[currentDayIndex].items.push({
            videoId: video.videoId,
            itemId: video.videoId,
            isPart: false,
            subject: video.subject,
            name: video.name,
            folderPath: video.folderPath,
            durationSec,
            estimatedDuration: !progressMap[video.videoId]?.duration,
            plannedMinutes: durationMinutes,
          });
          scheduleDays[currentDayIndex].plannedMinutes += durationMinutes;
        }
      }
      
      // Avançar para próximo dia se necessário (balanceamento)
      // Se o dia está quase cheio (95%), avançar (sem wrap-around)
      if (scheduleDays[currentDayIndex].plannedMinutes >= scheduleDays[currentDayIndex].capacityMinutes * 0.95) {
        if (currentDayIndex + 1 >= scheduleDays.length) {
          // Fim do período - parar de alocar
          hasVideos = false;
          break;
        }
        currentDayIndex = currentDayIndex + 1;
      }
    }
  }
  
  return scheduleDays;
}

/**
 * Gera cronograma a partir de PlanInput
 */
export function generateSchedule(
  planInput: PlanInput,
  videos: VideoFile[],
  progressMap: { [videoId: string]: { duration?: number | null; watchedSeconds?: number; watched?: boolean } },
  settings: ScheduleSettings
): Schedule {
  // Filtrar vídeos selecionados
  const selectedVideos = videos.filter(v => planInput.selectedVideoIds.includes(v.videoId));
  
  // Agrupar vídeos por assunto
  const videosBySubject = new Map<string, VideoFile[]>();
  for (const video of selectedVideos) {
    if (!videosBySubject.has(video.subject)) {
      videosBySubject.set(video.subject, []);
    }
    videosBySubject.get(video.subject)!.push(video);
  }
  
  // Gerar cronograma
  const days = settings.intercalateSubjects
    ? generateInterleavedSchedule(
        planInput.studyDays,
        videosBySubject,
        planInput.subjectOrder,
        planInput.hoursPerWeekday,
        progressMap,
        settings.splitLongVideos
      )
    : generateSequentialSchedule(
        planInput.studyDays,
        videosBySubject,
        planInput.subjectOrder,
        planInput.hoursPerWeekday,
        progressMap,
        settings.splitLongVideos
      );
  
  return {
    plannerId: planInput.plannerId || '',
    planInput,
    settings,
    days,
    generatedAt: new Date().toISOString(),
    version: SCHEDULE_VERSION,
  };
}
