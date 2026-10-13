'use client';

import type { CSSProperties } from 'react';
import MetodoEmagrecerIcon, { type MetodoEmagrecerIconName } from '@/components/metodo/MetodoEmagrecerIcon';
import type { OrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';
import {
  DASHBOARD_NEUTRAL_ICONS,
  shouldUseMetodoDashboardIcons,
  type DashboardNeutralIconTone,
} from '@/components/metaadmin/dashboard/dashboardNeutralIcons';

const TONE_WRAP: Record<DashboardNeutralIconTone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  neutral: 'bg-gray-100 text-gray-600',
};

type Props = {
  icon: MetodoEmagrecerIconName;
  chrome?: OrganizationShellChrome | null;
  size?: number;
  className?: string;
};

export default function DashboardInstitutionalIcon({ icon, chrome, size, className }: Props) {
  if (shouldUseMetodoDashboardIcons(chrome)) {
    return <MetodoEmagrecerIcon icon={icon} size={size} className={className} />;
  }
  const { Icon, tone } = DASHBOARD_NEUTRAL_ICONS[icon];
  const boxStyle: CSSProperties = { borderRadius: '20%' };
  if (size != null) {
    boxStyle.width = size;
    boxStyle.height = size;
  }
  return (
    <span
      aria-hidden="true"
      data-dashboard-neutral-icon={icon}
      className={['inline-flex shrink-0 items-center justify-center align-middle', TONE_WRAP[tone], className]
        .filter(Boolean)
        .join(' ')}
      style={boxStyle}
    >
      <Icon className="h-1/2 w-1/2" strokeWidth={2} />
    </span>
  );
}
