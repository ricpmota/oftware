'use client';

import { useEffect } from 'react';
import { applyWhiteLabelFavicon } from '@/lib/whiteLabel/applyWhiteLabelFavicon.client';

type Props = {
  faviconUrl?: string | null;
  cacheKey?: string | number;
};

export default function WhiteLabelFaviconEffect({ faviconUrl, cacheKey }: Props) {
  useEffect(() => {
    applyWhiteLabelFavicon(faviconUrl, cacheKey);
  }, [faviconUrl, cacheKey]);

  return null;
}
