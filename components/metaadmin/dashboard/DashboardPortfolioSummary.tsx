'use client';

import { useEffect, useState } from 'react';

type Props = {
  emTratamento: number;
  pendentes: number;
  concluidos: number;
  abandonos: number;
  legendClassName?: string;
};

const SEGMENTS = [
  { key: 'emTratamento', label: 'Em tratamento', barClass: 'bg-blue-600', dotClass: 'bg-blue-600' },
  { key: 'pendentes', label: 'Pendentes', barClass: 'bg-amber-600', dotClass: 'bg-amber-600' },
  { key: 'concluidos', label: 'Concluídos', barClass: 'bg-emerald-600', dotClass: 'bg-emerald-600' },
  { key: 'abandonos', label: 'Abandonos', barClass: 'bg-red-600', dotClass: 'bg-red-600' },
] as const;

export default function DashboardPortfolioSummary({
  emTratamento,
  pendentes,
  concluidos,
  abandonos,
  legendClassName,
}: Props) {
  const values = {
    emTratamento,
    pendentes,
    concluidos,
    abandonos,
  };
  const totalCarteiraStatus = emTratamento + pendentes + concluidos + abandonos;
  const [barReady, setBarReady] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setBarReady(true);
      return;
    }
    const frame = requestAnimationFrame(() => setBarReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const ariaLabel =
    totalCarteiraStatus === 0
      ? 'Distribuição da carteira: sem dados de status disponíveis.'
      : `Distribuição da carteira: ${emTratamento} em tratamento, ${pendentes} pendentes, ${concluidos} concluídos e ${abandonos} abandonos.`;

  return (
    <div
      className="border bg-[var(--surface-card)]"
      style={{
        borderColor: 'var(--border-default)',
        borderRadius: 18,
      }}
    >
      <div className="p-4 sm:px-5 sm:py-[18px]">
        <div className="mb-3 sm:mb-3.5">
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Resumo da carteira</h3>
          <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">Distribuição dos principais status</p>
        </div>

        <div
          className={`h-2.5 origin-left overflow-hidden rounded-full bg-gray-100 sm:h-3 motion-reduce:scale-x-100 motion-reduce:transition-none ${
            barReady ? 'scale-x-100' : 'scale-x-0'
          } transition-transform duration-700 ease-out`}
          role="img"
          aria-label={ariaLabel}
        >
          {totalCarteiraStatus > 0 ? (
            <div className="flex h-full w-full">
              {SEGMENTS.map((segment) => {
                const value = values[segment.key];
                if (value <= 0) return null;
                const pct = (value / totalCarteiraStatus) * 100;
                const pctLabel = pct.toLocaleString('pt-BR', {
                  maximumFractionDigits: 1,
                  minimumFractionDigits: 0,
                });
                return (
                  <div
                    key={segment.key}
                    className={`h-full ${segment.barClass}`}
                    style={{ width: `${pct}%` }}
                    title={`${segment.label}\n${value} ${value === 1 ? 'paciente' : 'pacientes'}\n${pctLabel}%`}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        {totalCarteiraStatus === 0 ? (
          <p className="mt-4 text-[13px] text-[var(--text-secondary)]">Sem dados de status disponíveis.</p>
        ) : (
          <ul
            className={
              legendClassName ??
              'mt-4 grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4 lg:gap-x-6'
            }
          >
            {SEGMENTS.map((segment) => {
              const value = values[segment.key];
              return (
                <li key={segment.key} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${segment.dotClass}`}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[15px] font-bold leading-none tabular-nums text-[var(--text-primary)]">
                      {value}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{segment.label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
