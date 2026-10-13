'use client';

import { useEffect, useState } from 'react';
import VideoPlayerUrl from '@/components/oftpay/VideoPlayerUrl';

export default function MentorContentPlayer({
  videoUrl,
  title,
  videoId,
  startTime,
  onProgressUpdate,
  onPause,
}: {
  videoUrl?: string | null;
  title: string;
  videoId?: string;
  startTime?: number | null;
  onProgressUpdate?: (videoId: string, updates: { lastPosition: number; watchedSeconds: number; watched?: boolean; duration?: number }) => void;
  onPause?: () => void;
}) {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none)').matches);
  }, []);

  if (!videoUrl) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-slate-100">
        <div className="flex aspect-video items-center justify-center text-sm text-[var(--text-secondary)]">
          Vídeo indisponível no momento.
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-black">
      <div className="relative aspect-video w-full">
        <div className="absolute inset-0">
          <VideoPlayerUrl
            videoUrl={videoUrl}
            title={title}
            videoId={videoId}
            startTime={startTime && startTime > 0 ? startTime : null}
            hideTitleBar
            showPlayOverlay={isTouch}
            onProgressUpdate={onProgressUpdate}
            onPause={onPause}
          />
        </div>
      </div>
    </div>
  );
}
