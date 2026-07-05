import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plano Terapêutico Personalizado',
  description:
    'Proposta interativa para acompanhar sua meta com segurança, clareza e previsibilidade.',
};

export default function PlanoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
