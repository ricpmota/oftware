import type { Metadata } from 'next';

const TITLE = 'Cadastro de Implantação — White Label Oftware';
const DESCRIPTION =
  'Complete seu cadastro para iniciarmos a implantação da sua marca: domínio, site, personalização, contrato e materiais. Exclusivo para mentorados Oftware.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: TITLE,
  description: DESCRIPTION,
  icons: {
    icon: [{ url: '/oftware3.png', type: 'image/png' }],
    shortcut: '/oftware3.png',
    apple: '/oftware3.png',
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.oftware.com.br/whitelabel/cadastromedico',
    siteName: 'Oftware',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/oftware3.png',
        width: 1200,
        height: 630,
        alt: 'Oftware — Cadastro de implantação White Label',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/oftware3.png'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function CadastroMedicoWhiteLabelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
