import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ffmpegPath = ffmpegStatic || '/usr/bin/ffmpeg';
ffmpeg.setFfmpegPath(ffmpegPath);
console.log('[audio] ffmpeg path:', ffmpegPath);

/**
 * Converte vídeo para WAV mono 16kHz (ideal para Speech-to-Text).
 */
export async function extractWavMono16k(
  inputPath: string,
  outputPath?: string
): Promise<string> {
  const out =
    outputPath ||
    path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`);
  console.log(`[audio] Converting ${inputPath} -> ${out}`);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions(['-acodec pcm_s16le', '-ar 16000', '-ac 1'])
      .output(out)
      .on('end', () => {
        console.log(`[audio] Conversion ok: ${out}`);
        resolve(out);
      })
      .on('error', (err) => {
        console.error('[audio] ffmpeg error:', err.message);
        reject(err);
      })
      .run();
  });
}

export function cleanupTmp(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[audio] Cleaned tmp: ${filePath}`);
    }
  } catch {
    // ignore
  }
}
