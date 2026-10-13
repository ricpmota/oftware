'use client';

import { AlertTriangle } from 'lucide-react';

type Props = {
  count: number;
  onReview: () => void;
};

export default function DashboardWeightDataQualityAlert({ count, onReview }: Props) {
  if (count <= 0) return null;
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div>
          <p className="text-[13px] font-semibold text-amber-900">Possível inconsistência detectada</p>
          <p className="mt-0.5 text-[12px] text-amber-800">
            {count === 1
              ? '1 registro pode estar influenciando esta análise.'
              : `${count} registros podem estar influenciando esta análise.`}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onReview}
        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100"
      >
        {count === 1 ? 'Revisar registro' : 'Revisar registros'}
      </button>
    </div>
  );
}
