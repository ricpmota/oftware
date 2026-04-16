import path from 'path';

const BUCKET = process.env.GCS_BUCKET || 'oftware';
const COURSE_PREFIX = process.env.GCS_COURSE_PREFIX || 'OFTREVIEW 2023/';
const TRANSCRIPTS_PREFIX = process.env.TRANSCRIPTS_PREFIX || 'transcripts/OFTREVIEW 2023/';
const TRANSCRIPTS_AUDIO_PREFIX =
  process.env.TRANSCRIPTS_AUDIO_PREFIX || 'transcripts-audio/OFTREVIEW 2023/';

/** Vídeos suportados pelo pipeline */
export const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.m4v', '.mkv'];

export function isVideoFile(objectName: string): boolean {
  const ext = path.extname(objectName).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/**
 * Mapeia objectName (ex: "OFTREVIEW 2023/modulo-01/aula-03.mp4") para URIs de saída espelhadas.
 * objectName deve começar com GCS_COURSE_PREFIX.
 */
export function objectNameToOutputPaths(objectName: string): {
  videoGcsUri: string;
  outputTxtGcsUri: string;
  outputJsonGcsUri: string;
  outputAudioGcsUri: string;
} {
  if (!objectName.startsWith(COURSE_PREFIX)) {
    throw new Error(`objectName deve começar com "${COURSE_PREFIX}": ${objectName}`);
  }
  const subpath = objectName.slice(COURSE_PREFIX.length);
  const ext = path.extname(subpath);
  const nameSemExt = subpath.slice(0, -ext.length);
  const base = TRANSCRIPTS_PREFIX.replace(/\/$/, '');
  const audioBase = TRANSCRIPTS_AUDIO_PREFIX.replace(/\/$/, '');

  return {
    videoGcsUri: `gs://${BUCKET}/${objectName}`,
    outputTxtGcsUri: `gs://${BUCKET}/${base}/${nameSemExt}.txt`,
    outputJsonGcsUri: `gs://${BUCKET}/${base}/${nameSemExt}.json`,
    outputAudioGcsUri: `gs://${BUCKET}/${audioBase}/${nameSemExt}.wav`,
  };
}

/** Extrai objectName (path no GCS) a partir de uma gs:// URI */
export function gcsUriToObjectName(uri: string): string {
  const match = uri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!match) throw new Error(`URI inválida: ${uri}`);
  return match[2];
}
