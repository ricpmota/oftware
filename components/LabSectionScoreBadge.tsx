'use client';

import type { ScoreColor } from '@/lib/labExames/labSectionScore';

interface LabSectionScoreBadgeProps {
  score: number | null;
  color: ScoreColor;
}

const COLOR_CLASS: Record<ScoreColor, string> = {
  green: 'text-green-600',
  orange: 'text-amber-600',
  red: 'text-red-600',
  gray: 'text-gray-400',
};

export function LabSectionScoreBadge({ score, color }: LabSectionScoreBadgeProps) {
  return (
    <span className="text-xs font-medium whitespace-nowrap">
      Score:{' '}
      <span className={COLOR_CLASS[color]}>
        {score !== null ? `${score}%` : '—'}
      </span>
    </span>
  );
}
