'use client';

import { useId } from 'react';

type HydrationProgressBarProps = {
  percentage: number;
  goalReached: boolean;
  variant?: 'bar' | 'ring';
  size?: number;
};

export default function HydrationProgressBar({
  percentage,
  goalReached,
  variant = 'bar',
  size = 88,
}: HydrationProgressBarProps) {
  const gradientId = useId().replace(/:/g, '');
  const clamped = Math.min(100, Math.max(0, percentage));
  const displayPct = Math.max(0, Math.round(percentage));

  if (variant === 'ring') {
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - clamped / 100);
    return (
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        aria-label={`Progresso da meta de água: ${displayPct}%`}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-[#0A1F44]/10 dark:text-white/10"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-[stroke-dashoffset] duration-500"
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2F8FA3" />
              <stop offset="100%" stopColor="#4CCB7A" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`text-sm font-bold tabular-nums ${
              goalReached ? 'text-[#2F8FA3] dark:text-[#4CCB7A]' : 'text-[#0A1F44] dark:text-[#E8EDED]'
            }`}
          >
            {displayPct}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-[#0A1F44]/10 dark:bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label="Progresso da meta de água"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
