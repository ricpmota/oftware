'use client';

import { Users, Wallet } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { formatOrcamentoBrl } from '@/lib/crm/leadMedicoCrmUtils';
import { pipelineStageKpiVisual } from '@/lib/crm/pipelineKpiVisual';
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
  const desktopCount = stageCount + 2;

  return (
    <>
      <div className={`grid ${gridClass} gap-2 lg:hidden`}>
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

      <div className="hidden lg:block overflow-x-auto pb-1">
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${desktopCount}, minmax(8.75rem, 1fr))`,
            minWidth: desktopCount > 7 ? `${desktopCount * 8.75}rem` : undefined,
          }}
        >
          <DesktopKpiTile
            label="Total de Leads"
            value={String(pipelineKpis.totalLeads)}
            containerClass="bg-emerald-50 dark:bg-emerald-500/15"
            iconClass="text-emerald-700 dark:text-emerald-300"
            Icon={Users}
            cardBg={t.cardBg}
            cardBorder={t.cardBorder}
            textPrimary={t.textPrimary}
            textSubtle={t.textSubtle}
          />
          {pipelineKpis.stages.map((stage) => {
            const visual = pipelineStageKpiVisual(stage.stageKey);
            return (
              <DesktopKpiTile
                key={stage.stageKey}
                label={stage.label}
                value={String(stage.count)}
                containerClass={visual.containerClass}
                iconClass={visual.iconClass}
                Icon={visual.Icon}
                cardBg={t.cardBg}
                cardBorder={t.cardBorder}
                textPrimary={t.textPrimary}
                textSubtle={t.textSubtle}
              />
            );
          })}
          <DesktopKpiTile
            label="Receita Projetada"
            value={formatOrcamentoBrl(pipelineKpis.projectedRevenue)}
            containerClass="bg-emerald-50 dark:bg-emerald-500/15"
            iconClass="text-emerald-700 dark:text-emerald-300"
            Icon={Wallet}
            cardBg={t.cardBg}
            cardBorder={t.cardBorder}
            textPrimary={t.textPrimary}
            textSubtle={t.textSubtle}
          />
        </div>
      </div>
    </>
  );
}

function DesktopKpiTile({
  label,
  value,
  Icon,
  containerClass,
  iconClass,
  cardBg,
  cardBorder,
  textPrimary,
  textSubtle,
}: {
  label: string;
  value: string;
  Icon: typeof Users;
  containerClass: string;
  iconClass: string;
  cardBg: string;
  cardBorder: string;
  textPrimary: string;
  textSubtle: string;
}) {
  return (
    <div className={`${cardBg} border ${cardBorder} min-w-0 rounded-2xl px-3 py-3 shadow-sm`}>
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${containerClass}`}>
        <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
      </div>
      <p className={`truncate text-[11px] font-medium ${textSubtle}`} title={label}>
        {label}
      </p>
      <p className={`mt-0.5 truncate text-lg font-bold tabular-nums ${textPrimary}`}>{value}</p>
    </div>
  );
}
