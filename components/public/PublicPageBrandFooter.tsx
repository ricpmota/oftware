'use client';

import PoweredByOftwareFooter from '@/components/public/PoweredByOftwareFooter';
import { publicPageCustomLogoUrl } from '@/lib/whiteLabel/publicPagesTheme';
import type { PublicPageThemeResolved } from '@/lib/whiteLabel/publicPagesTheme';

type Props = {
  theme: PublicPageThemeResolved | null | undefined;
  brandName?: string;
  showPoweredBy?: boolean;
  /** Meu Link: logo customizada no rodapé. Aplicação/Conclusão: omitir (logo só no topo). */
  showLogo?: boolean;
  className?: string;
  logoClassName?: string;
  poweredByClassName?: string;
};

export default function PublicPageBrandFooter({
  theme,
  brandName,
  showPoweredBy = true,
  showLogo = false,
  className = '',
  logoClassName = '',
  poweredByClassName = '',
}: Props) {
  const customLogo = publicPageCustomLogoUrl(theme);
  const alt = brandName?.trim() || 'Logo';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {showLogo && customLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={customLogo}
          alt={alt}
          className={`h-8 sm:h-9 w-auto max-w-[240px] object-contain opacity-90 ${logoClassName}`}
        />
      ) : null}
      <PoweredByOftwareFooter
        show={showPoweredBy}
        showBrandImage={false}
        className={poweredByClassName}
      />
    </div>
  );
}
