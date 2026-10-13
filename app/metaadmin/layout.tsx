import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { isMetodoEmagrecerHost } from '@/lib/landing/appNavigation';
import { buildMetodoEmagrecerOperationalRouteMetadata } from '@/lib/organization/organizationSiteMetadata.server';
import { resolveHostFromHeaders } from '@/lib/tenant/resolveHostFromHeaders';
import './metaadmin-shell.css';

const OFTWARE_METADATA: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'MetaAdmin | Área do médico — Oftware',
  description:
    'Gestão de pacientes, prontuário, prescrições, aplicações e acompanhamento clínico na plataforma Oftware.',
  openGraph: {
    title: 'MetaAdmin | Área do médico — Oftware',
    description:
      'Gestão de pacientes, prontuário, prescrições, aplicações e acompanhamento clínico na plataforma Oftware.',
    url: 'https://www.oftware.com.br/metaadmin',
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
    title: 'MetaAdmin | Área do médico — Oftware',
    description:
      'Gestão de pacientes, prontuário, prescrições, aplicações e acompanhamento clínico na plataforma Oftware.',
    images: ['/oftware3.png'],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = resolveHostFromHeaders(await headers());
  if (isMetodoEmagrecerHost(host)) {
    return buildMetodoEmagrecerOperationalRouteMetadata('metaadmin');
  }
  return OFTWARE_METADATA;
}

export default function MetaAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
