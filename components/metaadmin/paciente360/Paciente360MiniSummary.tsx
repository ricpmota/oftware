'use client';

import {
  buildPaciente360CardTooltip,
  formatPaciente360DeltaKg,
  getPaciente360CardHighlight,
  type Paciente360CardTone,
} from '@/lib/paciente360/paciente360Labels';
import type { Paciente360Summary } from '@/types/paciente360';

type Props = {
  summary: Paciente360Summary;
  className?: string;
  lineClamp?: 1 | 2;
};

const TONE_CLASS: Record<Paciente360CardTone, string> = {
  neutral:
    'border-slate-200/70 bg-slate-50/60 text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300',
  warning:
    'border-amber-200/80 bg-amber-50/50 text-amber-800 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200',
  danger:
    'border-rose-200/80 bg-rose-50/50 text-rose-800 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-200',
  success:
    'border-emerald-200/70 bg-emerald-50/40 text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200',
};

function appendRelevantWeightDelta(line: string, summary: Paciente360Summary, tone: Paciente360CardTone): string {
  const delta = summary.resultado?.deltaPesoKg;
  if (tone !== 'neutral' || delta == null || delta >= -1) return line;
  return `${line} · ${formatPaciente360DeltaKg(delta)}`;
}

export default function Paciente360MiniSummary({ summary, className, lineClamp = 1 }: Props) {
  const highlight = getPaciente360CardHighlight(summary);
  const tooltip = buildPaciente360CardTooltip(summary);

  const displayLine = appendRelevantWeightDelta(
    highlight.subtitle ? `${highlight.title} · ${highlight.subtitle}` : highlight.title,
    summary,
    highlight.tone
  );

  return (
    <div
      className={`overflow-hidden rounded border px-2 py-1.5 text-[10px] sm:text-[11px] leading-snug text-left w-full max-w-full block box-border ${TONE_CLASS[highlight.tone]} ${className ?? 'mt-1.5 max-h-11'}`}
      title={tooltip || undefined}
      onClick={(e) => e.stopPropagation()}
    >
      <p className={`font-medium ${lineClamp === 2 ? 'line-clamp-2' : 'truncate'}`}>{displayLine}</p>
    </div>
  );
}
