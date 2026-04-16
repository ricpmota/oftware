import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import RafaelaViewportConsoleDebug from '@/components/rafaela-albuquerque/RafaelaViewportConsoleDebug';

/** Evita sensação de “site desktop” no celular (layout raiz fixa maximumScale=1). */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

const title = 'Rafaela Albuquerque | Direito Previdenciário, Família e Sucessões';
const description =
  'Atuação em Direito Previdenciário, Direito de Família e Sucessões. Atendimento humanizado, estratégico e focado em organizar soluções com segurança jurídica.';

function rafaelaHosts(): Set<string> {
  const raw = process.env.RAFAELA_SITE_HOSTS?.trim();
  if (raw) {
    return new Set(
      raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
  }
  return new Set(['www.rafaelaalbuquerque.com', 'rafaelaalbuquerque.com']);
}

function hostFromHeaders(h: Headers): string {
  const xf = h.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = xf || h.get('host') || '';
  return host.split(':')[0].toLowerCase();
}

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = hostFromHeaders(h);
  const onRafaelaDomain = rafaelaHosts().has(host);
  const siteUrl = onRafaelaDomain ? `https://${host}` : 'https://www.oftware.com.br';
  const canonicalPath = onRafaelaDomain ? '/' : '/rafaelaalbuquerque';

  return {
    title,
    description,
    keywords: [
      'advogado previdenciário',
      'direito de família',
      'inventário',
      'sucessões',
      'pensão por morte',
      'aposentadoria',
      'guarda',
      'divórcio',
      'partilha de bens',
      'Rafaela Albuquerque',
    ],
    metadataBase: new URL(siteUrl),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'pt_BR',
      url: `${siteUrl}${canonicalPath}`,
      siteName: 'Rafaela Albuquerque',
      images: [
        {
          url: '/rafaela-albuquerque/logonova.png',
          alt: 'Rafaela Albuquerque — Advocacia',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/rafaela-albuquerque/logonova.png'],
    },
    alternates: {
      canonical: canonicalPath,
    },
  };
}

export default function RafaelaAlbuquerqueLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RafaelaViewportConsoleDebug />
      {children}
    </>
  );
}
