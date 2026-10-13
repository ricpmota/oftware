'use client';

import { mentorAuthFetch, readMentorJson } from '@/lib/mentorados/clientAuthFetch';
import type { MentorProgressDto } from '@/types/mentorTrail';

export async function saveMentorLessonProgress(input: {
  contentId: string;
  trailId?: string;
  moduleId?: string;
  lastPositionSeconds: number;
  watchedSeconds: number;
  durationSeconds?: number;
  complete?: boolean;
  uncomplete?: boolean;
}) {
  const res = await mentorAuthFetch('/api/videosmentorados/progress', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return readMentorJson<{ ok: true; progress: MentorProgressDto }>(res);
}
