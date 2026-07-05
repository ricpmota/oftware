import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Mentoria White Label Oftware',
  description:
    'Descubra se você tem perfil para transformar sua experiência médica em uma operação digital escalável com sua própria marca.',
  icons: {
    icon: [{ url: '/logo-icone.png', type: 'image/png' }],
    shortcut: '/logo-icone.png',
    apple: '/logo-icone.png',
  },
  openGraph: {
    title: 'Mentoria White Label Oftware',
    description:
      'Descubra se você tem perfil para transformar sua experiência médica em uma operação digital escalável com sua própria marca.',
    url: 'https://www.oftware.com.br/whitelabel',
    siteName: 'Oftware',
    locale: 'pt_BR',
    images: [{ url: '/og-mentoria.jpg', width: 1200, height: 630, alt: 'Oftware White Label' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mentoria White Label Oftware',
    description:
      'Descubra se você tem perfil para transformar sua experiência médica em uma operação digital escalável com sua própria marca.',
    images: ['/og-mentoria.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function WhiteLabelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
