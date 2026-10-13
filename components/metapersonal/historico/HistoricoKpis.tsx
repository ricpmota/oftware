'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';
import type { HistoryKpis } from '@/lib/metapersonal/historicoAnalytics';

type Tone = 'green' | 'blue' | 'amber' | 'rose' | 'slate';

const TONE: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-50 text-slate-600',
};

function Delta({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-[11px] font-medium text-gray-400">—</span>;
  }
  if (value > 0) {
    return <span className="text-[11px] font-semibold text-emerald-600">↑ {value}%</span>;
  }
  if (value < 0) {
    return <span className="text-[11px] font-semibold text-rose-600">↓ {Math.abs(value)}%</span>;
  }
  return <span className="text-[11px] font-medium text-gray-400">→ 0%</span>;
}

function KpiCard({
  label,
  value,
  suffix,
  delta,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: number | null;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-gray-600">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <p className="text-[22px] font-extrabold leading-none text-gray-900">{value}</p>
          {suffix ? <span className="text-[11px] text-gray-500">{suffix}</span> : null}
          {delta !== undefined ? <Delta value={delta} /> : null}
        </div>
      </div>
    </div>
  );
}

export function HistoricoKpis({ kpis }: { kpis: HistoryKpis }) {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      <KpiCard
        label="Adesão média"
        value={kpis.adherencePercent == null ? '—' : `${kpis.adherencePercent}%`}
        delta={kpis.adherenceDelta}
        icon={TrendingUp}
        tone="green"
      />
      <KpiCard
        label="Treinos realizados"
        value={String(kpis.doneCount)}
        suffix="sessões"
        icon={CheckCircle2}
        tone="blue"
      />
      <KpiCard
        label="Não realizados"
        value={String(kpis.missedCount)}
        suffix="sessões"
        icon={XCircle}
        tone="rose"
      />
      <KpiCard
        label="Em atenção"
        value={String(kpis.attentionCount)}
        suffix="pacientes"
        icon={AlertTriangle}
        tone="amber"
      />
      <KpiCard
        label="Consistência"
        value={kpis.consistencyPercent == null ? '—' : `${kpis.consistencyPercent}%`}
        suffix="dos pacientes"
        delta={kpis.consistencyDelta}
        icon={Activity}
        tone="slate"
      />
    </section>
  );
}

export function HistoricoKpisSkeleton() {
  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="h-[72px] animate-pulse rounded-2xl border border-gray-200 bg-white"
        />
      ))}
    </section>
  );
}
