'use client';

export default function MentorProgressBar({
  percent,
  label,
  size = 'md',
}: {
  percent: number;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const value = Math.max(0, Math.min(100, Math.round(percent || 0)));
  return (
    <div className="w-full">
      <div
        className={`overflow-hidden rounded-full bg-slate-100 ${size === 'sm' ? 'h-1.5' : 'h-2'}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-label={label || `Progresso ${value}%`}
      >
        <div
          className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-200"
          style={{ width: `${value}%` }}
        />
      </div>
      {label ? (
        <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{label}</p>
      ) : null}
    </div>
  );
}
