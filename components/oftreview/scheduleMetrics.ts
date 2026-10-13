import type { ScheduleDay, ScheduleItem, ProgressMap } from '@/types/videoLibrary';
import { getVideoProgress } from '@/utils/videoProgress';

export const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0min';
  const hours = minutes / 60;
  if (hours >= 1) {
    return `${hours.toFixed(1)}h`;
  }
  return `${minutes.toFixed(0)}min`;
}

export function calculateItemProgress(item: ScheduleItem, progressMap: ProgressMap): {
  watchedMinutes: number;
  watchedSeconds: number;
  totalDuration: number;
  progressPercent: number;
  percent: number;
  status: 'not_started' | 'in_progress' | 'watched';
} {
  const progress = getVideoProgress(item.videoId, progressMap);

  let watchedSeconds = 0;
  let totalDuration = item.durationSec || 0;

  if (item.isPart && item.part) {
    const startSec = item.part.startSec;
    const endSec = item.part.endSec;
    totalDuration = endSec - startSec;

    if (progress) {
      watchedSeconds = Math.max(0, Math.min(progress.watchedSeconds - startSec, totalDuration));
    }
  } else if (progress) {
    watchedSeconds = progress.watchedSeconds;
    if (progress.duration && progress.duration > 0) {
      totalDuration = progress.duration;
    }
  }

  if (!progress || totalDuration === 0) {
    return {
      watchedMinutes: 0,
      watchedSeconds: 0,
      totalDuration,
      progressPercent: 0,
      percent: 0,
      status: 'not_started',
    };
  }

  const watchedMinutes = watchedSeconds / 60;
  const progressPercent = totalDuration > 0 ? (watchedSeconds / totalDuration) * 100 : 0;

  let status: 'not_started' | 'in_progress' | 'watched';
  if (progress.watched || progressPercent >= 90) {
    status = 'watched';
  } else if (watchedSeconds > 0) {
    status = 'in_progress';
  } else {
    status = 'not_started';
  }

  return {
    watchedMinutes,
    watchedSeconds,
    totalDuration,
    progressPercent,
    percent: progressPercent,
    status,
  };
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function groupDaysByWeek(days: ScheduleDay[]): Array<{ weekStart: Date; days: ScheduleDay[] }> {
  const weeks: Map<string, ScheduleDay[]> = new Map();

  days.forEach((day) => {
    const [year, month, dayNum] = day.dateISO.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, dayNum));
    const weekStart = new Date(date);
    const dayOfWeek = date.getUTCDay();
    weekStart.setUTCDate(date.getUTCDate() - dayOfWeek);
    weekStart.setUTCHours(0, 0, 0, 0);

    const weekKey = weekStart.toISOString();
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(day);
  });

  return Array.from(weeks.entries())
    .map(([weekKey, weekDays]) => ({
      weekStart: new Date(weekKey),
      days: weekDays.sort((a, b) => a.dateISO.localeCompare(b.dateISO)),
    }))
    .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

export function utcDateISO(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function localTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function findCurrentWeekIndex(weeks: Array<{ weekStart: Date }>): number {
  if (weeks.length === 0) return 0;
  const today = localTodayISO();
  const index = weeks.findIndex((week) => {
    const start = utcDateISO(week.weekStart);
    const endDate = new Date(week.weekStart);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    return today >= start && today <= utcDateISO(endDate);
  });
  if (index >= 0) return index;
  const firstStart = utcDateISO(weeks[0].weekStart);
  if (today < firstStart) return 0;
  return weeks.length - 1;
}

export function watchedPercentForItems(items: ScheduleItem[], progressMap: ProgressMap): number {
  let watched = 0;
  let total = 0;
  items.forEach((item) => {
    const itemProgress = calculateItemProgress(item, progressMap);
    if (itemProgress.totalDuration > 0) {
      watched += Math.min(itemProgress.watchedSeconds, itemProgress.totalDuration);
      total += itemProgress.totalDuration;
    } else if (item.plannedMinutes > 0) {
      watched += itemProgress.watchedMinutes * 60;
      total += item.plannedMinutes * 60;
    }
  });
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (watched / total) * 100));
}

export function weekEndISO(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setUTCDate(end.getUTCDate() + 6);
  return utcDateISO(end);
}
