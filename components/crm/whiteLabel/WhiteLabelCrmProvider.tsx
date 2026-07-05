'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  METAADMIN_GERAL_WHITELABEL_CRM_API,
  mergeWhiteLabelCrmApi,
  type WhiteLabelCrmApiConfig,
} from '@/lib/crm/whiteLabelCrmConfig';
import { whiteLabelCrmAuthFetch } from '@/lib/crm/whiteLabelCrmAuthFetch';
import {
  getWhiteLabelCrmTheme,
  type WhiteLabelCrmTheme,
  type WhiteLabelCrmThemeVariant,
} from '@/lib/crm/whiteLabelCrmTheme';

type WhiteLabelCrmContextValue = {
  theme: WhiteLabelCrmTheme;
  api: WhiteLabelCrmApiConfig;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
};

const WhiteLabelCrmContext = createContext<WhiteLabelCrmContextValue | null>(null);

export function useWhiteLabelCrmContext(): WhiteLabelCrmContextValue {
  const ctx = useContext(WhiteLabelCrmContext);
  if (!ctx) {
    throw new Error('useWhiteLabelCrmContext deve ser usado dentro de WhiteLabelCrmProvider');
  }
  return ctx;
}

export function useWhiteLabelCrmTheme(): WhiteLabelCrmTheme {
  return useWhiteLabelCrmContext().theme;
}

type ProviderProps = {
  children: ReactNode;
  themeVariant?: WhiteLabelCrmThemeVariant;
  apiConfig?: Partial<WhiteLabelCrmApiConfig>;
};

export function WhiteLabelCrmProvider({
  children,
  themeVariant = 'metaadmingeral-dark',
  apiConfig,
}: ProviderProps) {
  const value = useMemo<WhiteLabelCrmContextValue>(
    () => ({
      theme: getWhiteLabelCrmTheme(themeVariant),
      api: mergeWhiteLabelCrmApi(apiConfig),
      authFetch: whiteLabelCrmAuthFetch,
    }),
    [themeVariant, apiConfig]
  );

  return <WhiteLabelCrmContext.Provider value={value}>{children}</WhiteLabelCrmContext.Provider>;
}

export { METAADMIN_GERAL_WHITELABEL_CRM_API };
