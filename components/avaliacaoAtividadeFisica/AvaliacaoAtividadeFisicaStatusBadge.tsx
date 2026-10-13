'use client';

import type { AvaliacaoAtividadeFisicaStatus } from '@/types/avaliacaoAtividadeFisica';

const STATUS_META: Record<
  AvaliacaoAtividadeFisicaStatus,
  { label: string; className: string }
> = {
  draft: {
    label: 'Em preenchimento',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  completed: {
    label: 'Concluída',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  needs_review: {
    label: 'Precisa de revisão',
    className: 'bg-amber-50 text-amber-900 border-amber-200',
  },
};

export function AvaliacaoAtividadeFisicaStatusBadge({
  status,
  className = '',
}: {
  status: AvaliacaoAtividadeFisicaStatus | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border bg-slate-50 text-slate-500 border-slate-200 ${className}`}
      >
        Não iniciada
      </span>
    );
  }
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      className={`inline-flex px-2.5 py-0.5 text-xs font-semibold rounded-full border ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  );
}

export default AvaliacaoAtividadeFisicaStatusBadge;
