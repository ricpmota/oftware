'use client';

import { mentorAuthFetch, readMentorJson } from '@/lib/mentorados/clientAuthFetch';
import type { MentorHomeResponse, MentorTrailDetailDto } from '@/types/mentorTrail';

export async function getMentorHome(): Promise<MentorHomeResponse> {
  const res = await mentorAuthFetch('/api/videosmentorados/home');
  return readMentorJson<MentorHomeResponse>(res);
}

export async function listMentorTrails() {
  const res = await mentorAuthFetch('/api/videosmentorados/trails');
  return readMentorJson<{
    trails: {
      id: string;
      title: string;
      slug: string;
      description?: string;
      shortDescription?: string;
      status: MentorHomeResponse['trails'][number]['status'];
      order?: number;
      featured?: boolean;
    }[];
    canManage: boolean;
  }>(res);
}

export async function getMentorTrailBySlug(slug: string): Promise<MentorTrailDetailDto & { canManage: boolean }> {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails?slug=${encodeURIComponent(slug)}`);
  return readMentorJson(res);
}

export async function createMentorTrail(input: {
  title: string;
  description?: string;
  shortDescription?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  slug?: string;
}) {
  const res = await mentorAuthFetch('/api/videosmentorados/trails', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true; id: string; slug: string }>(res);
}

export async function updateMentorTrail(
  id: string,
  input: {
    title?: string;
    description?: string;
    shortDescription?: string;
    status?: 'draft' | 'published' | 'archived';
    featured?: boolean;
    order?: number | null;
  }
) {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function deleteMentorTrail(id: string) {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function createMentorModule(trailId: string, input: { title: string; description?: string }) {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails/${encodeURIComponent(trailId)}/modules`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true; id: string }>(res);
}

export async function updateMentorModule(
  id: string,
  input: { title?: string; description?: string; status?: string; order?: number }
) {
  const res = await mentorAuthFetch(`/api/videosmentorados/modules/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function deleteMentorModule(id: string) {
  const res = await mentorAuthFetch(`/api/videosmentorados/modules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function addLessonToModule(moduleId: string, contentId: string) {
  const res = await mentorAuthFetch(`/api/videosmentorados/modules/${encodeURIComponent(moduleId)}/lessons`, {
    method: 'POST',
    body: JSON.stringify({ contentId }),
  });
  return readMentorJson<{ ok: true; id: string }>(res);
}

export async function removeTrailLesson(id: string) {
  const res = await mentorAuthFetch(`/api/videosmentorados/trail-lessons/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function reorderMentorTrail(
  trailId: string,
  payload: {
    modules?: { id: string; order: number }[];
    lessons?: { id: string; moduleId: string; order: number }[];
  }
) {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails/${encodeURIComponent(trailId)}/reorder`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return readMentorJson<{ ok: true }>(res);
}

export async function getMentorTrailAdmin(id: string): Promise<MentorTrailDetailDto & { canManage: boolean }> {
  const res = await mentorAuthFetch(`/api/videosmentorados/trails/${encodeURIComponent(id)}`);
  return readMentorJson(res);
}
