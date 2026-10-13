import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isMetodoEmagrecerHost } from '@/lib/landing/appNavigation';
import { buildMetodoEmagrecerOperationalRouteMetadata } from '@/lib/organization/organizationSiteMetadata.server';
import { resolveHostFromHeaders } from '@/lib/tenant/resolveHostFromHeaders';

const OFTWARE_METADATA: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Meta | Área do paciente — Oftware',
  description:
    'Acompanhe seu tratamento, evolução, aplicações e comunicação com sua equipe multidisciplinar na plataforma Oftware.',
  openGraph: {
    title: 'Meta | Área do paciente — Oftware',
    description:
      'Acompanhe seu tratamento, evolução, aplicações e comunicação com sua equipe multidisciplinar na plataforma Oftware.',
    url: 'https://www.oftware.com.br/meta',
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
    title: 'Meta | Área do paciente — Oftware',
    description:
      'Acompanhe seu tratamento, evolução, aplicações e comunicação com sua equipe multidisciplinar na plataforma Oftware.',
    images: ['/oftware3.png'],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = resolveHostFromHeaders(await headers());
  if (isMetodoEmagrecerHost(host)) {
    return buildMetodoEmagrecerOperationalRouteMetadata('meta');
  }
  return OFTWARE_METADATA;
}

export default function MetaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
