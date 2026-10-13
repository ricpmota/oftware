import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { absolute: 'Relatório do médico' },
  description: 'Estatísticas e evolução financeira do médico.',
  robots: { index: false, follow: false },
};

export default function RelatorioMedicoLayout({ children }: { children: ReactNode }) {
  return children;
}
