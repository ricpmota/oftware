import type { Metadata } from 'next';
import { buildMetodoEmagrecerSiteMetadata } from '@/lib/organization/organizationSiteMetadata.server';

export async function generateMetadata(): Promise<Metadata> {
  return buildMetodoEmagrecerSiteMetadata({
    title: 'Método Emagrecer | Acompanhamento estruturado com continuidade',
    description:
      'Conheça o Método Emagrecer: acompanhamento médico estruturado com pilares conectados — médico, paciente, nutrição e treino.',
  });
}

export default function MetodoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
