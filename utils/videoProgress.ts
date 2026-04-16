/**
 * Utilitários para gerenciar progresso de vídeos
 */

import { VideoProgress, ProgressMap, ProgressExport } from '@/types/videoLibrary';

const PROGRESS_STORAGE_KEY = 'videoLibraryProgress';
const THROTTLE_INTERVAL = 1000; // 1 segundo

/**
 * Última vez que o progresso foi salvo (para throttle)
 */
let lastSaveTime = 0;

/**
 * Carrega o progresso do localStorage
 */
export function loadProgress(): ProgressMap {
  try {
    const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as ProgressMap;
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
    return {};
  }
}

/**
 * Salva o progresso no localStorage (com throttle)
 */
export function saveProgress(progressMap: ProgressMap, force: boolean = false): void {
  const now = Date.now();
  
  // Throttle: só salva se passou 1 segundo desde a última vez, ou se forçado
  if (!force && now - lastSaveTime < THROTTLE_INTERVAL) {
    return;
  }

  try {
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressMap));
    lastSaveTime = now;
  } catch (error) {
    console.error('Erro ao salvar progresso:', error);
  }
}

/**
 * Obtém ou cria o progresso de um vídeo
 */
export function getVideoProgress(videoId: string, progressMap: ProgressMap): VideoProgress {
  if (!progressMap[videoId]) {
    progressMap[videoId] = {
      watched: false,
      lastPosition: 0,
      watchedSeconds: 0,
      duration: null,
      updatedAt: Date.now(),
    };
  }
  return progressMap[videoId];
}

/**
 * Atualiza o progresso de um vídeo
 */
export function updateVideoProgress(
  videoId: string,
  updates: Partial<VideoProgress>,
  progressMap: ProgressMap
): VideoProgress {
  const progress = getVideoProgress(videoId, progressMap);
  
  // Atualizar campos
  Object.assign(progress, updates, {
    updatedAt: Date.now(),
  });

  // Se watchedSeconds aumentou, atualizar
  if (updates.watchedSeconds !== undefined && updates.watchedSeconds > progress.watchedSeconds) {
    progress.watchedSeconds = updates.watchedSeconds;
  }

  // Regra de "assistido automático": se watchedSeconds >= 90% da duração
  if (progress.duration !== null && progress.duration > 0) {
    if (progress.watchedSeconds / progress.duration >= 0.9) {
      progress.watched = true;
    }
  }

  return progress;
}

/**
 * Calcula estatísticas do progresso
 */
export function calculateProgressStats(
  videos: Array<{ videoId: string; available?: boolean; duration?: number | null }>,
  progressMap: ProgressMap
) {
  const total = videos.length;
  let watched = 0;
  let totalHours = 0;
  let watchedHours = 0;
  let totalSeconds = 0;
  let watchedSeconds = 0;

  videos.forEach((video) => {
    if (video.available === false) return; // Pular vídeos indisponíveis

    const progress = progressMap[video.videoId];
    if (progress?.watched) {
      watched++;
    }

    // Priorizar duração do vídeo (salvo no Firestore), depois progressMap
    const videoDuration = (video.duration !== null && video.duration !== undefined && video.duration > 0)
      ? video.duration
      : (progress?.duration || 0);

    if (videoDuration > 0) {
      const hours = videoDuration / 3600;
      totalHours += hours;
      totalSeconds += videoDuration;

      if (progress?.watchedSeconds) {
        watchedHours += progress.watchedSeconds / 3600;
        watchedSeconds += progress.watchedSeconds;
      }
    }
  });

  const watchedPercentage = total > 0 ? (watched / total) * 100 : 0;
  const hasPartialData = totalSeconds > 0 && videos.some((v) => {
    const p = progressMap[v.videoId];
    return !p?.duration;
  });

  return {
    total,
    watched,
    watchedPercentage,
    totalHours,
    watchedHours,
    totalSeconds,
    watchedSeconds,
    hasPartialData,
  };
}

/**
 * Exporta o progresso para JSON
 */
export function exportProgress(progressMap: ProgressMap): string {
  const exportData: ProgressExport = {
    progressMap,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Importa progresso de JSON
 */
export function importProgress(json: string): ProgressMap | null {
  try {
    const data = JSON.parse(json) as ProgressExport;
    if (!data.progressMap) {
      throw new Error('Formato inválido: progressMap não encontrado');
    }
    return data.progressMap;
  } catch (error) {
    console.error('Erro ao importar progresso:', error);
    return null;
  }
}

/**
 * Reseta todo o progresso
 */
export function resetProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_STORAGE_KEY);
  } catch (error) {
    console.error('Erro ao resetar progresso:', error);
  }
}

/**
 * Determina o status de progresso de um vídeo
 */
export function getVideoStatus(
  videoId: string,
  progressMap: ProgressMap,
  available: boolean = true
): 'not_started' | 'in_progress' | 'watched' | 'unavailable' {
  if (!available) return 'unavailable';

  const progress = progressMap[videoId];
  if (!progress) return 'not_started';
  if (progress.watched) return 'watched';
  if (progress.lastPosition > 0) return 'in_progress';
  return 'not_started';
}

/**
 * Calcula a porcentagem assistida de um vídeo
 */
export function getVideoPercentage(videoId: string, progressMap: ProgressMap): number {
  const progress = progressMap[videoId];
  if (!progress || !progress.duration || progress.duration === 0) return 0;
  return (progress.watchedSeconds / progress.duration) * 100;
}
