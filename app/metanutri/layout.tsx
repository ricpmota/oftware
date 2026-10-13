import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isMetodoEmagrecerHost } from '@/lib/landing/appNavigation';
import { buildMetodoEmagrecerOperationalRouteMetadata } from '@/lib/organization/organizationSiteMetadata.server';
import { resolveHostFromHeaders } from '@/lib/tenant/resolveHostFromHeaders';
import './metanutri-shell.css';

const OFTWARE_METADATA: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'MetaNutri | Área do nutricionista — Oftware',
  description:
    'Planos alimentares, prontuário nutricional e vínculo com médicos e pacientes na plataforma Oftware.',
  openGraph: {
    title: 'MetaNutri | Área do nutricionista — Oftware',
    description:
      'Planos alimentares, prontuário nutricional e vínculo com médicos e pacientes na plataforma Oftware.',
    url: 'https://www.oftware.com.br/metanutri',
    siteName: 'Oftware',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/oftware3.png',
        width: 1200,
        height: 630,
        alt: 'Oftware — Plataforma de acompanhamento médico multidisciplinar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MetaNutri | Área do nutricionista — Oftware',
    description:
      'Planos alimentares, prontuário nutricional e vínculo com médicos e pacientes na plataforma Oftware.',
    images: ['/oftware3.png'],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = resolveHostFromHeaders(await headers());
  if (isMetodoEmagrecerHost(host)) {
    return buildMetodoEmagrecerOperationalRouteMetadata('metanutri');
  }
  return OFTWARE_METADATA;
}

export default function MetaNutriLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
