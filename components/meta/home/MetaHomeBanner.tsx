'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Banner } from '@/types/banner';

export interface MetaHomeBannerProps {
  banners: Banner[];
  loading?: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onUserInteracted?: () => void;
}

export function MetaHomeBanner({
  banners,
  loading = false,
  currentIndex,
  onIndexChange,
  onUserInteracted,
}: MetaHomeBannerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  if (loading) {
    return (
      <div
        className="h-[140px] w-full min-w-0 animate-pulse rounded-[20px] bg-gray-200 md:h-[180px] lg:h-full lg:min-h-[240px]"
        aria-hidden
      />
    );
  }

  if (banners.length === 0) return null;

  const pauseAutoplayBriefly = () => {
    onUserInteracted?.();
  };

  return (
    <div
      className="relative h-[140px] w-full min-w-0 overflow-hidden rounded-[20px] bg-gray-100 md:h-[180px] lg:h-full lg:min-h-[240px] lg:self-stretch"
      style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
      onTouchStart={(e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
      }}
      onTouchMove={(e) => {
        setTouchEnd(e.targetTouches[0].clientX);
      }}
      onTouchEnd={() => {
        if (touchStart == null || touchEnd == null) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;
        if (isLeftSwipe && currentIndex < banners.length - 1) {
          onIndexChange(currentIndex + 1);
          pauseAutoplayBriefly();
        }
        if (isRightSwipe && currentIndex > 0) {
          onIndexChange(currentIndex - 1);
          pauseAutoplayBriefly();
        }
      }}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{
          transform: `translateX(-${currentIndex * (100 / banners.length)}%)`,
          width: `${banners.length * 100}%`,
        }}
      >
        {banners.map((banner) => (
          <Link
            key={banner.id}
            href={`/meta/banner/${banner.id}`}
            prefetch
            className="relative block h-full flex-shrink-0"
            style={{ width: `${100 / banners.length}%`, touchAction: 'manipulation' }}
          >
            <img
              src={banner.imagemUrl}
              alt={banner.titulo}
              className="h-full w-full object-cover object-center select-none pointer-events-none"
              draggable={false}
            />
          </Link>
        ))}
      </div>

      {banners.length > 1 && (
        <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onIndexChange(index);
                pauseAutoplayBriefly();
              }}
              className={`h-1.5 rounded-full transition-all pointer-events-auto ${
                index === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/55'
              }`}
              aria-label={`Banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
