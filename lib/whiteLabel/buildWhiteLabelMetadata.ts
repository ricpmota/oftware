import type { Metadata, Viewport } from 'next';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { DEFAULT_SITE_FAVICON } from '@/lib/whiteLabel/applyWhiteLabelFavicon.client';

export function buildWhiteLabelMetadata(
  resolved: MedicoWhiteLabelResolved,
  options?: { canonicalPath?: string }
): Metadata {
  const favicon = resolved.faviconUrl || DEFAULT_SITE_FAVICON;
  const faviconType = favicon.endsWith('.svg')
    ? 'image/svg+xml'
    : favicon.endsWith('.ico')
      ? 'image/x-icon'
      : 'image/png';

  const images = resolved.ogImageUrl
    ? [
        {
          url: resolved.ogImageUrl,
          width: 1200,
          height: 630,
          alt: resolved.brandName,
        },
      ]
    : undefined;

  return {
    title: resolved.brandName,
    description: resolved.description,
    applicationName: resolved.brandName,
    icons: {
      icon: [{ url: favicon, type: faviconType }],
      shortcut: favicon,
      apple: favicon,
    },
    openGraph: {
      title: resolved.brandName,
      description: resolved.description,
      siteName: resolved.brandName,
      locale: 'pt_BR',
      type: 'website',
      ...(options?.canonicalPath ? { url: options.canonicalPath } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: resolved.brandName,
      description: resolved.description,
      ...(resolved.ogImageUrl ? { images: [resolved.ogImageUrl] } : {}),
    },
    ...(options?.canonicalPath
      ? {
          alternates: {
            canonical: options.canonicalPath,
          },
        }
      : {}),
  };
}

export function buildWhiteLabelViewport(resolved: MedicoWhiteLabelResolved): Viewport {
  return {
    themeColor: resolved.primaryColor,
  };
}
