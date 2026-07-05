'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  getWhiteLabelCrmTheme,
  type WhiteLabelCrmTheme,
  type WhiteLabelCrmThemeVariant,
} from '@/lib/crm/whiteLabelCrmTheme';

const MedicoLeadsCrmThemeContext = createContext<WhiteLabelCrmTheme | null>(null);

export function useMedicoLeadsCrmTheme(): WhiteLabelCrmTheme {
  const theme = useContext(MedicoLeadsCrmThemeContext);
  if (!theme) {
    throw new Error('useMedicoLeadsCrmTheme deve ser usado dentro de MedicoLeadsCrmProvider');
  }
  return theme;
}

export function MedicoLeadsCrmProvider({
  children,
  themeVariant = 'metaadmin-dark',
}: {
  children: ReactNode;
  themeVariant?: WhiteLabelCrmThemeVariant;
}) {
  const theme = useMemo(() => getWhiteLabelCrmTheme(themeVariant), [themeVariant]);
  return (
    <MedicoLeadsCrmThemeContext.Provider value={theme}>{children}</MedicoLeadsCrmThemeContext.Provider>
  );
}
