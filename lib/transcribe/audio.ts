import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import fs from 'fs';
import path from 'path';
import os from 'os';

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

/**
 * Extrai áudio WAV mono 16kHz de um arquivo de vídeo.
 * Usado como entrada ideal para Speech-to-Text.
 */
export async function extractWavMono16k(
  inputPath: string,
  outputPath?: string
): Promise<string> {
  const out = outputPath || path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-acodec pcm_s16le', '-ar 16000', '-ac 1'])
      .output(out)
      .on('end', () => resolve(out))
      .on('error', reject)
      .run();
  });
}

/** Remove arquivo temporário se existir */
export function cleanupTmp(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // ignore
  }
}
