export const COL_EXERCISE_GYM_MEDIA = 'exerciseGymMedia';

export const EXERCISE_GYM_MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export type ExerciseGymMediaKind = 'image' | 'video';

export type ExerciseGymMedia = {
  id: string;
  patientUserId: string;
  patientDocId: string | null;
  exerciseId: string;
  kind: ExerciseGymMediaKind;
  url: string;
  storagePath: string;
  contentType: string;
  createdByUid: string;
  createdAt: string;
  updatedAt: string;
};

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

const VIDEO_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/3gpp',
  'video/3gpp2',
]);

export function gymMediaBelongsToPatient(
  media: Pick<ExerciseGymMedia, 'patientUserId' | 'patientDocId'>,
  patient: { id?: string | null; userId?: string | null }
): boolean {
  const docId = String(patient.id || '').trim();
  const userId = String(patient.userId || '').trim();
  const mediaDocId = String(media.patientDocId || '').trim();
  const mediaUserId = String(media.patientUserId || '').trim();
  if (mediaDocId && docId && mediaDocId !== docId) return false;
  if (mediaUserId && mediaUserId !== userId && mediaUserId !== docId) return false;
  return true;
}

export function exerciseGymMediaDocId(patientUserId: string, exerciseId: string): string {
  const patient = patientUserId.trim();
  const exercise = exerciseId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${patient}__${exercise}`;
}

export function guessMimeFromName(fileName: string): string {
  const ext = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === '3gp') return 'video/3gpp';
  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  return '';
}

export function classifyExerciseGymMedia(contentType: string): ExerciseGymMediaKind | null {
  const mime = contentType.toLowerCase().trim();
  if (!mime) return null;
  if (IMAGE_TYPES.has(mime) || mime.startsWith('image/')) return 'image';
  if (VIDEO_TYPES.has(mime) || mime.startsWith('video/')) return 'video';
  return null;
}

export function exerciseGymMediaExt(contentType: string, fileName?: string): string {
  const mime = contentType.toLowerCase().trim();
  const fromName = String(fileName || '')
    .split('.')
    .pop()
    ?.toLowerCase();
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'video/webm') return 'webm';
  if (mime === 'video/quicktime') return 'mov';
  if (mime === 'video/3gpp' || mime === 'video/3gpp2') return '3gp';
  if (mime.startsWith('video/')) return fromName === 'mov' ? 'mov' : 'mp4';
  if (fromName === 'png' || fromName === 'webp' || fromName === 'heic' || fromName === 'heif') {
    return fromName;
  }
  return 'jpg';
}
