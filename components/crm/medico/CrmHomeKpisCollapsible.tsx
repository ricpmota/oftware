'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';

type Props = {
  children: React.ReactNode;
  /** Quando true, KPIs ficam recolhíveis no mobile (home metaadmin). */
  collapsibleOnMobile?: boolean;
};

export default function CrmHomeKpisCollapsible({ children, collapsibleOnMobile = false }: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [open, setOpen] = useState(false);

  if (!collapsibleOnMobile) {
    return <div className="space-y-3">{children}</div>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`lg:hidden flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${t.cardBg} ${t.cardBorder} ${t.textPrimary}`}
        aria-expanded={open}
      >
        <span>Detalhes</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''} ${t.textMuted}`}
          aria-hidden
        />
      </button>

      <div className={`space-y-3 ${open ? 'block' : 'hidden'} lg:block`}>{children}</div>
    </div>
  );
}
