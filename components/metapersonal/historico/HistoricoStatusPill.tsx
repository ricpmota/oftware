'use client';

import type { HistoryPerformanceStatus } from '@/lib/metapersonal/historicoAnalytics';
import { historyStatusLabel } from '@/lib/metapersonal/historicoAnalytics';

const PILL: Record<HistoryPerformanceStatus, string> = {
  excelente: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  boa: 'bg-blue-50 text-blue-700 border-blue-200',
  atencao: 'bg-amber-50 text-amber-800 border-amber-200',
  critica: 'bg-rose-50 text-rose-700 border-rose-200',
  'sem-dados': 'bg-gray-50 text-gray-600 border-gray-200',
};

export function HistoricoStatusPill({
  status,
  compact = false,
}: {
  status: HistoryPerformanceStatus;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${PILL[status]} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[11px]'
      }`}
    >
      {historyStatusLabel(status)}
    </span>
  );
}
