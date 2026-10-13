import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildMetodoEmagrecerSiteMetadata } from '@/lib/organization/organizationSiteMetadata.server';

const CHECKIN_NUTRI_SHARE_DESCRIPTION =
  'Conte como foi sua alimentação nesta semana. Suas respostas ajudam sua nutricionista a acompanhar sua evolução e ajustar seu plano alimentar.';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildMetodoEmagrecerSiteMetadata({
    titlePrefix: 'Check-in Semanal da Alimentação',
    description: CHECKIN_NUTRI_SHARE_DESCRIPTION,
  });
  return {
    ...metadata,
    robots: { index: false, follow: false },
  };
}

export default function CheckInNutriPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
