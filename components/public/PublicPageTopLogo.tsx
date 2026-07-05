'use client';

import { publicPageCustomLogoUrl } from '@/lib/whiteLabel/publicPagesTheme';
import type { PublicPageThemeResolved } from '@/lib/whiteLabel/publicPagesTheme';

type Props = {
  theme: PublicPageThemeResolved | null | undefined;
  brandName?: string;
  className?: string;
  priority?: boolean;
};

export default function PublicPageTopLogo({ theme, brandName, className = '', priority }: Props) {
  const src = publicPageCustomLogoUrl(theme);
  if (!src) return null;

  const alt = brandName?.trim() || 'Logo';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`h-10 sm:h-12 w-auto max-w-[85vw] sm:max-w-[280px] object-contain object-left ${className}`}
      fetchPriority={priority ? 'high' : undefined}
    />
  );
}
