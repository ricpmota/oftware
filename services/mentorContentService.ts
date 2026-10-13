'use client';

import { mentorAuthFetch, readMentorJson } from '@/lib/mentorados/clientAuthFetch';
import type { MentorCategory, MentorCategoryCounts, MentorContentDto } from '@/types/mentorContent';
import type { MentorProgressDto, MentorTrailContextDto } from '@/types/mentorTrail';

export type MentorSession = {
  canAccess: boolean;
  canManage: boolean;
  medico: {
    id: string;
    nome?: string;
    email?: string;
    isVerificado: boolean;
    uploadMentor: boolean;
  } | null;
};

export type MentorListResponse = {
  contents: MentorContentDto[];
  countsByCategory: MentorCategoryCounts;
  canAccess: boolean;
  canManage: boolean;
};

export type MentorContentWriteInput = {
  id?: string;
  title: string;
  description?: string;
  category: MentorCategory;
  tags?: string[];
  videoStoragePath?: string;
  thumbnailStoragePath?: string;
  durationSeconds?: number;
  order?: number | null;
  featured?: boolean;
  status?: 'draft' | 'published' | 'archived';
};

export async function getMentorSession(): Promise<MentorSession> {
  const res = await mentorAuthFetch('/api/videosmentorados/session');
  return readMentorJson<MentorSession>(res);
}

export async function getMentorContents(): Promise<MentorListResponse> {
  const res = await mentorAuthFetch('/api/videosmentorados/contents');
  return readMentorJson<MentorListResponse>(res);
}

export async function getMentorContentBySlug(
  slug: string,
  trailSlug?: string
): Promise<{
  content: MentorContentDto;
  canManage: boolean;
  progress?: MentorProgressDto | null;
  resumeAtSeconds?: number;
  trailContext?: MentorTrailContextDto | null;
}> {
  const params = new URLSearchParams({ slug });
  if (trailSlug) params.set('trailSlug', trailSlug);
  const res = await mentorAuthFetch(`/api/videosmentorados/contents?${params.toString()}`);
  return readMentorJson(res);
}

export async function createMentorContent(input: MentorContentWriteInput) {
  const res = await mentorAuthFetch('/api/videosmentorados/contents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true; content: MentorContentDto }>(res);
}

export async function updateMentorContent(id: string, input: Partial<MentorContentWriteInput>) {
  const res = await mentorAuthFetch(`/api/videosmentorados/contents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true; content: MentorContentDto }>(res);
}

export async function deleteMentorContent(id: string) {
  const res = await mentorAuthFetch(`/api/videosmentorados/contents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function requestMentorUploadUrl(input: {
  kind: 'video' | 'thumbnail';
  filename: string;
  contentType: string;
  size: number;
  contentId?: string;
}) {
  const res = await mentorAuthFetch('/api/videosmentorados/upload-url', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readMentorJson<{
    contentId: string;
    storagePath: string;
    uploadUrl: string;
    contentType: string;
    expiresAt: string;
  }>(res);
}

export function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error('Falha no envio do arquivo. Tente novamente.'));
    };
    xhr.onerror = () => reject(new Error('Falha de rede durante o upload.'));
    xhr.onabort = () => reject(new Error('Upload cancelado.'));
    xhr.send(file);
  });
}
