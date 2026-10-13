export const LESSON_COMPLETE_PERCENT = 90;
export const PROGRESS_RESUME_REWIND_SECONDS = 5;
export const PROGRESS_SAVE_INTERVAL_MS = 12_000;
export const NATURAL_WATCH_MAX_DELTA_SECONDS = 20;

export function resumePositionSeconds(lastPositionSeconds: number): number {
  if (!Number.isFinite(lastPositionSeconds) || lastPositionSeconds <= 0) return 0;
  return Math.max(0, lastPositionSeconds - PROGRESS_RESUME_REWIND_SECONDS);
}

export function watchedPercentageFromSeconds(
  watchedSeconds: number,
  durationSeconds: number
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  const watched = Math.max(0, watchedSeconds || 0);
  return Math.min(100, Math.round((watched / durationSeconds) * 1000) / 10);
}

export function shouldAutoComplete(watchedPercentage: number): boolean {
  return watchedPercentage >= LESSON_COMPLETE_PERCENT;
}

export function mergeWatchedSeconds(
  existing: number,
  incoming: number,
  durationSeconds?: number
): number {
  const merged = Math.max(existing || 0, incoming || 0);
  if (durationSeconds && durationSeconds > 0) return Math.min(durationSeconds, merged);
  return merged;
}

/**
 * Acumula tempo assistido apenas quando o playback avança de forma contínua.
 * Seeks grandes não inflacionam watchedSeconds.
 */
export function accumulateWatchDelta(
  previousPosition: number,
  nextPosition: number,
  maxDelta = NATURAL_WATCH_MAX_DELTA_SECONDS
): number {
  const delta = nextPosition - previousPosition;
  if (delta > 0.25 && delta <= maxDelta) return delta;
  return 0;
}

export function trailProgressPercent(completed: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

export function formatMentorHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${Math.max(1, m)}min`;
}

export function mentorFirstName(nome?: string | null): string {
  const n = (nome || '').trim();
  if (!n) return '';
  return n.split(/\s+/)[0] || '';
}

export function progressDocId(userId: string, contentId: string): string {
  return `${userId}__${contentId}`;
}

export function trailLessonDocId(trailId: string, contentId: string): string {
  return `${trailId}__${contentId}`;
}
