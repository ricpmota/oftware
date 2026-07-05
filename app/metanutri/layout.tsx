import type { Metadata } from 'next';

const TITLE = 'MetaNutri | Área do nutricionista — Oftware';
const DESCRIPTION =
  'Planos alimentares, prontuário nutricional e vínculo com médicos e pacientes na plataforma Oftware.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
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
    title: TITLE,
    description: DESCRIPTION,
    images: ['/oftware3.png'],
  },
};

export default function MetaNutriLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
