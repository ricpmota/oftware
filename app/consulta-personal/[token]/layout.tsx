import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildMetodoEmagrecerSiteMetadata } from '@/lib/organization/organizationSiteMetadata.server';

export async function generateMetadata(): Promise<Metadata> {
  const metadata = await buildMetodoEmagrecerSiteMetadata({
    titlePrefix: 'Agendar consulta com seu personal',
    description: 'Preencha sua anamnese de treino e escolha um horário com seu personal.',
  });
  return {
    ...metadata,
    robots: { index: false, follow: false },
  };
}

export default function ConsultaPersonalPublicLayout({ children }: { children: ReactNode }) {
  return children;
}
