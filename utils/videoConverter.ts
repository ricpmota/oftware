/**
 * Utilitário para conversão de vídeos usando FFmpeg.wasm
 * Converte arquivos .ts (Transport Stream) para .mp4 (H.264)
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

/**
 * Carrega o FFmpeg (deve ser chamado apenas uma vez)
 */
async function loadFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    await loadPromise;
    return ffmpegInstance!;
  }

  loadPromise = (async () => {
    if (isLoading) return;
    isLoading = true;

    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      ffmpegInstance = ffmpeg;
      isLoading = false;
    } catch (error) {
      isLoading = false;
      loadPromise = null;
      console.error('Erro ao carregar FFmpeg:', error);
      throw error;
    }
  })();

  await loadPromise;
  return ffmpegInstance!;
}

/**
 * Converte um vídeo .ts para .mp4
 * @param file Arquivo .ts original
 * @param onProgress Callback para atualizar progresso (0-100)
 * @returns Promise com o Blob do vídeo convertido em MP4
 */
export async function convertTsToMp4(
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  try {
    console.log('Iniciando conversão de', file.name, '(', (file.size / 1024 / 1024).toFixed(2), 'MB)');
    const startTime = Date.now();

    const ffmpeg = await loadFFmpeg();

    // Configurar callback de progresso
    const progressHandler = onProgress
      ? ({ progress: p }: { progress: number }) => {
          // progress é um número entre 0 e 1, converter para porcentagem (0-100)
          const percentage = Math.min(100, Math.max(0, Math.round(p * 100)));
          onProgress(percentage);
        }
      : undefined;

    if (progressHandler) {
      ffmpeg.on('progress', progressHandler);
    }

    // Nome do arquivo de entrada
    const inputFileName = 'input.ts';
    const outputFileName = 'output.mp4';

    // Escrever arquivo de entrada no sistema de arquivos virtual do FFmpeg
    onProgress?.(5);
    await ffmpeg.writeFile(inputFileName, await fetchFile(file));
    onProgress?.(10);

    // Converter: .ts para .mp4 (H.264)
    await ffmpeg.exec([
      '-i',
      inputFileName,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-movflags',
      '+faststart',
      outputFileName,
    ]);

    // Ler arquivo de saída
    onProgress?.(95);
    const data = await ffmpeg.readFile(outputFileName);
    const blob = new Blob([data], { type: 'video/mp4' });

    // Limpar arquivos temporários
    await ffmpeg.deleteFile(inputFileName);
    await ffmpeg.deleteFile(outputFileName);

    // Remover listener de progresso
    if (progressHandler) {
      ffmpeg.off('progress', progressHandler);
    }

    onProgress?.(100);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('Conversão concluída em', duration, 'segundos. Tamanho:', (blob.size / 1024 / 1024).toFixed(2), 'MB');

    return blob;
  } catch (error) {
    console.error('Erro ao converter vídeo:', error);
    throw error;
  }
}

/**
 * Verifica se um arquivo precisa ser convertido
 */
export function needsConversion(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension === 'ts';
}
