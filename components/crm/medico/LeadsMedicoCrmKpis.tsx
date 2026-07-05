'use client';

import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { formatOrcamentoBrl } from '@/lib/crm/leadMedicoCrmUtils';
import type { CrmPipelineKpisView } from '@/types/leadMedicoCrm';

type Props = {
  pipelineKpis: CrmPipelineKpisView;
};

export default function LeadsMedicoCrmKpis({ pipelineKpis }: Props) {
  const t = useMedicoLeadsCrmTheme();
  const stageCount = pipelineKpis.stages.length;
  const gridClass =
    stageCount <= 4
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
      : stageCount <= 6
        ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';

  return (
    <div className={`grid ${gridClass} gap-2`}>
      <div className={`${t.cardBg} border ${t.cardBorder} rounded-xl px-3 py-3 min-w-0`}>
        <p className={`text-[10px] uppercase tracking-wide ${t.textSubtle} truncate`}>Total de Leads</p>
        <p className={`text-lg font-bold ${t.textPrimary} mt-1 tabular-nums`}>{pipelineKpis.totalLeads}</p>
      </div>

      {pipelineKpis.stages.map((stage) => (
        <div
          key={stage.stageKey}
          className={`${t.cardBg} border ${t.cardBorder} rounded-xl px-3 py-3 min-w-0`}
        >
          <p className={`text-[10px] uppercase tracking-wide ${t.textSubtle} truncate`} title={stage.label}>
            {stage.label}
          </p>
          <p className={`text-lg font-bold ${t.textPrimary} mt-1 tabular-nums`}>{stage.count}</p>
        </div>
      ))}

      <div className={`${t.cardBg} border ${t.cardBorder} rounded-xl px-3 py-3 min-w-0`}>
        <p className={`text-[10px] uppercase tracking-wide ${t.textSubtle} truncate`}>Receita Projetada</p>
        <p className={`text-lg font-bold ${t.textPrimary} mt-1 tabular-nums`}>
          {formatOrcamentoBrl(pipelineKpis.projectedRevenue)}
        </p>
      </div>
    </div>
  );
}
