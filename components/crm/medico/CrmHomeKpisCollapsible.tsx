'use client';

import HomeKpisCollapsible from '@/components/crm/HomeKpisCollapsible';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';

type Props = {
  children: React.ReactNode;
  /** Quando true, KPIs ficam recolhíveis no mobile (home metaadmin). */
  collapsibleOnMobile?: boolean;
};

export default function CrmHomeKpisCollapsible({ children, collapsibleOnMobile = false }: Props) {
  const t = useMedicoLeadsCrmTheme();
  return (
    <HomeKpisCollapsible collapsibleOnMobile={collapsibleOnMobile} theme={t}>
      {children}
    </HomeKpisCollapsible>
  );
}
