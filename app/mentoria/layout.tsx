import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Mentoria para Médicos | Método Emagrecer – Fature online com medicina',
  description:
    'Você não precisa de consultório para faturar alto. Modelo digital escalável, acompanhamento online e liberdade geográfica. Mentoria para médicos.',
  openGraph: {
    title: 'Mentoria para Médicos | Método Emagrecer',
    description:
      'Fature online com medicina. Modelo digital 100% aplicável online. Liberdade geográfica e renda previsível.',
    url: 'https://www.oftware.com.br/mentoria',
    siteName: 'Oftware',
    locale: 'pt_BR',
    images: [
      { url: '/og-mentoria.jpg', width: 1200, height: 630, alt: 'Método Emagrecer - Mentoria para Médicos' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mentoria para Médicos | Método Emagrecer',
    description:
      'Fature online com medicina. Modelo digital escalável sem consultório físico.',
    images: ['/og-mentoria.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function MentoriaLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
