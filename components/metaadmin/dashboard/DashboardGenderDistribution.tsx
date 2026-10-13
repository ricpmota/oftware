'use client';

import { useEffect, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type Props = {
  feminino: number;
  masculino: number;
  outro?: number;
  semInformacao?: number;
};

const COLORS = {
  feminino: '#059669',
  masculino: '#2563eb',
  outro: '#7c3aed',
} as const;

function formatPct(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export default function DashboardGenderDistribution({
  feminino,
  masculino,
  outro = 0,
  semInformacao = 0,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const slices = useMemo(() => {
    const raw = [
      { name: 'Feminino', value: feminino, color: COLORS.feminino },
      { name: 'Masculino', value: masculino, color: COLORS.masculino },
      { name: 'Outro', value: outro, color: COLORS.outro },
    ].filter((item) => item.value > 0);
    const total = raw.reduce((sum, item) => sum + item.value, 0);
    return raw.map((item) => ({
      ...item,
      porcentagem: total > 0 ? (item.value / total) * 100 : 0,
    }));
  }, [feminino, masculino, outro]);

  const totalInformado = feminino + masculino + outro;
  const hasData = totalInformado > 0 && slices.length > 0;

  const ariaLabel = hasData
    ? `Distribuição por sexo: ${slices
        .map(
          (item) =>
            `${item.name}, ${item.value} ${item.value === 1 ? 'paciente' : 'pacientes'}, ${formatPct(item.porcentagem)}%`
        )
        .join('; ')}.`
    : 'Distribuição por sexo: sem dados de sexo disponíveis.';

  return (
    <div className="min-w-0 w-full xl:w-[280px] xl:shrink-0">
      <h4 className="mb-4 text-center text-[13px] font-semibold text-[var(--text-primary)] xl:text-left">
        Distribuição por sexo
      </h4>

      {!hasData ? (
        <div className="py-6 text-center xl:text-left">
          <p className="text-[36px] font-extrabold leading-none text-[var(--text-primary)]">—</p>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">Sem dados de sexo disponíveis</p>
          {semInformacao > 0 ? (
            <p className="mt-2 text-[12px] text-[var(--text-secondary)]">
              {semInformacao} paciente{semInformacao !== 1 ? 's' : ''} sem informação
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative h-[150px] w-[150px] sm:h-[168px] sm:w-[168px]"
            role="img"
            aria-label={ariaLabel}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="72%"
                  outerRadius="96%"
                  paddingAngle={slices.length > 1 ? 2 : 0}
                  stroke="none"
                  isAnimationActive={!reduceMotion}
                  animationDuration={600}
                >
                  {slices.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, item) => {
                    const pct = Number(item?.payload?.porcentagem);
                    const pctLabel = Number.isFinite(pct) ? formatPct(pct) : '0,0';
                    const count = typeof value === 'number' ? value : 0;
                    return [
                      `${count} ${count === 1 ? 'paciente' : 'pacientes'} (${pctLabel}%)`,
                      String(name),
                    ];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[28px] font-extrabold leading-none tabular-nums text-[var(--text-primary)] sm:text-[32px]">
                {totalInformado}
              </span>
              <span className="mt-1 text-[12px] text-[var(--text-secondary)]">pacientes</span>
            </div>
          </div>

          <ul className="w-full">
            {slices.map((item) => (
              <li
                key={item.name}
                className="flex items-start gap-2.5 border-b border-gray-100 py-3 last:border-b-0 last:pb-0 first:pt-0"
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{item.name}</p>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <p className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                      {item.value} {item.value === 1 ? 'paciente' : 'pacientes'}
                    </p>
                    <p className="text-[13px] font-bold tabular-nums text-[var(--text-primary)]">
                      {formatPct(item.porcentagem)}%
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {semInformacao > 0 ? (
            <p className="w-full text-[12px] text-[var(--text-secondary)]">
              {semInformacao} paciente{semInformacao !== 1 ? 's' : ''} sem informação
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
