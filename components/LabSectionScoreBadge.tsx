'use client';

import type { ScoreColor } from '@/lib/labExames/labSectionScore';

interface LabSectionScoreBadgeProps {
  score: number | null;
  color: ScoreColor;
}

const COLOR_CLASS: Record<ScoreColor, string> = {
  green: 'text-emerald-600',
  orange: 'text-amber-600',
  red: 'text-red-600',
  gray: 'text-slate-400',
};

export function LabSectionScoreBadge({ score, color }: LabSectionScoreBadgeProps) {
  return (
    <span className="whitespace-nowrap text-[13px] leading-tight text-slate-500">
      Score:{' '}
      <span className={`font-semibold tabular-nums ${COLOR_CLASS[color]}`}>
        {score !== null ? `${score}%` : '—'}
      </span>
    </span>
  );
}
