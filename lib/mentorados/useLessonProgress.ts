'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  accumulateWatchDelta,
  PROGRESS_SAVE_INTERVAL_MS,
  watchedPercentageFromSeconds,
} from '@/lib/mentorados/progressMath';
import { saveMentorLessonProgress } from '@/services/mentorProgressService';
import type { MentorProgressDto } from '@/types/mentorTrail';

type FlushExtra = { complete?: boolean; uncomplete?: boolean };

export function useLessonProgress(params: {
  contentId?: string;
  trailId?: string;
  moduleId?: string;
  durationSeconds?: number;
  initial?: MentorProgressDto | null;
  onSynced?: (progress: MentorProgressDto) => void;
}) {
  const watchedRef = useRef(params.initial?.watchedSeconds || 0);
  const lastPosRef = useRef(params.initial?.lastPositionSeconds || 0);
  const tickPosRef = useRef(params.initial?.lastPositionSeconds || 0);
  const durationRef = useRef(params.durationSeconds || 0);
  const lastFlushRef = useRef(0);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<FlushExtra | true | null>(null);
  const onSyncedRef = useRef(params.onSynced);
  onSyncedRef.current = params.onSynced;

  useEffect(() => {
    watchedRef.current = params.initial?.watchedSeconds || 0;
    lastPosRef.current = params.initial?.lastPositionSeconds || 0;
    tickPosRef.current = params.initial?.lastPositionSeconds || 0;
  }, [params.contentId, params.initial?.watchedSeconds, params.initial?.lastPositionSeconds]);

  useEffect(() => {
    if (typeof params.durationSeconds === 'number' && params.durationSeconds > 0) {
      durationRef.current = params.durationSeconds;
    }
  }, [params.durationSeconds]);

  const flush = useCallback(
    async (extra?: FlushExtra) => {
      if (!params.contentId) return;
      if (inFlightRef.current) {
        if (extra) {
          const current = typeof pendingRef.current === 'object' && pendingRef.current ? pendingRef.current : {};
          pendingRef.current = { ...current, ...extra };
        } else if (!pendingRef.current) {
          pendingRef.current = true;
        }
        return;
      }
      inFlightRef.current = true;
      try {
        const result = await saveMentorLessonProgress({
          contentId: params.contentId,
          trailId: params.trailId,
          moduleId: params.moduleId,
          lastPositionSeconds: lastPosRef.current,
          watchedSeconds: watchedRef.current,
          durationSeconds: durationRef.current || undefined,
          complete: extra?.complete,
          uncomplete: extra?.uncomplete,
        });
        lastFlushRef.current = Date.now();
        onSyncedRef.current?.(result.progress);
      } catch {
        /* falha silenciosa — não interrompe o player */
      } finally {
        inFlightRef.current = false;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) {
          void flush(pending === true ? undefined : pending);
        }
      }
    },
    [params.contentId, params.trailId, params.moduleId]
  );

  const handlePlayerProgress = useCallback(
    (update: { lastPosition: number; watchedSeconds: number; watched?: boolean; duration?: number }) => {
      if (typeof update.duration === 'number' && update.duration > 0) {
        durationRef.current = update.duration;
      }
      const delta = accumulateWatchDelta(tickPosRef.current, update.lastPosition);
      if (delta) watchedRef.current += delta;
      tickPosRef.current = update.lastPosition;
      lastPosRef.current = update.lastPosition;
      if (update.watched) {
        void flush({ complete: true });
        return;
      }
      if (Date.now() - lastFlushRef.current >= PROGRESS_SAVE_INTERVAL_MS) {
        void flush();
      }
    },
    [flush]
  );

  const handlePause = useCallback(() => {
    void flush();
  }, [flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    const onPageHide = () => {
      void flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.addEventListener('pagehide', onPageHide);
      void flush();
    };
  }, [flush]);

  return {
    handlePlayerProgress,
    handlePause,
    markComplete: () => flush({ complete: true }),
    markUncomplete: () => flush({ uncomplete: true }),
    localPercentage: () =>
      watchedPercentageFromSeconds(watchedRef.current, durationRef.current || 0),
  };
}
