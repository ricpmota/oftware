'use client';

import { Pause, Play } from 'lucide-react';
import { formatRestClock } from '@/lib/personal/formatRestClock';

export function WorkoutRunRestTimer({
  secondsLeft,
  totalSeconds,
  running,
  nextLabel,
  logoSrc,
  logoAlt = 'Organização',
  compact = false,
  onTogglePause,
  onSkip,
}: {
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
  nextLabel?: string | null;
  logoSrc?: string | null;
  logoAlt?: string;
  compact?: boolean;
  onTogglePause: () => void;
  onSkip: () => void;
}) {
  const total = Math.max(1, totalSeconds);
  const progress = Math.max(0, Math.min(1, secondsLeft / total));
  const size = compact ? 148 : 236;
  const stroke = compact ? 8 : 12;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className={`flex flex-col items-center ${compact ? 'gap-3 px-2' : 'gap-5 px-6'} w-full`}
    >
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt={logoAlt}
          className={`object-contain ${compact ? 'h-8 max-w-[140px]' : 'h-12 max-w-[220px]'} opacity-95`}
        />
      ) : null}

      <p className={`font-medium text-[#E8EDED]/60 ${compact ? 'text-xs' : 'text-sm'}`}>
        Descanso
      </p>

      <div
        className="relative"
        role="timer"
        aria-label="Tempo de descanso restante"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={secondsLeft}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#4CCB7A"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: running ? 'stroke-dashoffset 1s linear' : 'none',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`font-mono font-bold text-[#4CCB7A] tabular-nums leading-none ${
              compact ? 'text-3xl' : 'text-5xl'
            }`}
          >
            {formatRestClock(secondsLeft)}
          </span>
        </div>
      </div>

      {nextLabel ? (
        <p
          className={`text-[#E8EDED]/55 text-center max-w-xs ${
            compact ? 'text-xs' : 'text-sm'
          }`}
        >
          {nextLabel}
        </p>
      ) : null}

      <div className={`flex gap-2 w-full ${compact ? 'max-w-none' : 'max-w-sm'}`}>
        <button
          type="button"
          onClick={onTogglePause}
          className={`flex-1 rounded-xl font-semibold flex items-center justify-center gap-2 bg-white/10 text-[#E8EDED] hover:bg-white/15 ${
            compact ? 'py-2 text-sm' : 'py-3'
          }`}
        >
          {running ? <Pause className={compact ? 'w-4 h-4' : 'w-5 h-5'} /> : <Play className={compact ? 'w-4 h-4' : 'w-5 h-5'} />}
          {running ? 'Pausar' : 'Continuar'}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className={`flex-1 rounded-xl font-semibold bg-white/10 text-[#E8EDED] hover:bg-white/15 ${
            compact ? 'py-2 text-sm' : 'py-3'
          }`}
        >
          Pular descanso
        </button>
      </div>
    </div>
  );
}

export default WorkoutRunRestTimer;
