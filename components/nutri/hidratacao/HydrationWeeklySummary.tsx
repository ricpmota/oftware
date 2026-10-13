'use client';

import { formatHydrationLitersPerDay } from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationWeeklySummary as WeeklySummary } from '@/lib/nutri/hidratacao/hydrationTypes';

type HydrationWeeklySummaryProps = {
  summary: WeeklySummary;
};

export default function HydrationWeeklySummary({ summary }: HydrationWeeklySummaryProps) {
  const media =
    summary.averageConsumedMl == null ? '—' : formatHydrationLitersPerDay(summary.averageConsumedMl);
  const adesao = summary.averageAdherencePct == null ? '—' : `${summary.averageAdherencePct}%`;
  const metaAtingida =
    summary.daysRegistered === 0
      ? '—'
      : `${summary.daysGoalReached} de ${summary.daysRegistered}`;

  const items = [
    { label: 'Meta atingida', value: metaAtingida, hint: summary.daysRegistered === 1 ? 'dia registrado' : 'dias registrados' },
    { label: 'Média registrada', value: media, hint: 'só dias com registro' },
    { label: 'Adesão média', value: adesao, hint: 'nos dias registrados' },
    { label: 'Dias sem registro', value: String(summary.daysWithoutRecord), hint: 'não entram na média' },
  ];

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Últimos 7 dias</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-gray-200/80 bg-white/80 px-3 py-2.5 dark:border-white/10 dark:bg-[#0A1F44]/45"
          >
            <p className="text-[10px] font-medium uppercase tracking-wide text-[#0A1F44]/50 dark:text-[#E8EDED]/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">{item.value}</p>
            <p className="text-[10px] text-[#0A1F44]/45 dark:text-[#E8EDED]/45">{item.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
