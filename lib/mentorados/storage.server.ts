import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';

export const MENTOR_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'] as const;
export const MENTOR_THUMBNAIL_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const MENTOR_MAX_VIDEO_BYTES = 512 * 1024 * 1024;
export const MENTOR_MAX_THUMBNAIL_BYTES = 6 * 1024 * 1024;

export type MentorUploadKind = 'video' | 'thumbnail';

const VIDEO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-m4v': 'm4v',
};

const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function isMentorVideoMime(value: string): boolean {
  return (MENTOR_VIDEO_MIME_TYPES as readonly string[]).includes(value);
}

export function isMentorThumbnailMime(value: string): boolean {
  return (MENTOR_THUMBNAIL_MIME_TYPES as readonly string[]).includes(value);
}

export function sanitizeMentorFilename(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 80);
  return base || 'arquivo';
}

export function mentorStorageFolder(kind: MentorUploadKind, contentId: string): string {
  return kind === 'video'
    ? `mentorados/videos/${contentId}`
    : `mentorados/thumbnails/${contentId}`;
}

export function isMentorOwnedStoragePath(
  kind: MentorUploadKind,
  contentId: string,
  storagePath: string
): boolean {
  const prefix = `${mentorStorageFolder(kind, contentId)}/`;
  const trimmed = storagePath.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.startsWith('/')) return false;
  return trimmed.startsWith(prefix);
}

export function buildMentorStoragePath(
  kind: MentorUploadKind,
  contentId: string,
  filename: string,
  contentType: string
): string {
  const extFromName = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() : '';
  const extFromMime =
    kind === 'video' ? VIDEO_EXT[contentType] : IMAGE_EXT[contentType];
  const ext = extFromMime || extFromName || (kind === 'video' ? 'mp4' : 'jpg');
  const safeName = sanitizeMentorFilename(filename.replace(/\.[^.]+$/, ''));
  const stamp = Date.now();
  return `${mentorStorageFolder(kind, contentId)}/${stamp}_${safeName}.${ext}`;
}

export async function createMentorSignedWriteUrl(params: {
  storagePath: string;
  contentType: string;
  expiresMs?: number;
}): Promise<{ uploadUrl: string; expiresAt: string }> {
  const bucket = getAdminStorageBucket();
  const file = bucket.file(params.storagePath);
  const expires = Date.now() + (params.expiresMs ?? 15 * 60 * 1000);
  const [uploadUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires,
    contentType: params.contentType,
  });
  return { uploadUrl, expiresAt: new Date(expires).toISOString() };
}

export async function createMentorSignedReadUrl(
  storagePath: string | undefined,
  expiresMs = 2 * 60 * 60 * 1000
): Promise<string | undefined> {
  const path = storagePath?.trim();
  if (!path) return undefined;
  const bucket = getAdminStorageBucket();
  const file = bucket.file(path);
  const [exists] = await file.exists();
  if (!exists) return undefined;
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresMs,
  });
  return url;
}

export async function deleteMentorStoragePath(storagePath?: string | null): Promise<void> {
  const path = storagePath?.trim();
  if (!path) return;
  const bucket = getAdminStorageBucket();
  try {
    await bucket.file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.error('[mentorados] falha ao excluir arquivo', path, error);
  }
}

export async function deleteMentorContentFiles(params: {
  videoStoragePath?: string | null;
  thumbnailStoragePath?: string | null;
}): Promise<void> {
  await Promise.all([
    deleteMentorStoragePath(params.videoStoragePath),
    deleteMentorStoragePath(params.thumbnailStoragePath),
  ]);
}
