'use client';

import type { LucideIcon } from 'lucide-react';
import { BioImpedanciaTrendGlyph } from '@/components/bodymap/BioImpedanciaTrendGlyph';
import type { BioMetricStatus } from '@/utils/bioImpedanciaMetrics';
import { BIO_STATUS_STYLES } from '@/utils/bioImpedanciaMetrics';
import type { BioTrendDir } from '@/utils/bioImpedanciaTrend';

export interface BioMetricCardProps {
  label: string;
  value: string;
  unit?: string;
  status?: BioMetricStatus;
  trend?: BioTrendDir;
  helperText?: string | null;
  icon?: LucideIcon;
  priority?: 'default' | 'highlight';
  compact?: boolean;
  /** Badge customizado (ex.: grau de obesidade no IMC). Tem prioridade sobre `status`. */
  badge?: { label: string; pill: string };
  onClick?: () => void;
}

export function BioMetricCard({
  label,
  value,
  unit,
  status = 'neutro',
  trend = 'none',
  helperText,
  icon: Icon,
  priority = 'default',
  compact = false,
  badge,
  onClick,
}: BioMetricCardProps) {
  const statusStyle = BIO_STATUS_STYLES[status];
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`rounded-2xl border bg-white shadow-sm transition-shadow ${
        interactive ? 'cursor-pointer hover:shadow-md active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40' : 'hover:shadow-md'
      } ${
        priority === 'highlight' ? 'border-teal-200 ring-1 ring-teal-100' : 'border-gray-200'
      } ${compact ? 'p-3' : 'p-4 sm:p-5'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 flex-wrap">
        <span className={`font-semibold text-gray-900 tabular-nums ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {value}
        </span>
        {unit && <span className="text-sm text-gray-500 font-medium">{unit}</span>}
        {trend !== 'none' && <BioImpedanciaTrendGlyph dir={trend} />}
      </div>
      {badge ? (
        <span
          className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.pill}`}
        >
          {badge.label}
        </span>
      ) : (
        status !== 'neutro' && (
          <span
            className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle.pill}`}
          >
            {statusStyle.label}
          </span>
        )
      )}
      {helperText && (
        <p className={`mt-2 text-xs leading-snug ${compact ? 'text-gray-500' : 'text-gray-600'}`}>{helperText}</p>
      )}
    </div>
  );
}
