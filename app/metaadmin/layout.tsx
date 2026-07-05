import type { Metadata } from 'next';

const TITLE = 'MetaAdmin | Área do médico — Oftware';
const DESCRIPTION =
  'Gestão de pacientes, prontuário, prescrições, aplicações e acompanhamento clínico na plataforma Oftware.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
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
    title: TITLE,
    description: DESCRIPTION,
    images: ['/oftware3.png'],
  },
};

export default function MetaAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
