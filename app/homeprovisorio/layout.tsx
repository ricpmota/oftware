import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Fraunces, Manrope } from 'next/font/google';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-homeprov-display',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-homeprov-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Método Emagrecer | Acompanhamento estruturado (provisório)',
  description:
    'Acompanhamento médico estruturado com equipe multidisciplinar integrada — Método Emagrecer.',
  robots: { index: false, follow: false },
};

export default function HomeProvisorioLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`homeprov-v2 ${display.variable} ${sans.variable}`}>{children}</div>
  );
}
