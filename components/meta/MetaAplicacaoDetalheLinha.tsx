'use client';

import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export function MetaAplicacaoDetalheLinha({ label, value, valueClassName }: Props) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-200/70 dark:border-white/10 last:border-b-0">
      <span className="text-xs font-medium text-gray-500 dark:text-[#E8EDED]/55 shrink-0 pt-0.5">
        {label}
      </span>
      <span
        className={`text-sm font-medium text-right text-gray-900 dark:text-[#E8EDED] leading-snug ${valueClassName ?? ''}`}
      >
        {value}
      </span>
    </div>
  );
}
