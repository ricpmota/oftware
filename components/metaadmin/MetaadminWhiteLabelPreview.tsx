'use client';

import { DEFAULT_SITE_FAVICON } from '@/lib/whiteLabel/applyWhiteLabelFavicon.client';

type Props = {
  browserTitle: string;
  linkTitle: string;
  linkDescription: string;
  linkImageUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
};

export default function MetaadminWhiteLabelPreview({
  browserTitle,
  linkTitle,
  linkDescription,
  linkImageUrl,
  faviconUrl,
  primaryColor,
}: Props) {
  const faviconPreview = faviconUrl || DEFAULT_SITE_FAVICON;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/40 p-5 space-y-5">
      <div>
        <h4 className="text-sm font-bold text-gray-900 dark:text-white">Pré-visualização da marca</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Veja como sua marca aparece na aba do navegador e nos links compartilhados.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Aba do navegador
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-700">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={faviconPreview} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
            <p className="text-xs text-gray-700 dark:text-gray-200 truncate">{browserTitle}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Preview WhatsApp
        </p>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm max-w-md">
          {linkImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={linkImageUrl}
              alt=""
              className="w-full aspect-[1200/630] object-cover bg-gray-100 dark:bg-gray-900"
            />
          ) : (
            <div
              className="w-full aspect-[1200/630] flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: primaryColor }}
              aria-hidden
            >
              {linkTitle.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="p-3 space-y-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{linkTitle}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{linkDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
