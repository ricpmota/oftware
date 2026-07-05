import type { Metadata } from 'next';

const OFTPAY_TITLE = 'OftPay — A Plataforma Inteligente de Aprendizado em Oftalmologia';
const OFTPAY_DESCRIPTION =
  'Vídeos, apostilas, simulados, questões comentadas e inteligência artificial para acelerar sua evolução em Oftalmologia.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: OFTPAY_TITLE,
  description: OFTPAY_DESCRIPTION,
  icons: {
    icon: [{ url: '/logo-icone.png', type: 'image/png' }],
    shortcut: '/logo-icone.png',
    apple: '/logo-icone.png',
  },
  openGraph: {
    title: OFTPAY_TITLE,
    description: OFTPAY_DESCRIPTION,
    url: 'https://www.oftware.com.br/oftpay',
    siteName: 'OftPay',
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: '/oftware3.png',
        width: 1200,
        height: 630,
        alt: 'OftPay — Plataforma inteligente de aprendizado em Oftalmologia',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OFTPAY_TITLE,
    description: OFTPAY_DESCRIPTION,
    images: ['/oftware3.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function OftpayLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
