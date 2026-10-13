import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { Fraunces, Manrope } from 'next/font/google';
import { loadKamillaInstitutionalContent } from '@/lib/kamilla-montenegro/loadInstitutionalContent.server';
import { isKamillaSiteHost } from '@/lib/kamilla-montenegro/siteHosts';
import { resolveHostFromHeaders } from '@/lib/tenant/resolveHostFromHeaders';

const display = Fraunces({
  subsets: ['latin'],
  variable: '--font-kamilla-display',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-kamilla-sans',
  display: 'swap',
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await loadKamillaInstitutionalContent();
  const description = content.description ?? content.publicName;
  const host = resolveHostFromHeaders(await headers());
  const onKamillaDomain = isKamillaSiteHost(host);
  const siteUrl = onKamillaDomain ? `https://${host}` : 'https://www.oftware.com.br';
  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: content.publicName },
    description,
    alternates: { canonical: onKamillaDomain ? '/' : '/kamillamontenegro' },
    robots: onKamillaDomain ? { index: true, follow: true } : { index: false, follow: false },
    icons: content.faviconUrl
      ? { icon: [{ url: content.faviconUrl }], apple: content.faviconUrl }
      : undefined,
  };
}

export default function KamillaMontenegroLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${sans.className} ${sans.variable} ${display.variable} antialiased`}>
      {children}
    </div>
  );
}
