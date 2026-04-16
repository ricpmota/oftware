/**
 * Utilitários para carregar duração de vídeos de forma assíncrona
 */

/**
 * Carrega a duração de um vídeo a partir de um File
 * @param file Arquivo de vídeo
 * @returns Promise com a duração em segundos, ou null se não conseguir carregar
 */
export function loadVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);

    video.preload = 'metadata';

    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      video.src = '';
      resolve(null);
    }, 10000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      const duration = video.duration;
      if (duration && isFinite(duration) && duration > 0) {
        resolve(duration);
      } else {
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(null);
    };

    video.src = url;
  });
}

/**
 * Carrega durações de múltiplos vídeos em paralelo (com limite de concorrência)
 * @param files Array de objetos File
 * @param onProgress Callback chamado a cada duração carregada (videoId, duration)
 * @param maxConcurrent Número máximo de carregamentos simultâneos (padrão: 5)
 */
export async function loadVideoDurations(
  files: Array<{ file: File; videoId: string }>,
  onProgress?: (videoId: string, duration: number | null) => void,
  maxConcurrent: number = 5
): Promise<void> {
  let currentIndex = 0;
  const promises: Promise<void>[] = [];

  const processNext = async (): Promise<void> => {
    while (currentIndex < files.length) {
      const index = currentIndex++;
      const { file, videoId } = files[index];

      try {
        const duration = await loadVideoDuration(file);
        onProgress?.(videoId, duration);
      } catch (error) {
        console.error(`Erro ao carregar duração do vídeo ${videoId}:`, error);
        onProgress?.(videoId, null);
      }
    }
  };

  // Iniciar processadores paralelos
  for (let i = 0; i < Math.min(maxConcurrent, files.length); i++) {
    promises.push(processNext());
  }

  await Promise.all(promises);
}
