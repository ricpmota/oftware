import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: 'Central do Mentorado | Oftware',
  description:
    'Treinamentos, protocolos e atualizações oficiais para utilização do método e da plataforma Oftware.',
  robots: { index: false, follow: false },
};

export default function VideosMentoradosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
