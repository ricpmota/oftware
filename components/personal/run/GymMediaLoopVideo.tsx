'use client';

import { useEffect, useRef } from 'react';

export function GymMediaLoopVideo({
  src,
  className,
  playing = true,
}: {
  src: string;
  className?: string;
  playing?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    el.loop = true;
    el.playsInline = true;
    el.setAttribute('playsinline', '');
    el.setAttribute('webkit-playsinline', '');

    const play = () => {
      if (!playing) return;
      const attempt = el.play();
      if (attempt) void attempt.catch(() => undefined);
    };

    if (playing) {
      play();
      el.addEventListener('loadeddata', play);
      el.addEventListener('canplay', play);
    } else {
      el.pause();
      el.currentTime = 0;
    }

    return () => {
      el.removeEventListener('loadeddata', play);
      el.removeEventListener('canplay', play);
    };
  }, [src, playing]);

  return (
    <video
      ref={videoRef}
      src={src}
      className={className}
      muted
      loop
      autoPlay={playing}
      playsInline
      preload="auto"
    />
  );
}
