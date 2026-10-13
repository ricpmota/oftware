import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildMetodoEmagrecerSiteMetadata } from '@/lib/organization/organizationSiteMetadata.server';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildMetodoEmagrecerSiteMetadata({
    titlePrefix: 'Agendar consulta nutricional',
    description: 'Preencha sua anamnese e escolha um horário com sua nutricionista.',
  });
  return {
    ...metadata,
    robots: { index: false, follow: false },
  };
}

export default function ConsultaNutriPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
