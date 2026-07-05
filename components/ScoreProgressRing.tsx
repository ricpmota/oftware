'use client';

type ScoreProgressRingProps = {
  /** Valor de 0 a 100 — preenche o anel e define o texto central. */
  percent: number;
  size?: number;
  stroke?: number;
  className?: string;
  title?: string;
};

function ringColorClass(percent: number): string {
  if (percent >= 90) return 'text-green-500';
  if (percent >= 70) return 'text-blue-500';
  if (percent >= 50) return 'text-amber-500';
  return 'text-red-500';
}

function barFillColorClass(percent: number): string {
  if (percent >= 90) return 'bg-green-500';
  if (percent >= 70) return 'bg-blue-500';
  if (percent >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

type ScoreProgressBarProps = {
  /** Valor de 0 a 100 — preenche a barra e define o texto central. */
  percent: number;
  className?: string;
  title?: string;
};

export function ScoreProgressBar({
  percent,
  className = '',
  title,
}: ScoreProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const label = String(clamped);

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-md bg-gray-200/90 ${className}`}
      aria-label={title ?? `Score ${label}`}
      title={title ?? `Score ${label}`}
    >
      <div
        className={`absolute inset-y-0 left-0 ${barFillColorClass(clamped)}`}
        style={{ width: `${clamped}%` }}
        aria-hidden
      />
      <span className="relative z-10 flex h-full items-center justify-center text-[10px] font-bold text-gray-800 leading-none tabular-nums">
        {label}
      </span>
    </div>
  );
}

export function ScoreProgressRing({
  percent,
  size = 44,
  stroke = 3.5,
  className = '',
  title,
}: ScoreProgressRingProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const label = String(clamped);

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-label={title ?? `Score ${label}`}
      title={title ?? `Score ${label}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-gray-200/90"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={ringColorClass(clamped)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-800 leading-none tabular-nums">
        {label}
      </span>
    </div>
  );
}
