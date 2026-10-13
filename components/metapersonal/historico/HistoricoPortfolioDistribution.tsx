'use client';

import type { HistoryPerformanceStatus } from '@/lib/metapersonal/historicoAnalytics';
import { historyStatusLabel } from '@/lib/metapersonal/historicoAnalytics';

const BAR: Record<HistoryPerformanceStatus, string> = {
  excelente: 'bg-emerald-500',
  boa: 'bg-blue-500',
  atencao: 'bg-amber-500',
  critica: 'bg-rose-500',
  'sem-dados': 'bg-gray-300',
};

const ORDER: HistoryPerformanceStatus[] = [
  'excelente',
  'boa',
  'atencao',
  'critica',
  'sem-dados',
];

export function HistoricoPortfolioDistribution({
  distribution,
}: {
  distribution: Record<HistoryPerformanceStatus, number>;
}) {
  const max = Math.max(1, ...ORDER.map((key) => distribution[key]));

  return (
    <section className="flex h-full min-h-[220px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Distribuição da carteira</h2>
      <ul className="flex flex-1 flex-col justify-center gap-2.5">
        {ORDER.map((status) => {
          const count = distribution[status];
          const width = `${Math.max(count > 0 ? 8 : 0, (count / max) * 100)}%`;
          return (
            <li key={status} className="flex items-center gap-2">
              <span className="w-[72px] shrink-0 text-[12px] font-medium text-gray-600">
                {historyStatusLabel(status)}
              </span>
              <div className="h-2.5 min-w-0 flex-1 rounded-full bg-gray-100">
                <div
                  className={`h-2.5 rounded-full ${BAR[status]}`}
                  style={{ width: count === 0 ? '0%' : width }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-[12px] font-semibold text-gray-800">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
