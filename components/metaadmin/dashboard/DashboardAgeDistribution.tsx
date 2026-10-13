'use client';

import { useEffect, useState } from 'react';

export type AgeBandKey = '18-24' | '25-40' | '41-65' | '65+';

type Props = {
  percentages: Record<AgeBandKey, number>;
  hasData: boolean;
};

const BANDS: { key: AgeBandKey; label: string; color: string }[] = [
  { key: '18-24', label: '18–24 anos', color: 'var(--chart-2)' },
  { key: '25-40', label: '25–40 anos', color: '#4f46e5' },
  { key: '41-65', label: '41–65 anos', color: 'var(--chart-5)' },
  { key: '65+', label: '>65 anos', color: '#db2777' },
];

export default function DashboardAgeDistribution({ percentages, hasData }: Props) {
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setBarReady(true);
      return;
    }
    const frame = requestAnimationFrame(() => setBarReady(true));
    return () => cancelAnimationFrame(frame);
  }, [percentages]);

  return (
    <div className="min-w-0 flex-1">
      <h4 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)] sm:mb-4">
        Distribuição por Faixas Etárias
      </h4>

      {!hasData ? (
        <p className="text-[13px] text-[var(--text-secondary)]">Sem dados disponíveis</p>
      ) : (
        <>
          <div className="grid grid-cols-[minmax(5.75rem,7rem)_minmax(0,1fr)_3.25rem] items-center gap-x-3 gap-y-3">
            {BANDS.map((band) => {
              const pct = percentages[band.key] || 0;
              const width = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
              const pctLabel = width.toLocaleString('pt-BR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              });
              return (
                <div key={band.key} className="contents">
                  <span className="truncate text-[13px] text-[var(--text-secondary)]">{band.label}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full motion-reduce:transition-none"
                      style={{
                        width: barReady ? `${width}%` : 0,
                        backgroundColor: band.color,
                        transition: 'width 600ms ease-out',
                      }}
                    />
                  </div>
                  <span className="text-right text-[13px] font-semibold tabular-nums text-[var(--text-primary)]">
                    {pctLabel}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 hidden grid-cols-[minmax(5.75rem,7rem)_minmax(0,1fr)_3.25rem] gap-x-3 sm:grid">
            <span />
            <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
            <span />
          </div>
        </>
      )}
    </div>
  );
}
