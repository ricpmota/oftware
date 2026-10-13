'use client';

import {
  calcHydrationPercentage,
  classifyHydrationAdherence,
  formatHydrationHistoryDate,
  formatHydrationMl,
  hydrationAdherenceLabel,
} from '@/lib/nutri/hidratacao/hydrationMath';
import type { HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';

type HydrationHistoryItemProps = {
  date: string;
  record: HydrationRecord | null;
};

export default function HydrationHistoryItem({ date, record }: HydrationHistoryItemProps) {
  const status = classifyHydrationAdherence({
    hasRecord: record != null,
    consumedMl: record?.consumedMl,
    goalMl: record?.goalMl,
  });
  const label = hydrationAdherenceLabel(status);
  const percentage = record ? calcHydrationPercentage(record.consumedMl, record.goalMl) : null;

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-gray-200/80 bg-white/80 px-3 py-3 dark:border-white/10 dark:bg-[#0A1F44]/40">
      <div>
        <p className="text-xs font-semibold tracking-wide text-[#0A1F44]/70 dark:text-[#E8EDED]/70">
          {formatHydrationHistoryDate(date)}
        </p>
        {record ? (
          <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">
            {formatHydrationMl(record.consumedMl).replace(' ml', '')} / {formatHydrationMl(record.goalMl)}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-[#0A1F44]/55 dark:text-[#E8EDED]/55">—</p>
        )}
      </div>
      <div className="text-right">
        {percentage != null ? (
          <p className="text-sm font-semibold tabular-nums text-[#0A1F44] dark:text-[#E8EDED]">{percentage}%</p>
        ) : null}
        <p
          className={`text-xs ${
            status === 'meta_atingida'
              ? 'font-semibold text-[#2F8FA3] dark:text-[#4CCB7A]'
              : status === 'nao_informado'
                ? 'text-[#0A1F44]/55 dark:text-[#E8EDED]/55'
                : 'text-[#0A1F44]/75 dark:text-[#E8EDED]/75'
          }`}
        >
          {status === 'meta_atingida' ? `${label} ✓` : label}
        </p>
      </div>
    </li>
  );
}
