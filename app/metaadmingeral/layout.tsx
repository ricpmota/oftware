import type { Metadata } from 'next';
import { META_ADMIN_GERAL_BRANDING } from '@/lib/metaadmin/metaAdminGeralBranding';

const TITLE = `${META_ADMIN_GERAL_BRANDING.panelTitle} | ${META_ADMIN_GERAL_BRANDING.productName}`;
const DESCRIPTION = META_ADMIN_GERAL_BRANDING.panelDescription;

export const metadata: Metadata = {
  metadataBase: new URL('https://www.oftware.com.br'),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: META_ADMIN_GERAL_BRANDING.productName,
  icons: {
    icon: [{ url: META_ADMIN_GERAL_BRANDING.favicon, type: 'image/png' }],
    shortcut: META_ADMIN_GERAL_BRANDING.favicon,
    apple: META_ADMIN_GERAL_BRANDING.favicon,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://www.oftware.com.br/metaadmingeral',
    siteName: META_ADMIN_GERAL_BRANDING.productName,
    locale: 'pt_BR',
    type: 'website',
    images: [
      {
        url: META_ADMIN_GERAL_BRANDING.favicon,
        width: 1200,
        height: 630,
        alt: 'Oftware — Administração da Plataforma',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [META_ADMIN_GERAL_BRANDING.favicon],
  },
};

export default function MetaAdminGeralLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
