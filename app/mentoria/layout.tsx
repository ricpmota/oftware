import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Mentoria Médica | Oftware — Construa sua operação digital de acompanhamento',
  description:
    'Mentoria para médicos sobre a infraestrutura Oftware: modelo digital escalável, acompanhamento online, captação e previsibilidade de receita — sem depender só do consultório.',
  openGraph: {
    title: 'Mentoria Médica | Oftware',
    description:
      'Aprenda a monetizar medicina com a infraestrutura White Label da Oftware. Modelo digital, acompanhamento estruturado e liberdade geográfica.',
    url: 'https://www.oftware.com.br/mentoria',
    siteName: 'Oftware',
    locale: 'pt_BR',
    images: [
      {
        url: '/og-mentoria.jpg',
        width: 1200,
        height: 630,
        alt: 'Oftware — Mentoria Médica para operação digital',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mentoria Médica | Oftware',
    description:
      'Construa sua operação de acompanhamento médico digital sobre a infraestrutura Oftware.',
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
