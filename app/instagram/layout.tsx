import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Oftware | Escolha seu perfil',
  description:
    'Hub oficial da Oftware: escolha seu perfil — médico, nutricionista, personal ou paciente — e descubra como transformar sua jornada de acompanhamento digital.',
  icons: {
    icon: [{ url: '/logo-icone.png', type: 'image/png' }],
    shortcut: '/logo-icone.png',
    apple: '/logo-icone.png',
  },
  openGraph: {
    title: 'Oftware | Escolha seu perfil',
    description:
      'Conecte-se ao ecossistema Oftware: plataforma para médicos, nutricionistas, personal trainers e pacientes.',
    url: 'https://www.oftware.com.br/instagram',
    siteName: 'Oftware',
    locale: 'pt_BR',
    images: [{ url: '/og-mentoria.jpg', width: 1200, height: 630, alt: 'Oftware' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oftware | Escolha seu perfil',
    description:
      'Conecte-se ao ecossistema Oftware: plataforma para médicos, nutricionistas, personal trainers e pacientes.',
    images: ['/og-mentoria.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function InstagramLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
