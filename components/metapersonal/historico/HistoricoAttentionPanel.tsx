'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { HistoryAttentionItem } from '@/lib/metapersonal/historicoAnalytics';

export function HistoricoAttentionPanel({
  items,
  onSelect,
}: {
  items: HistoryAttentionItem[];
  onSelect: (patientKey: string) => void;
}) {
  return (
    <section className="flex h-full min-h-[220px] flex-col rounded-2xl border border-rose-100 bg-rose-50/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-rose-500" />
        <h2 className="text-sm font-semibold text-gray-900">Atenção necessária</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-gray-500">Nenhum paciente em atenção neste período.</p>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto">
          {items.slice(0, 6).map((item) => (
            <li key={item.patientKey}>
              <button
                type="button"
                onClick={() => onSelect(item.patientKey)}
                className="flex w-full items-start justify-between gap-2 rounded-xl border border-rose-100 bg-white px-3 py-2 text-left hover:border-rose-200"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{item.name}</p>
                  {item.reasons.slice(0, 2).map((reason) => (
                    <p key={reason} className="truncate text-[11px] text-gray-500">
                      {reason}
                    </p>
                  ))}
                </div>
                <span className="inline-flex shrink-0 items-center gap-0.5 pt-0.5 text-[11px] font-semibold text-rose-600">
                  Ver
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
