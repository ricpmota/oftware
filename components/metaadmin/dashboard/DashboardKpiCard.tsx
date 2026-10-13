'use client';

import type { LucideIcon } from 'lucide-react';
import type { MetodoEmagrecerIconName } from '@/components/metodo/MetodoEmagrecerIcon';
import DashboardInstitutionalIcon from '@/components/metaadmin/dashboard/DashboardInstitutionalIcon';
import type { OrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';

type Tone = 'amber' | 'blue' | 'green' | 'red';

const TONE_ICON_WRAP: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
};

type CommonProps = {
  label: string;
  value: number;
  description: string;
  /** Quando informado, exibe a participação de `value` sobre esse total. */
  total?: number;
  /** Fora do Método, `metodoIcon` vira ícone neutro. */
  chrome?: OrganizationShellChrome | null;
};

function formatShare(value: number, total: number): string {
  if (total <= 0 || value <= 0) return '0%';
  const pct = (value / total) * 100;
  if (pct < 1) return '<1%';
  return `${Math.round(pct)}%`;
}

type Props =
  | (CommonProps & { icon: LucideIcon; tone: Tone; metodoIcon?: undefined })
  | (CommonProps & { metodoIcon: MetodoEmagrecerIconName; icon?: undefined; tone?: undefined });

function LucideKpiIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${TONE_ICON_WRAP[tone]}`}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

function KpiGlyph(props: Props) {
  if (props.metodoIcon) {
    return <DashboardInstitutionalIcon icon={props.metodoIcon} chrome={props.chrome} size={40} />;
  }
  return <LucideKpiIcon icon={props.icon} tone={props.tone} />;
}

export default function DashboardKpiCard(props: Props) {
  const { label, value, description, total } = props;
  const showShare = typeof total === 'number';
  const shareLabel = showShare ? formatShare(value, total) : null;

  return (
    <div
      className={`min-w-0 border bg-[var(--surface-card)] ${showShare ? 'p-3 lg:p-6' : 'p-5 sm:p-6'}`}
      style={{
        borderColor: 'var(--border-default)',
        borderRadius: 18,
      }}
    >
      {showShare ? (
        <div className="flex items-center gap-2 lg:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <KpiGlyph {...props} />
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--text-secondary)]">{shareLabel}</span>
          </div>
          <p className="ml-auto shrink-0 text-[22px] font-extrabold leading-none text-[var(--text-primary)] lg:hidden">{value}</p>
        </div>
      ) : props.metodoIcon ? (
        <div className="mb-4 flex h-10 w-10 items-center justify-center">
          <DashboardInstitutionalIcon icon={props.metodoIcon} chrome={props.chrome} size={40} />
        </div>
      ) : (
        <LucideKpiIcon icon={props.icon} tone={props.tone} />
      )}
      {showShare ? (
        <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-secondary)] lg:hidden">
          <span className="text-[13px] font-medium">{label}</span>
          <span> · {description}</span>
        </p>
      ) : null}
      <p className={`text-[13px] font-medium text-[var(--text-secondary)] ${showShare ? 'hidden lg:block' : ''}`}>{label}</p>
      <p
        className={`text-[30px] font-extrabold leading-none text-[var(--text-primary)] md:text-[34px] ${
          showShare ? 'mt-1 hidden lg:block' : 'mt-1'
        }`}
      >
        {value}
      </p>
      <p className={`text-[12px] text-[var(--text-secondary)] ${showShare ? 'mt-2 hidden lg:block' : 'mt-2'}`}>{description}</p>
    </div>
  );
}
