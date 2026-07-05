import { headers } from 'next/headers';
import { isMetodoEmagrecerHost } from '@/lib/landing/appNavigation';
import { ORGANIZATION_METODO_FAVICON_SRC } from '@/lib/organization/organizationBrandingDefaults';
import { DEFAULT_SITE_FAVICON } from '@/lib/whiteLabel/applyWhiteLabelFavicon.client';
import { resolveHostFromHeaders } from '@/lib/tenant/resolveHostFromHeaders';

export default async function RootFaviconLinks() {
  const host = resolveHostFromHeaders(await headers());
  const favicon = isMetodoEmagrecerHost(host) ? ORGANIZATION_METODO_FAVICON_SRC : DEFAULT_SITE_FAVICON;

  return (
    <>
      <link rel="preload" as="image" href={favicon} />
      <link rel="icon" href={favicon} type="image/png" sizes="any" />
      <link rel="shortcut icon" href={favicon} type="image/png" />
      <link rel="apple-touch-icon" href={favicon} />
      <link rel="apple-touch-icon" sizes="152x152" href={favicon} />
      <link rel="apple-touch-icon" sizes="180x180" href={favicon} />
      <link rel="apple-touch-icon" sizes="167x167" href={favicon} />
    </>
  );
}
