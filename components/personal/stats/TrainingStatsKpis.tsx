'use client';

import type { SessionCompletionStats, TrainingStatsSeriesCounts } from '@/lib/personal/trainingStats';

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f2a5a]/85 via-[#0A1F44]/90 to-[#091936]/95 p-5 shadow-[0_16px_32px_-16px_rgba(76,203,122,0.35)]">
      <p className="text-xs uppercase tracking-wide text-[#E8EDED]/55">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-[#4CCB7A]">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-[#E8EDED]/55">{hint}</p> : null}
    </div>
  );
}

export function TrainingStatsKpis({
  completion,
  series,
}: {
  completion: SessionCompletionStats;
  series: TrainingStatsSeriesCounts;
}) {
  const rate =
    completion.completionRatePercent == null
      ? '—'
      : `${Math.round(completion.completionRatePercent)}%`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <KpiCard
        label="Treinos concluídos"
        value={String(completion.completed)}
        hint={`${completion.skipped} pulados · ${completion.scheduled} ainda agendados`}
      />
      <KpiCard
        label="Taxa de conclusão"
        value={rate}
        hint={`${completion.completed} de ${completion.programmed} sessões do período`}
      />
      <KpiCard
        label="Séries realizadas"
        value={series.total > 0 ? `${series.done}` : '—'}
        hint={
          series.total > 0
            ? `${series.done} de ${series.total} séries concluídas (execução série a série)`
            : 'Sem registro série a série neste período'
        }
      />
      <KpiCard label="Sessões no período" value={String(completion.programmed)} />
    </div>
  );
}

export default TrainingStatsKpis;
