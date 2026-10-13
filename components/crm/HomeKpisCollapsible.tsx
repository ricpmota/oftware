'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { WhiteLabelCrmTheme } from '@/lib/crm/whiteLabelCrmTheme';

type Props = {
  children: ReactNode;
  /** Quando true, KPIs ficam recolhíveis no mobile (home). */
  collapsibleOnMobile?: boolean;
  theme: Pick<WhiteLabelCrmTheme, 'cardBg' | 'cardBorder' | 'textPrimary' | 'textMuted'>;
};

/**
 * Agrupa KPIs/filtros da home CRM atrás de “Detalhes” no mobile;
 * no desktop (`lg+`) permanece sempre expandido.
 */
export default function HomeKpisCollapsible({
  children,
  collapsibleOnMobile = false,
  theme: t,
}: Props) {
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
