import type { Metadata } from 'next';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import {
  ORGANIZATION_METODO_FAVICON_SRC,
  ORGANIZATION_METODO_OG_FALLBACK_SRC,
} from '@/lib/organization/organizationBrandingDefaults';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';

/** Metadados Open Graph / Twitter para www.ometodoemagrecer.com.br (dual read org branding). */
export async function buildMetodoEmagrecerSiteMetadata(
  overrides?: Partial<Pick<Metadata, 'title' | 'description'>>,
): Promise<Metadata> {
  const branding = await getOrganizationBranding(METODO_ORGANIZATION_ID);
  const ogImage = branding.ogImageUrl?.trim() || ORGANIZATION_METODO_OG_FALLBACK_SRC;
  const siteUrl = branding.siteUrl?.trim() || 'https://www.ometodoemagrecer.com.br';
  const title =
    (typeof overrides?.title === 'string' ? overrides.title : null) ||
    `${branding.publicName} | Acompanhamento estruturado com continuidade`;
  const description =
    (typeof overrides?.description === 'string' ? overrides.description : null) ||
    branding.defaultDescription;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    applicationName: branding.publicName,
    icons: {
      icon: [{ url: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC, type: 'image/png' }],
      shortcut: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
      apple: branding.faviconUrl?.trim() || ORGANIZATION_METODO_FAVICON_SRC,
    },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: branding.publicName,
      locale: 'pt_BR',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: branding.publicName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}
