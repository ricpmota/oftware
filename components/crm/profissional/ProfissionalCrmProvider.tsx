'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  getWhiteLabelCrmTheme,
  type WhiteLabelCrmTheme,
  type WhiteLabelCrmThemeVariant,
} from '@/lib/crm/whiteLabelCrmTheme';
import type { LeadProfissionalRole } from '@/types/leadProfissional';

type ProfissionalCrmContextValue = {
  theme: WhiteLabelCrmTheme;
  role: LeadProfissionalRole;
};

const ProfissionalCrmContext = createContext<ProfissionalCrmContextValue | null>(null);

export function useProfissionalCrmTheme(): WhiteLabelCrmTheme {
  const ctx = useContext(ProfissionalCrmContext);
  if (!ctx) {
    throw new Error('useProfissionalCrmTheme deve ser usado dentro de ProfissionalCrmProvider');
  }
  return ctx.theme;
}

export function useProfissionalCrmRole(): LeadProfissionalRole {
  const ctx = useContext(ProfissionalCrmContext);
  if (!ctx) {
    throw new Error('useProfissionalCrmRole deve ser usado dentro de ProfissionalCrmProvider');
  }
  return ctx.role;
}

export function ProfissionalCrmProvider({
  children,
  role,
  themeVariant = 'metaadmin-light',
}: {
  children: ReactNode;
  role: LeadProfissionalRole;
  themeVariant?: WhiteLabelCrmThemeVariant;
}) {
  const theme = useMemo(() => getWhiteLabelCrmTheme(themeVariant), [themeVariant]);
  const value = useMemo(() => ({ theme, role }), [theme, role]);
  return (
    <ProfissionalCrmContext.Provider value={value}>{children}</ProfissionalCrmContext.Provider>
  );
}
