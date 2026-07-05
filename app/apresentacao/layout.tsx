import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oftware White Label | Plataforma para mentoria médica',
  description:
    'Infraestrutura digital White Label para médicos e mentorias médicas. Acompanhamento diário, adesão ao tratamento e operação escalável.',
  openGraph: {
    title: 'Oftware White Label | Plataforma para mentoria médica',
    description:
      'Transforme sua mentoria médica em uma plataforma escalável de acompanhamento de pacientes.',
    url: 'https://www.oftware.com.br/apresentacao',
    siteName: 'Oftware',
    images: [{ url: '/og-mentoria.jpg', width: 1200, height: 630, alt: 'Oftware White Label' }],
    locale: 'pt_BR',
  },
};

export default function ApresentacaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
