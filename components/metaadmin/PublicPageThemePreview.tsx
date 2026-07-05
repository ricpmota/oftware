'use client';

import type { PublicPageKind } from '@/lib/whiteLabel/publicPagesTheme';
import {
  PUBLIC_PAGE_DEFAULT_BACKGROUNDS,
  PUBLIC_PAGE_DEFAULT_TEXT_COLORS,
  publicPageCustomLogoUrl,
  resolvePublicPageLogoPreviewSrc,
  type PublicPageThemeResolved,
} from '@/lib/whiteLabel/publicPagesTheme';
import { DEFAULT_WHITE_LABEL_PRIMARY_COLOR } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

type Props = {
  kind: PublicPageKind;
  theme: PublicPageThemeResolved;
  brandName: string;
  primaryColor?: string;
  showPoweredBy?: boolean;
};

export default function PublicPageThemePreview({
  kind,
  theme,
  brandName,
  primaryColor = DEFAULT_WHITE_LABEL_PRIMARY_COLOR,
  showPoweredBy = true,
}: Props) {
  const bg = theme.backgroundColor.trim() || PUBLIC_PAGE_DEFAULT_BACKGROUNDS[kind];
  const textColor = theme.textColor.trim() || PUBLIC_PAGE_DEFAULT_TEXT_COLORS[kind];
  const accent = primaryColor.trim() || DEFAULT_WHITE_LABEL_PRIMARY_COLOR;
  const customLogo = publicPageCustomLogoUrl(theme);
  const logoSrc = resolvePublicPageLogoPreviewSrc(theme);
  const isDr = kind === 'dr';
  const logoAtTop = !isDr && !!customLogo;
  const logoAtBottom = isDr && !!customLogo;

  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm min-h-[168px] flex flex-col"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {logoAtTop ? (
        <div className="px-4 pt-4 pb-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" className="h-7 w-auto max-w-[160px] object-contain object-left opacity-95" />
        </div>
      ) : null}

      <div className={`flex-1 px-4 ${logoAtTop ? 'pb-2' : 'pt-4 pb-2'}`}>
        {isDr ? (
          <div className="rounded-lg border border-current/10 bg-white/5 p-3 space-y-2">
            <div className="h-8 w-8 rounded-full bg-current/20" />
            <div className="h-2 w-3/4 rounded bg-current/15" />
            <div className="h-2 w-1/2 rounded bg-current/10" />
            <p className="text-[11px] opacity-75 pt-1">{brandName || 'Dr. Nome'}</p>
            <div
              className="mt-2 inline-block rounded-md px-2.5 py-1 text-[10px] font-semibold"
              style={{ backgroundColor: accent, color: '#0A1F44' }}
            >
              Botão
            </div>
          </div>
        ) : (
          <div
            className="rounded-lg border bg-white/95 p-3 space-y-2 shadow-sm text-gray-900"
            style={{ borderColor: `${accent}66` }}
          >
            <div className="flex gap-2 items-center">
              <div className="h-7 w-7 rounded-full shrink-0" style={{ backgroundColor: `${accent}33` }} />
              <div className="h-2 flex-1 rounded bg-gray-200" />
            </div>
            <div className="h-2 w-2/3 rounded bg-gray-100" />
            <div
              className="mt-1 h-6 w-20 rounded-md"
              style={{ backgroundColor: accent }}
            />
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex flex-col items-center gap-2">
        {logoAtBottom ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" className="h-6 w-auto max-w-[140px] object-contain opacity-85" />
        ) : null}
        {showPoweredBy ? (
          <p className="text-[10px] opacity-40">Powered by Oftware</p>
        ) : null}
      </div>
    </div>
  );
}
