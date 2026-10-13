'use client';

import type { MetodoEmagrecerIconName } from '@/components/metodo/MetodoEmagrecerIcon';
import DashboardInstitutionalIcon from '@/components/metaadmin/dashboard/DashboardInstitutionalIcon';
import type { OrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';

type Props = {
  totalMgAplicado: number;
  totalPesoPerdido: number;
  chrome?: OrganizationShellChrome | null;
};

function formatMetric(value: number): string {
  return value.toLocaleString('pt-BR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

function MetricSide({
  metodoIcon,
  chrome,
  label,
  value,
  unit,
  description,
}: {
  metodoIcon: MetodoEmagrecerIconName;
  chrome?: OrganizationShellChrome | null;
  label: string;
  value: number;
  unit: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5 sm:gap-4">
      <DashboardInstitutionalIcon icon={metodoIcon} chrome={chrome} className="h-11 w-11 sm:h-12 sm:w-12" />
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</p>
        <p className="mt-1 flex items-baseline gap-1.5 leading-none">
          <span className="text-[28px] font-extrabold tabular-nums text-[var(--text-primary)] md:text-[32px]">
            {formatMetric(value)}
          </span>
          <span className="text-[15px] font-semibold text-[var(--text-secondary)]">{unit}</span>
        </p>
        <p className="mt-2 text-[12px] text-[var(--text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

export default function DashboardTreatmentMetrics({ totalMgAplicado, totalPesoPerdido, chrome }: Props) {
  return (
    <div
      className="border bg-[var(--surface-card)] shadow-[0_8px_24px_rgba(17,24,39,0.04)]"
      style={{
        borderColor: 'var(--border-default)',
        borderRadius: 20,
      }}
    >
      <div className="grid grid-cols-1 divide-y divide-gray-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <MetricSide
            metodoIcon="aplicacao"
            chrome={chrome}
            label="Aplicações realizadas"
            value={totalMgAplicado}
            unit="mg"
            description="Total aplicado"
          />
        </div>
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <MetricSide
            metodoIcon="bio-impedancia"
            chrome={chrome}
            label="Perda de peso acumulada"
            value={Math.abs(totalPesoPerdido)}
            unit="kg"
            description="Total perdido"
          />
        </div>
      </div>
    </div>
  );
}
